// 80CARDS 相性ペア画像（80cards/share-image.js の generatePair）の見本一覧づくり
//
// 使い方: node make-pair-samples.mjs <出力JPEGのパス>
//   ・相性ラベルの違う3組 × （9:16 と 1:1）= 6枚を、本番と同じ描画（generatePair）で作り、1枚に並べて保存する
//   ・各組の点数・ラベルは、画面と同じ getCompatibility()（app.js から抽出）の値
//   ・実フォントのため Google Fonts に接続できる環境でのみ動く。ローカルの静的サーバー（127.0.0.1）だけを使い、GA4・Meta は読み込まない
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadDiagnosisLogic } from './extract-logic.mjs';
import { startHarness } from './pair-harness.mjs';

const out = process.argv[2];
if (!out) { console.error('使い方: node make-pair-samples.mjs <出力JPEGのパス>'); process.exit(1); }

const { getCompatibility, TYPE_NICKNAMES } = loadDiagnosisLogic();

// 見本の3組（ラベルが違うこと）。友だち（左）× 自分（右）。80CODE の行動類型は組ごとに変える
const PAIRS = [
  { a: ['AC', 'PP'], b: ['EF', 'AD'] },   // 最強コンビ
  { a: ['HM', 'PA'], b: ['IN', 'AP'] },   // 好相性
  { a: ['SH', 'PA'], b: ['EF', 'DD'] },   // 正反対タイプ（あだ名が最長の DD を含む）
];
const jobs = PAIRS.map((p) => {
  const c = getCompatibility(p.a[1], p.b[1]);
  return {
    a: { behaviorPrefix: p.a[0], typeCode: p.a[1], nickname: TYPE_NICKNAMES[p.a[1]] },
    b: { behaviorPrefix: p.b[0], typeCode: p.b[1], nickname: TYPE_NICKNAMES[p.b[1]] },
    score: c.score,
    label: c.label,
  };
});
console.log(jobs.map((j) => `${j.a.behaviorPrefix + j.a.typeCode} × ${j.b.behaviorPrefix + j.b.typeCode}: ${j.score} ${j.label}`).join('\n'));

const harness = await startHarness(4179);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(harness.url);
  const dataUrl = await page.evaluate(async (list) => {
    const api = window.PF80ShareImage;
    const load = (u) => new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = u; });
    const results = [];
    for (const j of list) results.push(await api.generatePair(j));
    for (const r of results) if (r.fontStatus !== 'ok') throw new Error('フォントを読み込めませんでした: ' + r.fontStatus);
    // 一覧: 3列。各列に 9:16（幅360）と 1:1（幅360）を縦に並べる
    const colW = 360, gap = 24, pad = 24, storyH = 640, sqH = 360, cap = 30;
    const W = pad * 2 + colW * list.length + gap * (list.length - 1);
    const H = pad * 2 + cap + storyH + gap + sqH;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '700 18px "Noto Sans JP", sans-serif';
    for (let i = 0; i < list.length; i++) {
      const x = pad + i * (colW + gap);
      ctx.fillText(`${list[i].label}（${list[i].score}）  ${results[i].code80A} × ${results[i].code80B}`, x, pad + 18);
      const s = await load(results[i].story.url);
      const q = await load(results[i].square.url);
      ctx.drawImage(s, x, pad + cap, colW, storyH);
      ctx.drawImage(q, x, pad + cap + storyH + gap, colW, sqH);
      api.release(results[i]);
    }
    return cv.toDataURL('image/jpeg', 0.92);
  }, jobs);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved: ' + out);
} finally {
  await browser.close();
  harness.close();
}
