// 80CARDS 結果画像（80cards/share-image.js）のデータ整合検査
//
// 使い方: node check-share-image.mjs
//
// 検査内容:
//   1. 文節データ（PHRASES）が全80件あり、連結すると TYPES_80[...].summary と一致する（片方だけ直して食い違うのを防ぐ）
//   2. 文節の先頭に行頭禁則文字（、。」ー小書き仮名など）が来ていない（来る場合は normalizePhrases で前の文節へ結合されるが、データ側でも避ける）
//   3. 16タイプ分の縮小キャラ画像（80cards/share-image/*.webp）が揃っている
//   4. 校正した3件（誤字2件・希少性の断定1件）が元に戻っていない
//   5. レア度（16タイプ単位の段階表示・2026-10-08ユーザー確定）の段階表が、確定した割り当てと一致する
//      ・件数を想起させる表現（数字・％・「人に」「誰も」など）が段階名・注記・計測値に混ざっていない
//      ・注記の文が確定した文と一致する
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
const { TYPES_80, BEHAVIOR_CODE_PREFIX, RARITY_MAX_TIER, RARITY_TIERS, RARITY_TIER_BY_TYPE, RARITY_NOTE_PHRASES, getRarity, rarityParam } = loadDiagnosisLogic();

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

// ---- レア度 ----
// 確定した割り当て（GA4 2026-07-16〜10-07・251人から決定）。変えるときは app.jsx の RARITY_TIER_BY_TYPE と一緒に直す
const EXPECTED_TIER = {
  IP: 1, AD: 1, IA: 1, PD: 1, AI: 1, DP: 1, PI: 1, PA: 1,
  DA: 2, ID: 2, AP: 2,
  II: 3, DI: 3,
  PP: 4, AA: 4, DD: 4,
};
const EXPECTED_LABEL = { 1: 'スタンダード', 2: 'ちょっと珍しい', 3: 'レア', 4: '超レア' };
const EXPECTED_NOTE = 'レア度は、これまでの診断結果での出やすさをもとにした目安です（定期的に見直します）';
// 件数・割合・人数を想起させる表現（段階名・注記・計測値に出してはいけない）
const COUNT_WORDS = /[0-9０-９％%]|人に|誰も|まだ|だけ|のみ|限定|[一二三四五六七八九十百千万]人|分の/;

if (RARITY_MAX_TIER !== 4) fail(`RARITY_MAX_TIER が4ではありません: ${RARITY_MAX_TIER}`);
for (const c of TYPE_CODES) {
  const r = getRarity(c);
  if (!r) { fail(`${c}: レア度が定義されていません`); continue; }
  if (r.tier !== EXPECTED_TIER[c]) fail(`${c}: レア度が確定値と違います（${r.tier} / 確定 ${EXPECTED_TIER[c]}）`);
  if (r.label !== EXPECTED_LABEL[EXPECTED_TIER[c]]) fail(`${c}: レア度の名前が確定値と違います（${r.label}）`);
  if (rarityParam(c).rarity_tier !== String(EXPECTED_TIER[c])) fail(`${c}: rarity_tier の値が文字列の '${EXPECTED_TIER[c]}' ではありません`);
}
for (const c of Object.keys(RARITY_TIER_BY_TYPE)) {
  if (!TYPE_CODES.includes(c)) fail(`${c}: 16タイプにないコードがレア度表にあります`);
}
if (Object.keys(RARITY_TIER_BY_TYPE).length !== 16) fail(`レア度表が16件ではありません: ${Object.keys(RARITY_TIER_BY_TYPE).length}`);
if (getRarity('XX') !== null || Object.keys(rarityParam('XX')).length !== 0) fail('未定義のタイプでレア度が返っています');
Object.values(RARITY_TIERS).forEach((t) => { if (COUNT_WORDS.test(t.label)) fail(`段階名に件数を想起させる表現があります: ${t.label}`); });
if (RARITY_NOTE_PHRASES.join('') !== EXPECTED_NOTE) fail(`レア度の注記が確定した文と違います: ${RARITY_NOTE_PHRASES.join('')}`);
RARITY_NOTE_PHRASES.forEach((p, i) => { if (i > 0 && HEAD_NG.test(p)) fail(`注記の文節が行頭禁則の文字で始まっています: ${p}`); });
{
  const noteNoParen = EXPECTED_NOTE.replace(/[（）]/g, '');
  if (/[0-9０-９％%]/.test(noteNoParen) || /人に|誰も/.test(noteNoParen)) fail('注記に件数を想起させる表現があります');
}

if (failures.length) {
  console.error(`FAIL: ${failures.length}件`);
  failures.forEach(m => console.error(' - ' + m));
  process.exit(1);
}
console.log(`PASS: 文節データ ${Object.keys(api.PHRASES).length}/80 件が summary と一致 / キャラ縮小画像 16/16 / 校正3件を維持 / レア度 16/16 が確定値と一致`);
