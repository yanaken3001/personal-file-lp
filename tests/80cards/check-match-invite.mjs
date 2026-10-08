// 80CARDS 招待URL（相性リンク）の検査
//
// 使い方: node check-match-invite.mjs
//   1. 招待URLの形: https://www.personal-file.jp/80cards/?match=<従来どおりの値>&utm_source=80cards&utm_medium=<経路>&utm_campaign=match
//      ・?match= の値は、従来の encodeMatchData() の出力そのまま（形式を変えていない）
//      ・16タイプ × 5行動類型 × 4経路（invite_line / invite_x / invite_copy / invite_pair）のすべてで、
//        URLSearchParams で読み戻した match が decodeMatchData() で元の {typeCode, behaviorCode} に戻る（base64 の記号が欠けない）
//      ・utm は3つ（utm_source / utm_medium / utm_campaign）だけが付く
//   2. 経路名が決めた4つで、設計書どおり invite_line / invite_x / invite_copy を含む
//   3. 招待文面に URL が含まれず（URL は別パラメータで渡す）、80CODE とあだ名が入る
//   4. 改ざんされた ?match=（t/b に "constructor"・"__proto__" などの継承プロパティ名・型違い・範囲外）が、
//      相性リンクとして通らない／行動類型は空になる／ペア画像の行動類型コードにならない。既存の正しい URL は今までどおり読める（後方互換）
//   5. ブラウザ実行（Playwright・ローカルの静的サーバー 127.0.0.1 のみ。GA4・Meta へは送らない。React を unpkg から読むためネットワーク接続が必要）:
//      ・t="constructor" の URL → 相性の着地画面にならず、invite_land_80 も送られず、画面に変な文字列が出ない
//      ・utm_medium が INVITE_MEDIUMS の4つ以外（自由な文字列・"constructor"）→ invite_src は other、無ければ none
//      ・b="constructor" の URL → 着地画面は出る。診断を終えたあとのペア画像の代替テキスト・保存ファイル名・計測の値に変な文字列が出ない
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadDiagnosisLogic } from './extract-logic.mjs';

const { INVITE_MEDIUMS, buildInviteUrl, buildInviteMessage, encodeMatchData, decodeMatchData, get80Code, TYPE_NICKNAMES, getMatchBehaviorName, isValidTypeCode, getBehaviorPrefix } = loadDiagnosisLogic();

const failures = [];
const fail = (m) => failures.push(m);

const TYPE_CODES = ['PP', 'PA', 'PI', 'PD', 'AP', 'AA', 'AI', 'AD', 'IP', 'IA', 'II', 'ID', 'DP', 'DA', 'DI', 'DD'];
const BEHAVIOR_CODES = ['K', 'H', 'J', 'G', 'E'];   // ResultScreen80 が渡す behavioralType.code（達成・調和・情報・演出・効率）
const EXPECTED_MEDIUMS = { line: 'invite_line', x: 'invite_x', copy: 'invite_copy', pair: 'invite_pair' };

if (JSON.stringify(INVITE_MEDIUMS) !== JSON.stringify(EXPECTED_MEDIUMS)) fail(`INVITE_MEDIUMS が想定と違います: ${JSON.stringify(INVITE_MEDIUMS)}`);

let n = 0;
for (const t of TYPE_CODES) {
  for (const b of BEHAVIOR_CODES) {
    for (const medium of Object.values(EXPECTED_MEDIUMS)) {
      n += 1;
      const url = buildInviteUrl(t, b, medium);
      const u = new URL(url);
      const id = `${t}/${b}/${medium}`;
      if (u.origin + u.pathname !== 'https://www.personal-file.jp/80cards/') fail(`${id}: 宛先が違います ${u.origin}${u.pathname}`);
      if (!url.startsWith(`https://www.personal-file.jp/80cards/?match=${encodeMatchData(t, b)}&`)) fail(`${id}: ?match= の形式が従来と違います ${url}`);
      const keys = [...u.searchParams.keys()].sort().join(',');
      if (keys !== 'match,utm_campaign,utm_medium,utm_source') fail(`${id}: パラメータが想定と違います ${keys}`);
      if (u.searchParams.get('utm_source') !== '80cards') fail(`${id}: utm_source が80cardsではありません`);
      if (u.searchParams.get('utm_medium') !== medium) fail(`${id}: utm_medium が違います ${u.searchParams.get('utm_medium')}`);
      if (u.searchParams.get('utm_campaign') !== 'match') fail(`${id}: utm_campaign がmatchではありません`);
      const back = decodeMatchData(u.searchParams.get('match'));
      if (!back || back.typeCode !== t || back.behaviorCode !== b) fail(`${id}: ?match= を読み戻せません ${JSON.stringify(back)}`);
      if (!getMatchBehaviorName(back && back.behaviorCode)) fail(`${id}: 行動類型の名前に戻せません`);
    }
  }
}

const msg = buildInviteMessage(get80Code('達成型', 'PP'), TYPE_NICKNAMES.PP);
if (!msg.includes('ACPP') || !msg.includes(TYPE_NICKNAMES.PP)) fail(`招待文面に80CODEとあだ名が入っていません: ${msg}`);
if (/https?:\/\//.test(msg)) fail('招待文面にURLが入っています（URLは別パラメータで渡します）');

// ---- 4. 改ざんされた ?match= ----
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64');
const INHERITED = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', '__defineGetter__'];

// 招待元のタイプ（t）: 継承プロパティ名・型違い・範囲外は null（相性リンクとして扱わない）
const badTypes = [...INHERITED, 'pp', 'PPP', 'P', '', ' PP', 'PP ', 'ZZ', 'XX', ['PP'], { toString: 'PP' }, null, 5, true];
for (const t of badTypes) {
  const label = JSON.stringify(t);
  if (decodeMatchData(encodeMatchData(t, 'K')) !== null) fail(`t=${label} が相性リンクとして通ります`);
  if (isValidTypeCode(t)) fail(`isValidTypeCode(${label}) が true です`);
}
for (const raw of [b64(null), b64(5), b64('PP'), b64([]), b64({}), b64({ b: 'K' }), 'not-base64!!', '', 'e30']) {
  if (decodeMatchData(raw) !== null) fail(`形が正しくない ?match=（${String(raw).slice(0, 20)}）が通ります`);
}
// 行動類型（b）: 継承プロパティ名・型違いは、相性リンクは通すが行動類型は空にする
const badBehaviors = [...INHERITED, 'k', 'ZZ', 'ACX', ' K', '', null, 5, ['K'], { a: 1 }, true];
for (const bc of badBehaviors) {
  const label = JSON.stringify(bc);
  const back = decodeMatchData(encodeMatchData('PP', bc));
  if (!back || back.typeCode !== 'PP' || back.behaviorCode !== '') fail(`b=${label} が空になりません: ${JSON.stringify(back)}`);
  if (getMatchBehaviorName(bc) !== '') fail(`getMatchBehaviorName(${label}) が空ではありません: ${getMatchBehaviorName(bc)}`);
  if (getBehaviorPrefix(bc) !== '') fail(`getBehaviorPrefix(${label}) が空ではありません: ${getBehaviorPrefix(bc)}`);
}
if (decodeMatchData(b64({ t: 'PP' }))?.behaviorCode !== '') fail('b の無い ?match= が空の行動類型で読めません');
// 行動類型の2文字コード: 名前 → コード（ペア画像の80CODEの先頭）
const PREFIX_OF = { 達成型: 'AC', 調和型: 'HM', 効率型: 'EF', 演出型: 'SH', 情報型: 'IN' };
for (const [name, code] of Object.entries(PREFIX_OF)) {
  if (getBehaviorPrefix(name) !== code) fail(`getBehaviorPrefix(${name}) が ${code} ではありません: ${getBehaviorPrefix(name)}`);
}
// 後方互換: 従来の値（旧コード K/H/J/G/E・名前・2文字コード・旧URLの1文字コード）は今までどおり読める
const LEGACY = { K: '達成型', H: '調和型', J: '情報型', G: '演出型', E: '効率型', AC: '達成型', HM: '調和型', EF: '効率型', SH: '演出型', IN: '情報型', A: '達成型', S: '演出型', I: '情報型', 達成型: '達成型', 調和型: '調和型', 情報型: '情報型', 演出型: '演出型', 効率型: '効率型' };
for (const [code, name] of Object.entries(LEGACY)) {
  if (getMatchBehaviorName(code) !== name) fail(`従来の値 ${code} が ${name} に戻りません: ${getMatchBehaviorName(code)}`);
}
for (const t of TYPE_CODES) {
  if (!isValidTypeCode(t)) fail(`isValidTypeCode(${t}) が false です`);
  const back = decodeMatchData(b64({ t, b: 'K' }));
  if (!back || back.typeCode !== t || back.behaviorCode !== 'K') fail(`従来の形の ?match=（${t}）が読めません`);
}

// ---- 5. ブラウザ実行 ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = 4182;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, bytes) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  });
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;
const WEIRD = /constructor|__proto__|\[object|native code|function\s*\(|undefined|NaN/;   // 継承プロパティ・関数の文字列化が画面や値に出た印

const browser = await chromium.launch();
const events = (page) => page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => ({ name: a[1], params: a[2] || {} })));
async function open(ctx, query) {
  const page = await ctx.newPage();
  await page.route(/googletagmanager|google-analytics|doubleclick|facebook\.(com|net)/, (r) => r.abort());
  page.on('pageerror', (e) => fail(`ページのエラー（${query.slice(0, 40)}）: ${e.message}`));
  await page.goto(`${BASE}/80cards/?ga_off=1&${query}`);
  await page.waitForSelector('.app-container', { timeout: 20000 });
  return page;
}
let nBrowser = 0;
let srcCases = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, acceptDownloads: true });

  // (a) 招待元のタイプが改ざん（t="constructor"）: 相性の着地画面にならない・invite_land_80 を送らない・変な文字列が出ない
  for (const tampered of [{ t: 'constructor', b: 'constructor' }, { t: '__proto__', b: 'K' }, { t: 'toString', b: 'AC' }]) {
    const page = await open(ctx, `match=${encodeURIComponent(encodeMatchData(tampered.t, tampered.b))}&utm_medium=invite_line`);
    nBrowser += 1;
    const id = `t=${tampered.t}`;
    if ((await page.locator('text=無料で診断して相性を調べる').count()) !== 0) fail(`${id}: 相性の着地画面が出ています`);
    const ev = await events(page);
    if (ev.some((e) => e.name === 'invite_land_80')) fail(`${id}: invite_land_80 が送られています`);
    const text = await page.locator('#root').innerText();
    if (WEIRD.test(text)) fail(`${id}: 画面に変な文字列が出ています: ${text.match(WEIRD)[0]}`);
    await page.close();
  }

  // (b) utm_medium: INVITE_MEDIUMS の4つだけをそのまま、無ければ none、それ以外はすべて other
  const valid = encodeURIComponent(encodeMatchData('PP', 'K'));
  const SRC_CASES = [
    ['utm_medium=invite_line', 'invite_line'], ['utm_medium=invite_x', 'invite_x'], ['utm_medium=invite_copy', 'invite_copy'], ['utm_medium=invite_pair', 'invite_pair'],
    ['', 'none'], ['utm_medium=', 'none'],
    ['utm_medium=constructor', 'other'], ['utm_medium=invite_line_x', 'other'], ['utm_medium=Invite_Line', 'other'],
    ['utm_medium=' + encodeURIComponent('<script>alert(1)</script>'), 'other'], ['utm_medium=cpc', 'other'],
  ];
  srcCases = SRC_CASES.length;
  for (const [q, expect] of SRC_CASES) {
    const page = await open(ctx, `match=${valid}${q ? '&' + q : ''}`);
    nBrowser += 1;
    await page.waitForSelector('text=無料で診断して相性を調べる', { timeout: 20000 });
    const land = (await events(page)).filter((e) => e.name === 'invite_land_80');
    if (land.length !== 1 || land[0].params.invite_src !== expect || land[0].params.inviter_type !== 'PP') fail(`utm「${q}」: invite_src が ${expect} ではありません: ${JSON.stringify(land.map((e) => e.params))}`);
    await page.close();
  }

  // (c) 行動類型が改ざん（b="constructor"）: 着地画面は出る。診断を終えた相性結果のペア画像・計測に変な文字列が出ない
  const page = await open(ctx, `match=${encodeURIComponent(encodeMatchData('PP', 'constructor'))}&utm_medium=invite_copy`);
  nBrowser += 1;
  await page.waitForSelector('text=無料で診断して相性を調べる', { timeout: 20000 });
  const landText = await page.locator('#root').innerText();
  if (WEIRD.test(landText)) fail(`b=constructor: 着地画面に変な文字列が出ています: ${landText.match(WEIRD)[0]}`);
  const land = (await events(page)).filter((e) => e.name === 'invite_land_80');
  if (land.length !== 1 || land[0].params.inviter_type !== 'PP' || land[0].params.invite_src !== 'invite_copy') fail(`b=constructor: invite_land_80 が想定と違います: ${JSON.stringify(land.map((e) => e.params))}`);
  await page.locator('text=無料で診断して相性を調べる').click();
  const choices = [5, 2, 4, 1, 3, 5, 5, 2];
  const labels = { 1: 'まったく当てはまらない', 2: 'あまり当てはまらない', 3: 'どちらとも言えない', 4: 'やや当てはまる', 5: 'とても当てはまる' };
  let answered = 0;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (await page.locator('.pf-pair').count()) break;   // 相性リンク経由では、診断の完了後に相性結果が自動で表示される
    const chapter = page.locator('.chapter-continue-btn');
    if (await chapter.count()) { await chapter.first().click(); continue; }
    const adaptive = page.locator('.adaptive-intro-panel button');
    if (await adaptive.count()) { await adaptive.first().click(); continue; }
    const opt = page.getByRole('button', { name: labels[choices[answered % choices.length]], exact: true });
    if (await opt.count()) { await opt.first().click().catch(() => {}); answered += 1; await page.waitForTimeout(560); continue; }
    await page.waitForTimeout(250);
  }
  if (answered < 57) fail(`b=constructor: 回答できた問数が57未満です: ${answered}`);
  await page.waitForSelector('.pf-pair-img', { timeout: 30000 });
  await page.waitForFunction(() => { const i = document.querySelector('.pf-pair-img'); return i && i.complete && i.naturalWidth === 1080; }, null, { timeout: 30000 });
  const alt = (await page.locator('.pf-pair-img').getAttribute('alt')) || '';
  if (WEIRD.test(alt)) fail(`b=constructor: ペア画像の代替テキストに変な文字列が出ています: ${alt}`);
  if (!/^.+（PP）と.+（[A-Z]{4}）の相性は .+ \d+点$/.test(alt)) fail(`b=constructor: ペア画像の代替テキストが想定と違います（友だちの80CODEは行動類型なしの PP になる）: ${alt}`);
  const resultText = await page.locator('#root').innerText();
  if (WEIRD.test(resultText)) fail(`b=constructor: 相性結果に変な文字列が出ています: ${resultText.match(WEIRD)[0]}`);
  await page.locator('.pf-pair-btn').click();
  await page.waitForSelector('.pf-modal-card img.pf-preview-img', { timeout: 30000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.pf-modal-card .pf-btn--sub', { hasText: '画像を保存' }).click()]);
  if (!/^80cards-pair-PP-[A-Z]{4}-story\.jpg$/.test(dl.suggestedFilename())) fail(`b=constructor: ペア画像のファイル名が想定と違います: ${dl.suggestedFilename()}`);
  const all = await events(page);
  const bad = all.filter((e) => WEIRD.test(JSON.stringify(e.params)));
  if (bad.length) fail(`b=constructor: 計測の値に変な文字列が出ています: ${JSON.stringify(bad.map((e) => [e.name, e.params])).slice(0, 300)}`);
  const view = all.filter((e) => e.name === 'compat_view_80');
  if (view.length !== 1 || view[0].params.inviter_type !== 'PP') fail(`b=constructor: compat_view_80 が想定と違います: ${JSON.stringify(view.map((e) => e.params))}`);
  await page.close();
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`FAIL: ${failures.length}件`);
  failures.slice(0, 40).forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
console.log(`PASS: 招待URL ${n}通り（16タイプ × 5行動類型 × 4経路）で、?match= の形式が従来どおり・utmの3つだけが付く・読み戻せる／改ざん（t ${badTypes.length}種・b ${badBehaviors.length}種・形の崩れ）は通らない・従来の値は読める／ブラウザ ${nBrowser}ページ（t改ざん・utm ${srcCases}種・b改ざんで診断完走）で変な文字列なし`);
