// 80CARDS 結果画像（80cards/share-image.js）のデータ整合検査
//
// 使い方: node check-share-image.mjs
//
// 検査内容:
//   1. 文節データ（PHRASES）が全80件あり、連結すると TYPES_80[...].summary と一致する（片方だけ直して食い違うのを防ぐ）
//   2. 文節の先頭に行頭禁則文字（、。」ー小書き仮名など）が来ていない（来る場合は normalizePhrases で前の文節へ結合されるが、データ側でも避ける）
//   3. 16タイプ分の縮小キャラ画像（80cards/share-image/*.webp）が揃っている
//   4. 校正した3件（誤字2件・希少性の断定1件）が元に戻っていない
// 実フォントでのはみ出し検査はブラウザが必要なため、ここでは行わない（Playwright で全80件を生成して確認する）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadDiagnosisLogic } from './extract-logic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '../..');
const api = require(path.join(ROOT, '80cards/share-image.js'));
const { TYPES_80, BEHAVIOR_CODE_PREFIX } = loadDiagnosisLogic();

const HEAD_NG = /^[、。，．,.)）」』】〕〉》!！?？・:：;；ー〜～ぁぃぅぇぉっゃゅょァィゥェォッャュョゝゞヽヾ々]/;
const TYPE_CODES = ['PP', 'PA', 'PI', 'PD', 'AP', 'AA', 'AI', 'AD', 'IP', 'IA', 'II', 'ID', 'DP', 'DA', 'DI', 'DD'];
const failures = [];
const fail = (msg) => failures.push(msg);

const entries = Object.values(TYPES_80);
if (entries.length !== 80) fail(`TYPES_80 が80件ではありません: ${entries.length}`);

const seen = new Set();
for (const t of entries) {
  const code80 = BEHAVIOR_CODE_PREFIX[t.behavioralType] + t.personalityCode;
  seen.add(code80);
  const ph = api.PHRASES[code80];
  if (!ph) { fail(`${code80}: 文節データがありません`); continue; }
  if (ph.join('') !== t.summary) fail(`${code80}: 文節の連結が summary と一致しません\n  文節: ${ph.join('|')}\n  summary: ${t.summary}`);
  ph.forEach((p, i) => { if (i > 0 && HEAD_NG.test(p)) fail(`${code80}: 行頭禁則の文字で始まる文節 "${p}"`); });
  if (ph.some(p => !p)) fail(`${code80}: 空の文節があります`);
}
for (const code of Object.keys(api.PHRASES)) {
  if (!seen.has(code)) fail(`${code}: TYPES_80 に対応するタイプがありません（余分な文節データ）`);
}

for (const c of TYPE_CODES) {
  const f = path.join(ROOT, '80cards/share-image', c.toLowerCase() + '.webp');
  if (!fs.existsSync(f)) fail(`キャラ縮小画像がありません: ${path.relative(ROOT, f)}`);
  else if (fs.statSync(f).size < 1000) fail(`キャラ縮小画像が小さすぎます: ${path.relative(ROOT, f)}`);
}

const byCode = (code) => entries.find(t => BEHAVIOR_CODE_PREFIX[t.behavioralType] + t.personalityCode === code);
if (byCode('INPP').summary.includes('優れた能型')) fail('INPP の誤字（優れた能型）が戻っています');
if (byCode('SHDP').summary.includes('活せる')) fail('SHDP の誤字（活せる）が戻っています');
if (/数百人|1人くらい|１人くらい|珍しい/.test(byCode('SHDD').summary)) fail('SHDD の希少性の断定が戻っています');

if (failures.length) {
  console.error(`FAIL: ${failures.length}件`);
  failures.forEach(m => console.error(' - ' + m));
  process.exit(1);
}
console.log(`PASS: 文節データ ${Object.keys(api.PHRASES).length}/80 件が summary と一致 / キャラ縮小画像 16/16 / 校正3件を維持`);
