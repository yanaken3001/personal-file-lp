// 80cards/index.html から診断ロジックを「無改変のまま」抽出して実行するローダー。
// 本体の <script type="text/babel"> 全体を Babel でトランスパイルし、
// ブラウザAPIをスタブした Node の vm サンドボックスで評価して関数群を回収する。
// 本体コードには一切手を入れない（リグレッション検知の前提）。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_JS = path.resolve(__dirname, '../../80cards/app.js');

// テストから参照する公開シンボル。index.html 側の名前と1:1。
const EXPORT_NAMES = [
  'QUESTIONS_80', 'QUESTION_ORDER', 'QUESTION_MAP', 'ORDERED_QUESTIONS',
  'BASE_TOTAL_QUESTIONS', 'TOTAL_QUESTIONS',
  'PERSONALITY_TIE_THRESHOLD', 'BEHAVIOR_TIE_THRESHOLD', 'MAX_ADAPTIVE_QUESTIONS',
  'PERSONALITY_TIE_ITEMS', 'BEHAVIOR_TIE_ITEMS',
  'TYPES_80', 'TYPE_NICKNAMES', 'BEHAVIOR_CODE_PREFIX', 'LEGACY_SHARE_PREFIX',
  'BEHAVIOR_PREFIX_TO_NAME',
  'determinePersonalityType', 'determineBehavioralType',
  'getRankedPersonalityAxes', 'getRankedBehaviorAxes',
  'createTieBreakQuestions', 'buildAdaptiveQuestions',
  'createEmptyScoreDelta', 'getScoredValue', 'getQuestionScoreDelta', 'applyQuestionScore',
  'get80Code', 'getPatternNo',
  'encodeMatchData', 'decodeMatchData',
];

function makeSandbox() {
  const noop = () => {};
  const fakeEl = () => ({
    setAttribute: noop, getAttribute: () => null, appendChild: noop,
    addEventListener: noop, removeEventListener: noop,
    style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getContext: () => null,
  });
  const documentStub = {
    referrer: '',
    title: '80CARDS',
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    addEventListener: noop, removeEventListener: noop,
    head: { appendChild: noop },
    body: fakeEl(),
    documentElement: fakeEl(),
  };
  const windowStub = {
    location: { search: '', hostname: 'localhost', protocol: 'http:', pathname: '/80cards/index.html', origin: 'http://localhost', href: 'http://localhost/80cards/index.html' },
    innerWidth: 375, innerHeight: 812,
    addEventListener: noop, removeEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    scrollTo: noop,
    open: noop,
    requestAnimationFrame: (cb) => 0,
    cancelAnimationFrame: noop,
    setTimeout: () => 0, clearTimeout: noop,
    setInterval: () => 0, clearInterval: noop,
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    document: documentStub,
    history: { pushState: noop, replaceState: noop },
    navigator: { clipboard: { writeText: () => Promise.resolve() }, share: undefined, userAgent: 'test' },
    gtag: noop, fbq: noop, dataLayer: [],
  };
  windowStub.self = windowStub;
  windowStub.top = windowStub;
  windowStub.parent = windowStub;

  const ReactStub = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'createElement') return () => null;
      if (prop === 'Fragment') return Symbol('Fragment');
      // useState/useEffect/useRef/useMemo/useCallback... はコンポーネント実行時のみ呼ばれるが念のため
      return () => [undefined, noop];
    },
  });
  const ReactDOMStub = { createRoot: () => ({ render: noop }), render: noop };

  const sandbox = {
    window: windowStub,
    document: documentStub,
    navigator: windowStub.navigator,
    location: windowStub.location,
    sessionStorage: windowStub.sessionStorage,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    React: ReactStub,
    ReactDOM: ReactDOMStub,
    html2canvas: undefined,
    URLSearchParams, URL, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Promise, Symbol, Map, Set,
    setTimeout: windowStub.setTimeout, clearTimeout: noop,
    setInterval: windowStub.setInterval, clearInterval: noop,
    requestAnimationFrame: windowStub.requestAnimationFrame,
    cancelAnimationFrame: noop,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    Image: class { constructor() { this.onload = null; } set src(_v) {} },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    console,
    gtag: noop, fbq: noop,
  };
  sandbox.globalThis = sandbox;
  return sandbox;
}

export function loadDiagnosisLogic() {
  const appCode = fs.readFileSync(APP_JS, 'utf8');

  const collector = `\n;globalThis.__TEST_API__ = { ${EXPORT_NAMES
    .map((n) => `${n}: (typeof ${n} !== 'undefined' ? ${n} : undefined)`)
    .join(', ')} };\n`;

  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  vm.runInContext(appCode + collector, sandbox, { filename: '80cards/app.js', timeout: 30000 });

  const api = sandbox.__TEST_API__;
  const missing = EXPORT_NAMES.filter((n) => api[n] === undefined);
  if (missing.length > 0) {
    throw new Error(`抽出に失敗したシンボル: ${missing.join(', ')}`);
  }
  return api;
}
