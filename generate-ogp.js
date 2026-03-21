const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 630 });
  
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&family=Roboto:wght@900&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 1200px;
          height: 630px;
          background-color: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        /* Blue Crosshairs */
        .h-line {
          position: absolute;
          top: 360px; /* Below the center of 80 */
          left: 0;
          width: 100%;
          height: 1px;
          background-color: #0055FF;
          z-index: 1;
        }
        .v-line {
          position: absolute;
          top: 0;
          left: 600px;
          width: 1px;
          height: 100%;
          background-color: #0055FF;
          z-index: 1;
        }
        /* Number 80 */
        .number {
          font-family: 'Roboto', sans-serif;
          font-weight: 900;
          font-size: 550px;
          color: #000000;
          line-height: 1;
          z-index: 2;
          margin-top: -60px; /* Adjust to center vertically */
          letter-spacing: -0.05em;
        }
        /* Text */
        .text {
          position: absolute;
          bottom: 80px;
          font-family: 'Noto Sans JP', sans-serif;
          font-weight: 900;
          font-size: 38px;
          color: #0055FF;
          letter-spacing: 0.1em;
          z-index: 2;
          background: #FFFFFF;
          padding: 0 40px;
        }
      </style>
    </head>
    <body>
      <div class="h-line"></div>
      <div class="v-line"></div>
      <div class="number">80</div>
      <div class="text">80タイプの才能診断</div>
    </body>
    </html>
  `;
  
  // Wait for webfonts to load
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  // Wait for fonts using evaluate
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  
  await page.screenshot({ path: path.join(__dirname, 'ogp.png') });
  
  await browser.close();
  console.log("ogp.png generated.");
})();
