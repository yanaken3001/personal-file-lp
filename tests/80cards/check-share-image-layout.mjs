// 80CARDS 結果画像（80cards/share-image.js）の配置検査（ブラウザ実描画）
//
// 使い方: node check-share-image-layout.mjs
//   ・npm test には含めない（Playwright の Chromium と、Google Fonts への接続が必要なため）。share-image.js を直したら手元で実行する
//   ・全80タイプ × 9:16・1:1 = 160枚を実フォントで描き、各要素の外接枠を使って次を検査する
//       1. はみ出し: 左右の余白 50px 未満・上下の端・9:16 の上端安全域（269px）に入っていない
//       2. 重なり: 要素どうしが 10px 未満まで近づいていない（80CODE・レア度の星と名前・キャラ・行動類型・あだ名・一言・呼びかけ）
//       3. 縮みすぎ: 一言・あだ名・80CODE・レア度の名前と星が、決めた最小の大きさを下回っていない
//       4. 一言の最終行が2文字以下になっていない
//   ・ローカルの静的サーバー（127.0.0.1）だけを使う。GA4・Meta は読み込まない。本番には何も送らない
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadDiagnosisLogic } from './extract-logic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = 4178;

const SIDE = 50;   // 左右の最小余白（キャラは 20）
const GAP = 10;    // 要素どうしの最小すき間
const MIN = {
  story: { summary: 60, nickname: 72, code: 120, rarityLabel: 70, starR: 36 },
  square: { summary: 50, nickname: 56, code: 110, rarityLabel: 66, starR: 32 },
};

const { TYPES_80, TYPE_NICKNAMES, BEHAVIOR_CODE_PREFIX, getRarity } = loadDiagnosisLogic();
const types = Object.values(TYPES_80).map((t) => {
  const r = getRarity(t.personalityCode);
  return {
    behaviorName: t.behavioralType,
    behaviorPrefix: BEHAVIOR_CODE_PREFIX[t.behavioralType],
    typeCode: t.personalityCode,
    nickname: TYPE_NICKNAMES[t.personalityCode],
    summary: t.summary,
    rarityTier: r.tier,
    rarityLabel: r.label,
  };
});

const HARNESS = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Noto+Sans+JP:wght@500;700;900&display=swap" rel="stylesheet">
<script src="/80cards/share-image.js"></script></head><body></body></html>`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__harness.html') { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(HARNESS); return; }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(b);
  });
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch();
let rows;
let fontStatus;
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/__harness.html`);
  const allText = types.map((t) => t.nickname + t.summary + t.behaviorName + t.rarityLabel).join('') + 'MY 80CODE あなたの80CODEは？0123456789ACDEFHIMNPS';
  fontStatus = await page.evaluate((txt) => window.PF80ShareImage._internal.ensureFonts(txt), allText);
  if (fontStatus !== 'ok') {
    console.error(`FAIL: フォントを読み込めませんでした（${fontStatus}）。Google Fonts に接続できる環境で実行してください`);
    process.exitCode = 1;
  } else {
    rows = await page.evaluate(async (list) => {
      const api = window.PF80ShareImage;
      const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
      const imgs = {};
      const out = [];
      for (const t of list) {
        if (!(t.typeCode in imgs)) imgs[t.typeCode] = await load('/80cards/share-image/' + t.typeCode.toLowerCase() + '.webp');
        if (!imgs[t.typeCode]) throw new Error('キャラ縮小画像を読み込めません: ' + t.typeCode);
        const code80 = t.behaviorPrefix + t.typeCode;
        const tt = { code80, behaviorName: t.behaviorName, typeCode: t.typeCode, nickname: t.nickname, summary: t.summary, group: t.typeCode[0], rarityTier: t.rarityTier, rarityLabel: t.rarityLabel };
        for (const fmt of ['story', 'square']) {
          const rec = {};
          api._internal.renderResult(imgs[t.typeCode], tt, fmt, rec);
          out.push({ code80, fmt, boxes: rec.boxes, info: rec.info });
        }
      }
      return out;
    }, types);
  }
} finally {
  await browser.close();
  server.close();
}
if (!rows) process.exit(1);

const issues = [];
const stat = { story: { px: {}, lines: {}, nick: {}, bottom: 0 }, square: { px: {}, lines: {}, nick: {}, bottom: 0 } };
for (const r of rows) {
  const W = 1080;
  const H = r.fmt === 'story' ? 1920 : 1080;
  const id = `${r.code80}/${r.fmt}`;
  const b = r.boxes;
  const i = r.info;
  const names = Object.keys(b).filter((n) => b[n]);
  for (const n of names) {
    const x = b[n];
    const side = n === 'char' ? 20 : SIDE;
    if (x.x0 < side || x.x1 > W - side) issues.push(`${id}: ${n} が左右の余白（${side}px）を越えています`);
    if (x.y0 < 0 || x.y1 > H - 20) issues.push(`${id}: ${n} が上下の端にはみ出しています`);
    if (r.fmt === 'story' && n !== 'char' && x.y0 < 269) issues.push(`${id}: ${n} が9:16の上端安全域（269px）に入っています`);
  }
  for (let a = 0; a < names.length; a++) {
    for (let c = a + 1; c < names.length; c++) {
      const p = b[names[a]];
      const q = b[names[c]];
      if (p.x0 < q.x1 + GAP && q.x0 < p.x1 + GAP && p.y0 < q.y1 + GAP && q.y0 < p.y1 + GAP) issues.push(`${id}: ${names[a]} と ${names[c]} が ${GAP}px 未満まで近づいています`);
    }
  }
  const m = MIN[r.fmt];
  if (i.summaryPx < m.summary) issues.push(`${id}: 一言が最小（${m.summary}px）未満 ${i.summaryPx}px`);
  if (i.nickPx < m.nickname) issues.push(`${id}: あだ名が最小（${m.nickname}px）未満 ${i.nickPx}px`);
  if (i.codePx < m.code) issues.push(`${id}: 80CODEが最小（${m.code}px）未満 ${i.codePx}px`);
  if (i.rarityLabelPx < m.rarityLabel) issues.push(`${id}: レア度の名前が最小（${m.rarityLabel}px）未満 ${i.rarityLabelPx}px`);
  if (i.rarityStarR < m.starR) issues.push(`${id}: レア度の星が最小（半径${m.starR}px）未満 ${i.rarityStarR}px`);
  const last = i.summaryLineTexts[i.summaryLineTexts.length - 1];
  if (i.summaryLines > 1 && Array.from(last).length <= 2) issues.push(`${id}: 一言の最終行が2文字以下 "${last}"`);
  const s = stat[r.fmt];
  s.px[i.summaryPx] = (s.px[i.summaryPx] || 0) + 1;
  s.lines[i.summaryLines] = (s.lines[i.summaryLines] || 0) + 1;
  s.nick[i.nickPx] = (s.nick[i.nickPx] || 0) + 1;
  s.bottom = Math.max(s.bottom, b.summary.y1);
}

if (rows.length !== 160) issues.push(`描画した枚数が160ではありません: ${rows.length}`);
if (issues.length) {
  console.error(`FAIL: ${issues.length}件`);
  issues.slice(0, 60).forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
const dist = (o) => Object.keys(o).sort((x, y) => x - y).map((k) => `${k}:${o[k]}`).join(' ');
console.log(`PASS: 全80タイプ × 2形式 = ${rows.length}枚で、はみ出し・重なり・縮みすぎ 0件`);
for (const f of ['story', 'square']) {
  const s = stat[f];
  console.log(`  ${f}: 一言の大きさ(px:件数) ${dist(s.px)} / 行数 ${dist(s.lines)} / あだ名 ${dist(s.nick)} / 一言の最下端 ${Math.round(s.bottom)}px`);
}
