import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from '@babel/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

export const SOURCE_PATH = path.resolve(REPO_ROOT, '80cards/src/app.jsx');
export const APP_PATH = path.resolve(REPO_ROOT, '80cards/app.js');

const HEADER = `/*
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Source: 80cards/src/app.jsx
 * Regenerate: cd tests/80cards && node build-app.mjs
 */
`;

export function buildAppCode() {
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const { code } = transformSync(source, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    compact: false,
    comments: true,
    sourceType: 'script',
  });
  return HEADER + code.replace(/\s*$/, '\n');
}

export function writeApp() {
  fs.writeFileSync(APP_PATH, buildAppCode(), 'utf8');
  return APP_PATH;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const appPath = writeApp();
  console.log(`generated ${path.relative(REPO_ROOT, appPath)}`);
}
