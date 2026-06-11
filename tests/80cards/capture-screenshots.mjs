// 80CARDS 主要ページのスクリーンショット基準記録
//
// 使い方:
//   node capture-screenshots.mjs              ... screenshots/baseline/ に保存（初回の基準記録）
//   node capture-screenshots.mjs --out current ... screenshots/current/ に保存（変更後の比較用）
//
// リポジトリルートをローカルHTTPサーバーで配信する（/80cards/... の絶対パス参照のため file:// 不可）。
// アニメーションの揺らぎを減らすため prefers-reduced-motion を有効化するが、
// パーティクル等のランダム要素は残るため、比較は目視（または構造比較）前提。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const outArg = process.argv.indexOf('--out');
const OUT_DIR = path.resolve(__dirname, 'screenshots', outArg !== -1 ? process.argv[outArg + 1] : 'baseline');
const PORT = 8347;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = path.join(REPO_ROOT, urlPath);
      if (!filePath.startsWith(REPO_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
];

// dev_scores: ACPP（達成型チームの太陽）を直接表示（localhost では ALLOW_DEV_RESULT_PREVIEW 有効）
const DEV_SCORES = encodeURIComponent(JSON.stringify({ P: 40, A: 10, I: 10, D: 10, K: 30, H: 6, J: 6, G: 6, E: 6 }));

const PAGES = [
  { name: 'lp', url: '/80cards/index.html', waitFor: '.lp-header-clean', settle: 3500 },
  { name: 'quiz-q1', url: '/80cards/index.html?start=1', waitFor: '.quiz-option-btn', settle: 2000 },
  { name: 'result-acpp', url: `/80cards/index.html?dev_scores=${DEV_SCORES}#dev-result`, waitFor: null, settle: 6000 },
  { name: 'types', url: '/80cards/types.html', waitFor: null, settle: 1500 },
  { name: 'compatibility', url: '/80cards/compatibility.html', waitFor: null, settle: 1500 },
  { name: 'share-acaa', url: '/80cards/share/acaa/index.html', waitFor: null, settle: 1500 },
];

const server = await startServer();
fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();

let captured = 0;
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'ja-JP',
  });
  for (const pg of PAGES) {
    const page = await context.newPage();
    try {
      await page.goto(`http://localhost:${PORT}${pg.url}`, { waitUntil: 'load', timeout: 60000 });
      if (pg.waitFor) {
        await page.waitForSelector(pg.waitFor, { timeout: 30000 }).catch(() => {
          console.warn(`  [警告] ${pg.name}: セレクタ ${pg.waitFor} が見つからないまま撮影します`);
        });
      }
      await page.waitForTimeout(pg.settle);
      const file = path.join(OUT_DIR, `${pg.name}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`OK ${pg.name}-${vp.name}.png`);
      captured++;
    } catch (e) {
      console.error(`NG ${pg.name}-${vp.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
  await context.close();
}

await browser.close();
server.close();
console.log(`${captured}/${VIEWPORTS.length * PAGES.length} 枚を ${OUT_DIR} に保存しました`);
