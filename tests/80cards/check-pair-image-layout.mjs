// 80CARDS 相性ペア画像（80cards/share-image.js の generatePair / renderPair）の配置検査（ブラウザ実描画）
//
// 使い方: node check-pair-image-layout.mjs
//   ・npm test には含めない（Playwright の Chromium と、Google Fonts への接続が必要なため）。share-image.js のペア画像を直したら手元で実行する
//   ・16タイプ × 16タイプ = 256通り × 2形式（9:16・1:1）を実フォントで描き、各要素の外接枠で次を検査する
//       1. はみ出し: 左右の余白 50px 未満（キャラは 20px）・上下の端・9:16 の上端安全域（269px）に入っていない
//       2. 重なり: 要素どうしが 10px 未満まで近づいていない（見出し・点数・ラベル・2人のキャラと「×」・2人の80CODE・2人のあだ名・呼びかけ）
//       3. 縮みすぎ: 点数・ラベル・80CODE・あだ名が、決めた最小の大きさを下回っていない
//       4. 9:16 で、呼びかけ以外の要素が下端の目安（y=1536）を越えていない
//   ・80CODE の行動類型の2文字（AC・HM・EF・SH・IN）は、1通りごとに左右へ違う組み合わせを当てて、5通りずつ描く（幅の違いを含めるため）
//   ・点数・ラベルは、画面と同じ getCompatibility()（app.js から抽出）の値
//   ・ローカルの静的サーバー（127.0.0.1）だけを使う。GA4・Meta は読み込まない。本番には何も送らない
import { chromium } from 'playwright';
import { loadDiagnosisLogic } from './extract-logic.mjs';
import { startHarness } from './pair-harness.mjs';

const SIDE = 50;       // 左右の最小余白（キャラは 20）
const GAP = 10;        // 要素どうしの最小すき間
const STORY_SAFE_BOTTOM = 1536;
const MIN = {
  story: { score: 240, label: 84, code: 100, nick: 48 },
  square: { score: 160, label: 60, code: 80, nick: 44 },
};
const PREFIXES = ['AC', 'HM', 'EF', 'SH', 'IN'];
const TYPE_CODES = ['PP', 'PA', 'PI', 'PD', 'AP', 'AA', 'AI', 'AD', 'IP', 'IA', 'II', 'ID', 'DP', 'DA', 'DI', 'DD'];

const { getCompatibility, TYPE_NICKNAMES, COMPATIBILITY_LABELS } = loadDiagnosisLogic();

const jobs = [];
for (const a of TYPE_CODES) {
  for (const b of TYPE_CODES) {
    const c = getCompatibility(a, b);
    for (let k = 0; k < PREFIXES.length; k++) {
      jobs.push({
        a: { behaviorPrefix: PREFIXES[k], typeCode: a, nickname: TYPE_NICKNAMES[a] },
        b: { behaviorPrefix: PREFIXES[(k + 2) % PREFIXES.length], typeCode: b, nickname: TYPE_NICKNAMES[b] },
        score: c.score,
        label: c.label,
      });
    }
  }
}

const harness = await startHarness(4180);
const browser = await chromium.launch();
let rows;
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(harness.url);
  const allText = Object.values(TYPE_NICKNAMES).join('') + COMPATIBILITY_LABELS.map((l) => l.label).join('') + '2人の相性%×あなたの80CODEは？0123456789ACDEFHIMNPS';
  const fontStatus = await page.evaluate((txt) => window.PF80ShareImage._internal.ensureFonts(txt), allText);
  if (fontStatus !== 'ok') {
    console.error(`FAIL: フォントを読み込めませんでした（${fontStatus}）。Google Fonts に接続できる環境で実行してください`);
    process.exitCode = 1;
  } else {
    rows = await page.evaluate(async (list) => {
      const api = window.PF80ShareImage;
      const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
      const imgs = {};
      const out = [];
      for (const j of list) {
        for (const t of [j.a.typeCode, j.b.typeCode]) {
          if (!(t in imgs)) {
            imgs[t] = await load('/80cards/share-image/' + t.toLowerCase() + '.webp');
            if (!imgs[t]) throw new Error('キャラ縮小画像を読み込めません: ' + t);
          }
        }
        const side = (o) => ({ code80: o.behaviorPrefix + o.typeCode, typeCode: o.typeCode, nickname: o.nickname, group: o.typeCode[0] });
        const tt = { a: side(j.a), b: side(j.b), score: j.score, label: j.label };
        for (const fmt of ['story', 'square']) {
          const rec = {};
          api._internal.renderPair(imgs[j.a.typeCode], imgs[j.b.typeCode], tt, fmt, rec);
          out.push({ id: `${tt.a.code80}x${tt.b.code80}/${fmt}`, pair: `${j.a.typeCode}x${j.b.typeCode}`, label: j.label, fmt, boxes: rec.boxes, info: rec.info });
        }
      }
      return out;
    }, jobs);
  }
} finally {
  await browser.close();
  harness.close();
}
if (!rows) process.exit(1);

const issues = [];
const stat = { story: { score: {}, label: {}, code: {}, nick: {}, bottom: 0 }, square: { score: {}, label: {}, code: {}, nick: {}, bottom: 0 } };
const labels = new Set();
const pairs = new Set();
for (const r of rows) {
  const W = 1080;
  const H = r.fmt === 'story' ? 1920 : 1080;
  const b = r.boxes;
  const i = r.info;
  labels.add(r.label);
  pairs.add(r.pair);
  const names = Object.keys(b).filter((n) => b[n]);
  for (const n of names) {
    const x = b[n];
    const side = /^char/.test(n) ? 20 : SIDE;
    if (x.x0 < side || x.x1 > W - side) issues.push(`${r.id}: ${n} が左右の余白（${side}px）を越えています`);
    if (x.y0 < 0 || x.y1 > H - 20) issues.push(`${r.id}: ${n} が上下の端にはみ出しています`);
    if (r.fmt === 'story' && !/^char/.test(n) && x.y0 < 269) issues.push(`${r.id}: ${n} が9:16の上端安全域（269px）に入っています`);
    if (r.fmt === 'story' && n !== 'cta' && x.y1 > STORY_SAFE_BOTTOM) issues.push(`${r.id}: ${n} が9:16の下端の目安（y=${STORY_SAFE_BOTTOM}）を越えています（${Math.round(x.y1)}）`);
  }
  for (let a = 0; a < names.length; a++) {
    for (let c = a + 1; c < names.length; c++) {
      const p = b[names[a]];
      const q = b[names[c]];
      if (p.x0 < q.x1 + GAP && q.x0 < p.x1 + GAP && p.y0 < q.y1 + GAP && q.y0 < p.y1 + GAP) issues.push(`${r.id}: ${names[a]} と ${names[c]} が ${GAP}px 未満まで近づいています`);
    }
  }
  const m = MIN[r.fmt];
  if (i.scorePx < m.score) issues.push(`${r.id}: 点数が最小（${m.score}px）未満 ${i.scorePx}px`);
  if (i.labelPx < m.label) issues.push(`${r.id}: ラベルが最小（${m.label}px）未満 ${i.labelPx}px`);
  if (i.codePx < m.code) issues.push(`${r.id}: 80CODEが最小（${m.code}px）未満 ${i.codePx}px`);
  if (i.nickPx < m.nick) issues.push(`${r.id}: あだ名が最小（${m.nick}px）未満 ${i.nickPx}px`);
  const s = stat[r.fmt];
  for (const [k, v] of [['score', i.scorePx], ['label', i.labelPx], ['code', i.codePx], ['nick', i.nickPx]]) s[k][v] = (s[k][v] || 0) + 1;
  s.bottom = Math.max(s.bottom, ...names.filter((n) => n !== 'cta').map((n) => b[n].y1));
}

if (pairs.size !== 256) issues.push(`組み合わせが256通りではありません: ${pairs.size}`);
if (rows.length !== jobs.length * 2) issues.push(`描画した枚数が ${jobs.length * 2} ではありません: ${rows.length}`);
if (labels.size !== COMPATIBILITY_LABELS.length) issues.push(`相性ラベルが${COMPATIBILITY_LABELS.length}種そろっていません: ${[...labels].join('・')}`);
if (issues.length) {
  console.error(`FAIL: ${issues.length}件`);
  issues.slice(0, 60).forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
const dist = (o) => Object.keys(o).sort((x, y) => x - y).map((k) => `${k}:${o[k]}`).join(' ');
console.log(`PASS: ${pairs.size}通り × 2形式（行動類型の組み合わせ ${PREFIXES.length}通りずつ、計 ${rows.length}枚）で、はみ出し・重なり・縮みすぎ 0件。ラベル ${labels.size}種`);
for (const f of ['story', 'square']) {
  const s = stat[f];
  console.log(`  ${f}: 点数(px:枚数) ${dist(s.score)} / ラベル ${dist(s.label)} / 80CODE ${dist(s.code)} / あだ名 ${dist(s.nick)} / 呼びかけ以外の最下端 ${Math.round(s.bottom)}px`);
}
