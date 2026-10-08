// 相性ペア画像の検査・見本づくりで共有する、ローカルの静的サーバーと読み込み用ページ（127.0.0.1 のみ。GA4・Meta は読み込まない）
//
// 実フォント（Noto Sans JP / Inter）は Google Fonts から読み込むため、接続できる環境でのみ動く。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');

const HARNESS = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Noto+Sans+JP:wght@500;700;900&display=swap" rel="stylesheet">
<script src="/80cards/share-image.js"></script></head><body></body></html>`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };

export async function startHarness(port) {
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
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${port}/__harness.html`, close: () => server.close() };
}
