const path = require('node:path');
const puppeteer = require('puppeteer');

async function main() {
  const root = path.resolve(__dirname, '..');
  const htmlPath = path.join(root, 'docs', '80cards_light_report_sample_eap.html');
  const pdfPath = path.join(root, 'docs', '80cards_light_report_sample_eap.pdf');
  const previewPath = path.join(root, 'docs', '80cards_light_report_sample_eap_page1.png');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 842, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  await page.screenshot({
    path: previewPath,
    fullPage: false,
    type: 'png',
  });
  await browser.close();
  console.log(pdfPath);
  console.log(previewPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
