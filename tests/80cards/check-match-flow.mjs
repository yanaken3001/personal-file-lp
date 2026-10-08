// 80CARDS 招待の流れ（相性を主役にする・第2段）のブラウザ通し検査
//
// 使い方: node check-match-flow.mjs [ペア画像の保存先ディレクトリ]
//   結果画面 →「友だちと相性を見る」→ 招待モーダル（LINE・X・コピー）→ 招待URLを開く → 診断（全問）→ 相性結果 → ペア画像の保存・共有
//   ・ローカルの静的サーバー（127.0.0.1）だけを使う。招待URLの宛先（本番ホスト）はローカルに付け替えて開く
//   ・GA4・Meta・GTM への通信はブロックする（?ga_off=1 も付ける）。gtag が dataLayer に積んだ呼び出しだけを読んで、イベントを検査する
//   ・React（unpkg）と Google Fonts を読むため、ネットワークに接続できる環境で実行する。本番のフォームには触れない
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = 4181;
const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : null;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(b);
  });
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;

const failures = [];
const fail = (m) => failures.push(m);
const check = (cond, m) => { if (!cond) fail(m); };

// 日本語の折り返し検査（jp-typography の検証スクリプト）。右余白40px超の行・カタカナの分断を数える
const TYPO = `(function (root) {
  function lines(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rows = new Map(), n;
    while ((n = w.nextNode())) {
      var s = n.data;
      for (var i = 0; i < s.length; i++) {
        if (!s[i].trim()) continue;
        var r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
        var rc = r.getBoundingClientRect(); if (!rc.width) continue;
        var t = Math.round(rc.top);
        var c = rows.get(t) || { text: '', right: 0 };
        c.text += s[i]; c.right = Math.max(c.right, rc.right); rows.set(t, c);
      }
    }
    return Array.from(rows.entries()).sort(function (a, b) { return a[0] - b[0]; }).map(function (e) { return e[1]; });
  }
  var gaps = [], kana = [], head = [];
  root.querySelectorAll('p, li, h1, h2, h3, a, button, span').forEach(function (el) {
    if (el.children.length && (el.tagName === 'SPAN' || el.tagName === 'BUTTON')) return;   // 複数の要素を並べたボタン（形式の切替など）は対象外
    var box = el.getBoundingClientRect(), ls = lines(el);
    ls.forEach(function (l, i) {
      if (i < ls.length - 1) {
        var gap = Math.round(box.right - l.right);
        if (gap > 40) gaps.push(l.text.slice(-14) + ' → 右余白' + gap + 'px');
      }
      if (i > 0 && /[ァ-ヶー]$/.test(ls[i - 1].text) && /^[ァ-ヶー]/.test(l.text)) kana.push(ls[i - 1].text.slice(-6) + ' / ' + l.text.slice(0, 6));
      if (i > 0 && /^[、。）」ー]/.test(l.text)) head.push(l.text.slice(0, 6));
    });
  });
  return { gaps: gaps, kana: kana, head: head };
})`;

const browser = await chromium.launch();
const events = (page) => page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => ({ name: a[1], params: a[2] || {} })));
async function newPage(ctx) {
  const page = await ctx.newPage();
  await page.route(/googletagmanager|google-analytics|doubleclick|facebook\.(com|net)/, (r) => r.abort());
  page.on('pageerror', (e) => fail(`ページのエラー: ${e.message}`));
  return page;
}
const typo = async (page, selector, label) => {
  const r = await page.evaluate(`(${TYPO})(document.querySelector(${JSON.stringify(selector)}))`);
  check(r.gaps.length === 0, `${label}: 右余白40px超の行 ${JSON.stringify(r.gaps)}`);
  check(r.kana.length === 0, `${label}: カタカナ語の分断 ${JSON.stringify(r.kana)}`);
  check(r.head.length === 0, `${label}: 行頭禁則 ${JSON.stringify(r.head)}`);
};

let inviteHrefs = {};
let copiedUrl = '';
let pairFile = null;
try {
  // ====== 1. 友だち（招待する人）の結果画面 → 招待モーダル ======
  const ctxA = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, acceptDownloads: true });
  await ctxA.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const a = await newPage(ctxA);
  const scores = JSON.stringify({ P: 40, A: 10, I: 10, D: 10, K: 30, H: 6, J: 6, G: 6, E: 6 });   // 達成型 × PP = ACPP
  await a.goto(`${BASE}/80cards/?ga_off=1&dev_scores=${encodeURIComponent(scores)}`);
  await a.waitForSelector('.pf-match-main', { timeout: 20000 });

  const mainText = (await a.locator('.pf-match-main').innerText()).trim();
  check(mainText === '友だちと相性を見る', `主ボタンの文言が違います: ${mainText}`);
  const subTexts = await a.locator('.pf-result-actions-sub button').allInnerTexts();
  check(JSON.stringify(subTexts.map((t) => t.trim())) === JSON.stringify(['画像を保存・共有', 'SNSでシェア']), `副ボタンが想定と違います: ${JSON.stringify(subTexts)}`);
  const mainBox = await a.locator('.pf-match-main').boundingBox();
  const subBox = await a.locator('.pf-result-actions-sub button').first().boundingBox();
  check(mainBox.width > subBox.width * 1.8, `主ボタンが副ボタンより目立つ幅になっていません（${mainBox.width} / ${subBox.width}）`);
  check(mainBox.y < subBox.y, '主ボタンが副ボタンより上にありません');
  check((await a.locator('text=80CODEをコピー').count()) === 0 && (await a.locator('text=コードのみ').count()) === 0, '80CODEのコピーボタンが残っています');
  check((await a.locator('text=相性診断').count()) === 0, '旧「相性診断」ボタンが残っています');
  await typo(a, '.pf-result-actions', '結果画面のボタン列(360px)');
  check(await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '結果画面(360px)で横スクロールが出ています');
  if (OUT_DIR) await a.screenshot({ path: path.join(OUT_DIR, 'result-buttons-360.png') });

  // 既存の「SNSでシェア」パネル（Xでシェア・結果リンクをコピー・画像を保存・共有）が前と同じ
  await a.locator('.pf-sub-btn', { hasText: 'SNSでシェア' }).click();
  const panelTexts = (await a.locator('.result-share-buttons-clean button').allInnerTexts()).map((t) => t.trim());
  check(JSON.stringify(panelTexts) === JSON.stringify(['Xでシェア', '結果リンクをコピー', '画像を保存・共有']), `シェアパネルのボタンが前と違います: ${JSON.stringify(panelTexts)}`);
  await a.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await a.locator('.result-share-button-clean--x').click();
  const xOpened = await a.evaluate(() => window.__opened[0] || '');
  check(xOpened.startsWith('https://x.com/intent/tweet?text='), `Xシェアの宛先が前と違います: ${xOpened.slice(0, 60)}`);
  const xText = decodeURIComponent(xOpened.split('text=')[1] || '');
  check(xText.includes('私は「ACPP｜チームの太陽」でした。') && xText.includes('https://www.personal-file.jp/80cards/share/acpp/') && xText.includes('#80CARDS #80タイプ診断'), `Xシェア文が前と違います: ${xText}`);
  await a.locator('text=閉じる').first().click();

  // PFへの誘導（位置・文言・遷移）が前と同じ: モーダルが開き、フォームへのリンクの形が従来どおり（遷移はしない）
  await a.locator('.personalfile-result-cta-button').first().scrollIntoViewIfNeeded();
  await a.locator('.personalfile-result-cta-button').first().click();
  const pfHref = await a.locator('a.personalfile-modal-primary').first().getAttribute('href').catch(() => null);
  check(pfHref && pfHref.includes('/80cards/contact.html') && pfHref.includes('source=80cards') && pfHref.includes('cta=career_section_modal'), `PFへの誘導リンクが前と違います: ${pfHref}`);
  await a.locator('.personalfile-modal-close').click();
  await a.evaluate(() => window.scrollTo(0, 0));

  // モバイルの下部固定バー: ボタン列が画面外に出たら、「友だちと相性を見る」（主）と「SNSでシェア」が出る
  await a.evaluate(() => window.scrollTo(0, 1400));
  await a.waitForSelector('.mobile-result-actions-fixed.is-visible');
  const barTexts = (await a.locator('.mobile-result-actions-fixed button').allInnerTexts()).map((t) => t.trim());
  check(JSON.stringify(barTexts) === JSON.stringify(['友だちと相性を見る', 'SNSでシェア']), `下部固定バーのボタンが想定と違います: ${JSON.stringify(barTexts)}`);
  await typo(a, '.mobile-result-actions-fixed', '下部固定バー(360px)');
  await a.evaluate(() => window.scrollTo(0, 0));

  // 自分の結果画像（第1段の機能）が前と同じに動く: 画像モーダルが開き、9:16 の画像を保存できる
  await a.locator('.pf-result-actions-sub .pf-image-share-btn').click();
  await a.waitForSelector('.pf-modal-card img.pf-preview-img', { timeout: 30000 });
  const [dlOwn] = await Promise.all([a.waitForEvent('download'), a.locator('.pf-modal-card .pf-btn--sub', { hasText: '画像を保存' }).click()]);
  check(dlOwn.suggestedFilename() === '80cards-ACPP-story.jpg', `自分の結果画像のファイル名が前と違います: ${dlOwn.suggestedFilename()}`);
  await a.keyboard.press('Escape');
  const ownSave = (await events(a)).filter((e) => e.name === 'share_80' && e.params.share_method === 'save_image');
  check(ownSave.length === 1 && ownSave[0].params.share_content === 'result_image_story' && ownSave[0].params.share_surface === 'result_top', `自分の結果画像の保存の share_80 が前と違います: ${JSON.stringify(ownSave.map((e) => e.params))}`);
  await a.evaluate(() => window.scrollTo(0, 0));

  // 招待モーダル
  await a.locator('.pf-match-main').click();
  await a.waitForSelector('#pf-invite-title');
  check((await a.locator('#pf-invite-title').innerText()).trim() === '友だちと相性を見る', '招待モーダルの見出しが違います');
  const actionTexts = (await a.locator('.pf-modal-card .pf-btn').allInnerTexts()).map((t) => t.trim());
  check(JSON.stringify(actionTexts) === JSON.stringify(['LINEで送る', 'Xで送る', 'リンクをコピー', '閉じる']), `招待モーダルのボタンが想定と違います: ${JSON.stringify(actionTexts)}`);
  inviteHrefs = {
    line: await a.locator('a.pf-btn--line').getAttribute('href'),
    x: await a.locator('a.pf-btn--main').getAttribute('href'),
  };
  await typo(a, '.pf-modal-card', '招待モーダル(360px)');
  if (OUT_DIR) await a.screenshot({ path: path.join(OUT_DIR, 'invite-modal-360.png') });
  // クリック（新しいタブは開かずに記録だけ確認するため、遷移を止める）
  await a.evaluate(() => document.querySelectorAll('a.pf-btn').forEach((el) => el.addEventListener('click', (e) => e.preventDefault())));
  await a.locator('a.pf-btn--line').click();
  await a.locator('a.pf-btn--main').click();
  await a.locator('.pf-btn--sub').click();
  await a.waitForSelector('.pf-invite-copied, .pf-invite-failed');
  copiedUrl = await a.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  const evA = await events(a);
  const shareA = evA.filter((e) => e.name === 'share_80' && e.params.share_content === 'invite_link');
  check(shareA.length === 3, `招待の share_80 が3件ではありません: ${shareA.length}`);
  for (const [method, status] of [['line', 'initiated'], ['x', 'initiated'], ['copy_link', 'done']]) {
    const e = shareA.find((s) => s.params.share_method === method);
    check(e && e.params.share_status === status && e.params.share_surface === 'match_modal' && e.params.personality_type === 'PP', `share_80（${method}）が想定と違います: ${JSON.stringify(e)}`);
  }
  await ctxA.close();

  // 招待URLの検査（LINE・X・コピーの3経路）
  const parse = (u) => new URL(u);
  const lineInvite = parse(parse(inviteHrefs.line).searchParams.get('url'));
  const xInvite = parse(parse(inviteHrefs.x).searchParams.get('url'));
  check(lineInvite.searchParams.get('utm_medium') === 'invite_line' && xInvite.searchParams.get('utm_medium') === 'invite_x', '招待URLの utm_medium が経路どおりではありません');
  check(copiedUrl && parse(copiedUrl).searchParams.get('utm_medium') === 'invite_copy', `コピーされた招待URLが想定と違います: ${copiedUrl}`);
  for (const u of [lineInvite, xInvite, parse(copiedUrl)]) {
    check(u.origin + u.pathname === 'https://www.personal-file.jp/80cards/' && u.searchParams.get('utm_source') === '80cards' && u.searchParams.get('utm_campaign') === 'match' && !!u.searchParams.get('match'), `招待URLの形が違います: ${u.href}`);
  }
  check(parse(inviteHrefs.line).origin === 'https://social-plugins.line.me' && parse(inviteHrefs.x).origin === 'https://x.com', 'LINE・X の宛先が違います');
  check(decodeURIComponent(parse(inviteHrefs.line).searchParams.get('text') || '').includes('ACPP｜チームの太陽'), 'LINEの文面に80CODEとあだ名がありません');

  // ====== 2. 友だちが招待URLを開く → 診断 → 相性結果 ======
  const ctxB = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, acceptDownloads: true });
  const b = await newPage(ctxB);
  const local = new URL(copiedUrl);
  local.protocol = 'http:'; local.host = `127.0.0.1:${PORT}`;   // 本番ホストをローカルに付け替える（本番へは接続しない）
  local.searchParams.set('ga_off', '1');
  local.searchParams.set('utm_medium', 'invite_line');   // LINE経由で開いた想定
  await b.goto(local.href);
  await b.waitForSelector('text=無料で診断して相性を調べる', { timeout: 20000 });
  const landing = await events(b);
  const land = landing.filter((e) => e.name === 'invite_land_80');
  check(land.length === 1 && land[0].params.inviter_type === 'PP' && land[0].params.invite_src === 'invite_line', `invite_land_80 が想定と違います: ${JSON.stringify(land)}`);
  check(JSON.stringify(Object.keys(land[0]?.params || {}).sort()) === JSON.stringify(['invite_src', 'inviter_type']), `invite_land_80 のパラメータが想定と違います: ${JSON.stringify(land[0]?.params)}`);
  check(landing.filter((e) => e.name === 'diagnosis_80_start').length === 0, '着地の時点で diagnosis_80_start が出ています');
  await typo(b, '#root', '招待の着地画面(360px)');
  await b.locator('text=無料で診断して相性を調べる').click();

  const choices = [5, 2, 4, 1, 3, 5, 5, 2];
  const labels = { 1: 'まったく当てはまらない', 2: 'あまり当てはまらない', 3: 'どちらとも言えない', 4: 'やや当てはまる', 5: 'とても当てはまる' };
  let answered = 0;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (await b.locator('.pf-pair').count()) break;   // 相性リンク経由では、診断の完了後に相性結果が自動で表示される
    const chapter = b.locator('.chapter-continue-btn');
    if (await chapter.count()) { await chapter.first().click(); continue; }
    const adaptive = b.locator('.adaptive-intro-panel button');
    if (await adaptive.count()) { await adaptive.first().click(); continue; }
    const opt = b.getByRole('button', { name: labels[choices[answered % choices.length]], exact: true });
    if (await opt.count()) {
      await opt.first().click().catch(() => {});
      answered += 1;
      await b.waitForTimeout(560);
      continue;
    }
    await b.waitForTimeout(250);
  }
  check(answered >= 57, `回答できた問数が57未満です: ${answered}`);
  await b.waitForSelector('.pf-pair-img', { timeout: 30000 });
  await b.waitForFunction(() => { const i = document.querySelector('.pf-pair-img'); return i && i.complete && i.naturalWidth === 1080; }, null, { timeout: 30000 });

  const evB = await events(b);
  const view = evB.filter((e) => e.name === 'compat_view_80');
  check(view.length === 1, `compat_view_80 が1件ではありません: ${view.length}`);
  const vp = view[0]?.params || {};
  check(JSON.stringify(Object.keys(vp).sort()) === JSON.stringify(['compat_label', 'compat_score', 'inviter_type', 'personality_type']), `compat_view_80 のパラメータが想定と違います: ${JSON.stringify(vp)}`);
  check(vp.inviter_type === 'PP' && typeof vp.compat_score === 'number' && !!vp.compat_label && !!vp.personality_type, `compat_view_80 の値が想定と違います: ${JSON.stringify(vp)}`);
  const completes = evB.filter((e) => e.name === 'diagnosis_80_complete');
  check(completes.length === 1 && completes[0].params.entry === 'invite', `diagnosis_80_complete（entry=invite）が想定と違います: ${JSON.stringify(completes.map((c) => c.params.entry))}`);
  const pairAlt = await b.locator('.pf-pair-img').getAttribute('alt');
  check(pairAlt && pairAlt.includes('ACPP') && pairAlt.includes(`${vp.compat_label}`) && pairAlt.includes(`${vp.compat_score}`), `ペア画像の代替テキストが想定と違います: ${pairAlt}`);
  await typo(b, '.pf-pair', '相性結果のペア画像まわり(360px)');
  check(await b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '相性結果(360px)で横スクロールが出ています');
  if (OUT_DIR) await b.locator('.pf-pair').screenshot({ path: path.join(OUT_DIR, 'compat-pair-360.png') });

  // ペア画像の保存・共有モーダル
  await b.locator('.pf-pair-btn').click();
  await b.waitForSelector('#pf-share-modal-title');
  await b.waitForSelector('.pf-modal-card img.pf-preview-img', { timeout: 30000 });
  const saveBtn = b.locator('.pf-modal-card .pf-btn--sub', { hasText: '画像を保存' });
  check((await saveBtn.count()) === 1, '「画像を保存」ボタンがありません');
  check((await b.locator('.pf-modal-card .pf-btn--main').count()) === 0, 'Web Share 非対応の環境で「共有する」が出ています');
  check((await b.locator('.pf-modal-card .pf-note--strong').count()) === 1, '非対応時の長押し保存の案内が出ていません');
  await typo(b, '.pf-modal-card', 'ペア画像モーダル(360px)');
  const [dl] = await Promise.all([b.waitForEvent('download'), saveBtn.click()]);
  pairFile = dl.suggestedFilename();
  check(/^80cards-pair-[A-Z]{4}-[A-Z]{4}-story\.jpg$/.test(pairFile), `ペア画像（9:16）のファイル名が想定と違います: ${pairFile}`);
  if (OUT_DIR) await dl.saveAs(path.join(OUT_DIR, pairFile));
  await b.locator('.pf-seg-btn', { hasText: '正方形' }).click();
  const [dl2] = await Promise.all([b.waitForEvent('download'), saveBtn.click()]);
  check(/^80cards-pair-[A-Z]{4}-[A-Z]{4}-square\.jpg$/.test(dl2.suggestedFilename()), `ペア画像（1:1）のファイル名が想定と違います: ${dl2.suggestedFilename()}`);
  if (OUT_DIR) await dl2.saveAs(path.join(OUT_DIR, dl2.suggestedFilename()));
  const evB2 = await events(b);
  const saves = evB2.filter((e) => e.name === 'share_80' && e.params.share_method === 'save_image');
  check(saves.length === 2 && saves.every((s) => s.params.share_surface === 'compat_result' && s.params.share_status === 'initiated'), `ペア画像の保存の share_80 が想定と違います: ${JSON.stringify(saves.map((s) => s.params))}`);
  check(JSON.stringify(saves.map((s) => s.params.share_content)) === JSON.stringify(['pair_image_story', 'pair_image_square']), `share_content が想定と違います: ${JSON.stringify(saves.map((s) => s.params.share_content))}`);
  const opens = evB2.filter((e) => e.name === 'share_image_open_80');
  check(opens.length === 1 && opens[0].params.share_surface === 'compat_result', `share_image_open_80 が想定と違います: ${JSON.stringify(opens)}`);
  await b.keyboard.press('Escape');
  check((await b.locator('#pf-share-modal-title').count()) === 0, 'Esc でモーダルが閉じません');
  const focused = await b.evaluate(() => document.activeElement && document.activeElement.className);
  check(/pf-pair-btn/.test(focused || ''), `閉じたあと、開いたボタンにフォーカスが戻っていません: ${focused}`);
  await ctxB.close();
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`FAIL: ${failures.length}件`);
  failures.forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
console.log('PASS: 結果画面のボタン構成／招待モーダル（LINE・X・コピーと utm・計測）／招待URL着地（invite_land_80）／診断完走／相性結果（compat_view_80）／ペア画像の保存（9:16・1:1）／既存のXシェア・PF誘導 が想定どおり');
