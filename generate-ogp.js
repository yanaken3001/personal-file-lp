const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 630 });
  
  // Build grid cells
  let gridHtml = '';
  const contents = [
    'PP', '', '', '', '', 'DD',
    'DA', '', '', '', '', 'AI',
    'DD', '', '', '', '', 'DD',
    'AI', '', '', '', '', 'AI'
  ];
  for (let c of contents) {
    gridHtml += `<div class="grid-cell">${c}</div>`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Roboto:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 1200px;
          height: 630px;
          background-color: #0d0d0d;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Dark Grid Background */
        .grid-container {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: grid;
          grid-template-columns: repeat(6, 86px);
          grid-template-rows: repeat(4, 96px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 1;
        }
        .grid-cell {
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.06);
          font-family: 'Roboto', sans-serif;
          font-weight: 900;
          font-size: 20px;
          letter-spacing: 0.05em;
        }

        /* Gradient Glows */
        .glow-cyan {
          position: absolute;
          top: 45%;
          left: 41%;
          transform: translate(-50%, -50%);
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(0, 180, 255, 0.45) 0%, rgba(0, 180, 255, 0) 60%);
          z-index: 2;
          filter: blur(20px);
        }
        .glow-pink {
          position: absolute;
          top: 45%;
          left: 59%;
          transform: translate(-50%, -50%);
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(255, 60, 100, 0.45) 0%, rgba(255, 60, 100, 0) 60%);
          z-index: 2;
          filter: blur(20px);
        }

        /* 80 Number */
        .number-container {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 3;
          font-family: 'Roboto', sans-serif;
          font-weight: 900;
          font-size: 380px;
          color: #FFFFFF;
          line-height: 1;
          display: flex;
          gap: 10px;
          letter-spacing: -0.02em;
        }

        /* Text Elements */
        .types-text {
          position: absolute;
          top: 415px;
          width: 100%;
          text-align: center;
          font-family: 'Roboto', sans-serif;
          font-weight: 900;
          font-size: 44px;
          color: #FFFFFF;
          letter-spacing: 0.6em;
          padding-left: 0.6em;
          z-index: 4;
          text-shadow: 0 0 10px rgba(255,255,255,0.2);
        }

        .sub-text {
          position: absolute;
          top: 485px;
          width: 100%;
          text-align: center;
          font-family: 'Noto Sans JP', sans-serif;
          font-weight: 400;
          font-size: 32px;
          color: #666666;
          letter-spacing: 0.15em;
          z-index: 4;
        }

        .bottom-text {
          position: absolute;
          bottom: 35px;
          width: 100%;
          text-align: center;
          font-family: 'Roboto', sans-serif;
          font-weight: 400;
          font-size: 14px;
          color: #333333;
          letter-spacing: 0.6em;
          padding-left: 0.6em;
          z-index: 4;
        }
      </style>
    </head>
    <body>
      <div class="grid-container">
        ${gridHtml}
      </div>
      
      <div class="glow-cyan"></div>
      <div class="glow-pink"></div>
      
      <div class="number-container">
        <span class="eight">8</span>
        <span class="zero">0</span>
      </div>
      
      <div class="types-text">TYPES</div>
      <div class="sub-text">才能診断</div>
      <div class="bottom-text">PERSONAL FILE</div>
    </body>
    </html>
  `;
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  
  await page.screenshot({ path: path.join(__dirname, 'ogp.png') });
  
  await browser.close();
  console.log("ogp.png generated.");
})();
