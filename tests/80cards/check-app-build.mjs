import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { APP_PATH, SOURCE_PATH, buildAppCode } from './build-app.mjs';

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

export function assertAppBuildInSync() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), '80cards-app-build-'));
  const tempAppPath = path.join(tempDir, 'app.js');

  let expected;
  try {
    fs.writeFileSync(tempAppPath, buildAppCode(), 'utf8');
    expected = fs.readFileSync(tempAppPath, 'utf8');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const actual = fs.readFileSync(APP_PATH, 'utf8');
  const comparableActual = normalizeLineEndings(actual);
  const comparableExpected = normalizeLineEndings(expected);
  if (comparableActual === comparableExpected) {
    console.log('PASS: 80cards/app.js is in sync with 80cards/src/app.jsx');
    return;
  }

  let index = 0;
  while (index < comparableActual.length && index < comparableExpected.length && comparableActual[index] === comparableExpected[index]) {
    index += 1;
  }

  const contextStart = Math.max(0, index - 80);
  const contextEnd = index + 160;
  const message = [
    'FAIL: 80cards/app.js is out of sync with 80cards/src/app.jsx',
    'Regenerate with: cd tests/80cards && node build-app.mjs',
    `Source: ${path.relative(process.cwd(), SOURCE_PATH)}`,
    `Generated file: ${path.relative(process.cwd(), APP_PATH)}`,
    `First difference at byte/char offset: ${index}`,
    '--- expected regenerated snippet ---',
    comparableExpected.slice(contextStart, contextEnd),
    '--- actual committed snippet ---',
    comparableActual.slice(contextStart, contextEnd),
  ].join('\n');

  throw new Error(message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertAppBuildInSync();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
