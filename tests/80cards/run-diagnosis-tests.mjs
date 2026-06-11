// 80CARDS 診断ロジック golden file テスト
//
// 使い方:
//   node run-diagnosis-tests.mjs            ... golden/diagnosis-golden.json と比較（CI/リグレッション用）
//   node run-diagnosis-tests.mjs --update   ... 現在の挙動を golden として記録し直す（意図的な仕様変更時のみ）
//
// カバレッジ:
//   [flow]     全80タイプ（16基本タイプ×5行動類型）を実際の回答フロー
//              （ORDERED_QUESTIONS 順に applyQuestionScore → buildAdaptiveQuestions → アダプティブ回答）で再現
//   [flow]     全問「3」回答、アダプティブ最大8問発動、アダプティブ中の回答パターン別
//   [unit]     同点・境界値（独走判定12/11、personality tie 2/3、behavior tie 1/2、
//              全軸同点、性格主軸マッチ優先、固定優先度フォールバック）
//   [mapping]  TYPES_80 全80キーの整合、80CODEプレフィックス表、あだ名表
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAppBuildInSync } from './check-app-build.mjs';
import { loadDiagnosisLogic } from './extract-logic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.resolve(__dirname, 'golden/diagnosis-golden.json');
const UPDATE = process.argv.includes('--update');

assertAppBuildInSync();
const api = loadDiagnosisLogic();
const {
  ORDERED_QUESTIONS, BASE_TOTAL_QUESTIONS,
  PERSONALITY_TIE_THRESHOLD, BEHAVIOR_TIE_THRESHOLD, MAX_ADAPTIVE_QUESTIONS,
  TYPES_80, TYPE_NICKNAMES, BEHAVIOR_CODE_PREFIX,
  determinePersonalityType, determineBehavioralType, buildAdaptiveQuestions,
  applyQuestionScore, createEmptyScoreDelta, get80Code, getPatternNo,
} = api;

const PERSONALITY_AXES = ['P', 'A', 'I', 'D'];
const BEHAVIOR_AXES = { K: '達成型', H: '調和型', J: '情報型', G: '演出型', E: '効率型' };
const ALL_TYPE_CODES = ['PP', 'PA', 'PI', 'PD', 'AP', 'AA', 'AI', 'AD', 'IP', 'IA', 'II', 'ID', 'DP', 'DA', 'DI', 'DD'];

// ---------------------------------------------------------------------------
// 回答フローシミュレータ（アプリの handleAnswer 相当: 加算のみの順方向再現）
// answerForQuestion(question, phase) が rawValue(1-5) を返す。
// 57問回答後に buildAdaptiveQuestions を実行し、アダプティブ問にも回答する。
// ---------------------------------------------------------------------------
function simulateFlow(answerForQuestion) {
  let scores = createEmptyScoreDelta();
  const baseAnswers = [];
  for (const q of ORDERED_QUESTIONS) {
    const raw = answerForQuestion(q, 'base');
    baseAnswers.push({ id: q.id, raw });
    scores = applyQuestionScore(scores, q, raw);
  }
  const adaptiveQuestions = buildAdaptiveQuestions(scores);
  const adaptiveAnswers = [];
  for (const q of adaptiveQuestions) {
    const raw = answerForQuestion(q, 'adaptive');
    adaptiveAnswers.push({ id: q.id, raw });
    scores = applyQuestionScore(scores, q, raw);
  }
  const personalityCode = determinePersonalityType(scores);
  const behavior = determineBehavioralType(scores, personalityCode);
  const code80 = get80Code(behavior.name, personalityCode);
  const typeKey = behavior.name + (TYPE_NICKNAMES[personalityCode] || '');
  return {
    scores,
    adaptiveQuestionIds: adaptiveQuestions.map((q) => q.id),
    personalityCode,
    behaviorName: behavior.name,
    behaviorCode: behavior.code,
    code80,
    shareCode: code80.toLowerCase(),
    patternNo: getPatternNo(behavior.name, personalityCode),
    nickname: TYPE_NICKNAMES[personalityCode],
    typeKeyExistsInTypes80: Object.prototype.hasOwnProperty.call(TYPES_80, typeKey),
    baseAnswers,
    adaptiveAnswers,
  };
}

// 軸ごとの定型回答: 対象軸の質問に target、それ以外に other を返す（reverse は実効値が合うよう反転）
function axisAnswerer(highAxes, midAxes = []) {
  return (q) => {
    let effective; // 反転処理前の「効かせたい」スコア値
    if (q.scoring === 'pair') {
      // アダプティブ問: agreeAxis が high なら 5、disagree が high なら 1、どちらでもなければ 3
      if (highAxes.includes(q.agreeAxis)) effective = 5;
      else if (highAxes.includes(q.disagreeAxis)) effective = 1;
      else effective = 3;
      return effective; // pair 問に reverse はない
    }
    if (highAxes.includes(q.axis)) effective = 5;
    else if (midAxes.includes(q.axis)) effective = 4;
    else effective = 1;
    return q.reverse ? 6 - effective : effective;
  };
}

// ---------------------------------------------------------------------------
// [flow] ケース生成
// ---------------------------------------------------------------------------
const flowCases = [];

// 1) 全80タイプ網羅
for (const typeCode of ALL_TYPE_CODES) {
  for (const [bAxis, bName] of Object.entries(BEHAVIOR_AXES)) {
    const [first, second] = [typeCode[0], typeCode[1]];
    const highAxes = first === second ? [first, bAxis] : [first, bAxis];
    const midAxes = first === second ? [] : [second];
    flowCases.push({
      name: `type-coverage/${bName}-${typeCode}`,
      answerer: axisAnswerer(highAxes, midAxes),
    });
  }
}

// 2) エッジケース
flowCases.push({ name: 'edge/all-3', answerer: () => 3 });
flowCases.push({ name: 'edge/all-5', answerer: () => 5 });
flowCases.push({ name: 'edge/all-1', answerer: () => 1 });
// 全問3だがアダプティブで agreeAxis に全振り（タイブレークが効くことの記録）
flowCases.push({
  name: 'edge/all-3-adaptive-agree-first',
  answerer: (q, phase) => (phase === 'adaptive' ? 5 : 3),
});
flowCases.push({
  name: 'edge/all-3-adaptive-agree-second',
  answerer: (q, phase) => (phase === 'adaptive' ? 1 : 3),
});

// ---------------------------------------------------------------------------
// [unit] 同点・境界値ケース（score オブジェクト直接入力）
// ---------------------------------------------------------------------------
const unitCases = [
  { name: 'boundary/personality-gap-12-solo', scores: { D: 40, P: 28, A: 8, I: 8, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'boundary/personality-gap-11-pair', scores: { D: 40, P: 29, A: 8, I: 8, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'tie/personality-all-equal', scores: { D: 24, P: 24, A: 24, I: 24, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'tie/personality-A-vs-I-equal', scores: { D: 8, P: 8, A: 30, I: 30, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'tie/behavior-all-equal-P-main', scores: { P: 40, A: 8, I: 8, D: 8, K: 15, H: 15, J: 15, G: 15, E: 15 } },
  { name: 'tie/behavior-all-equal-A-main', scores: { A: 40, P: 8, I: 8, D: 8, K: 15, H: 15, J: 15, G: 15, E: 15 } },
  { name: 'tie/behavior-all-equal-I-main', scores: { I: 40, P: 8, A: 8, D: 8, K: 15, H: 15, J: 15, G: 15, E: 15 } },
  { name: 'tie/behavior-all-equal-D-main', scores: { D: 40, P: 8, A: 8, I: 8, K: 15, H: 15, J: 15, G: 15, E: 15 } },
  // A主軸・preferred=J が同点グループ外（K=H 同点、J は低い）→ 固定優先度 K
  { name: 'tie/behavior-KH-equal-A-main-preferred-not-in-tie', scores: { A: 40, P: 8, I: 8, D: 8, K: 20, H: 20, J: 5, G: 5, E: 5 } },
  // A主軸・preferred=J が同点グループ内（J=E 同点）→ J 優先
  { name: 'tie/behavior-JE-equal-A-main-preferred-in-tie', scores: { A: 40, P: 8, I: 8, D: 8, K: 5, H: 5, J: 20, G: 5, E: 20 } },
  { name: 'adaptive/personality-gap-2-triggers', scores: { D: 30, P: 28, A: 8, I: 8, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'adaptive/personality-gap-3-no-trigger', scores: { D: 30, P: 27, A: 8, I: 8, K: 25, H: 5, J: 5, G: 5, E: 5 } },
  { name: 'adaptive/behavior-gap-1-triggers', scores: { D: 40, P: 8, A: 8, I: 8, K: 20, H: 19, J: 5, G: 5, E: 5 } },
  { name: 'adaptive/behavior-gap-2-no-trigger', scores: { D: 40, P: 8, A: 8, I: 8, K: 20, H: 18, J: 5, G: 5, E: 5 } },
  { name: 'adaptive/both-trigger-max-8', scores: { D: 24, P: 24, A: 8, I: 8, K: 15, H: 15, J: 5, G: 5, E: 5 } },
  { name: 'edge/all-zero', scores: { P: 0, A: 0, I: 0, D: 0, K: 0, H: 0, J: 0, G: 0, E: 0 } },
];

function runUnitCase(scores) {
  const personalityCode = determinePersonalityType(scores);
  const behavior = determineBehavioralType(scores, personalityCode);
  const adaptive = buildAdaptiveQuestions(scores);
  return {
    personalityCode,
    behaviorName: behavior.name,
    behaviorCode: behavior.code,
    code80: get80Code(behavior.name, personalityCode),
    patternNo: getPatternNo(behavior.name, personalityCode),
    adaptiveCount: adaptive.length,
    adaptiveQuestionIds: adaptive.map((q) => q.id),
  };
}

// ---------------------------------------------------------------------------
// [mapping] 静的整合チェック
// ---------------------------------------------------------------------------
function buildMappingSnapshot() {
  const types80Keys = Object.keys(TYPES_80).sort();
  const expectedKeys = [];
  for (const bName of Object.values(BEHAVIOR_AXES)) {
    for (const code of ALL_TYPE_CODES) {
      expectedKeys.push(bName + TYPE_NICKNAMES[code]);
    }
  }
  const missingKeys = expectedKeys.filter((k) => !types80Keys.includes(k));
  return {
    constants: {
      BASE_TOTAL_QUESTIONS,
      PERSONALITY_TIE_THRESHOLD,
      BEHAVIOR_TIE_THRESHOLD,
      MAX_ADAPTIVE_QUESTIONS,
      orderedQuestionCount: ORDERED_QUESTIONS.length,
    },
    BEHAVIOR_CODE_PREFIX,
    TYPE_NICKNAMES,
    types80KeyCount: types80Keys.length,
    missingTypes80Keys: missingKeys,
    questionAxisCounts: ORDERED_QUESTIONS.reduce((acc, q) => {
      acc[q.axis] = (acc[q.axis] || 0) + 1;
      return acc;
    }, {}),
    reverseQuestionIds: ORDERED_QUESTIONS.filter((q) => q.reverse).map((q) => q.id).sort(),
  };
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------
const snapshot = {
  _meta: {
    description: '80CARDS 診断ロジック golden snapshot。差分が出たら判定ロジックの挙動が変わっている。',
    sourceFile: '80cards/index.html',
  },
  mapping: buildMappingSnapshot(),
  unit: Object.fromEntries(unitCases.map((c) => [c.name, runUnitCase(c.scores)])),
  flow: Object.fromEntries(
    flowCases.map((c) => {
      const r = simulateFlow(c.answerer);
      // golden には判定に効く要素のみ保存（回答ベクトルは再現用に保持）
      return [c.name, {
        scores: r.scores,
        adaptiveQuestionIds: r.adaptiveQuestionIds,
        personalityCode: r.personalityCode,
        behaviorName: r.behaviorName,
        code80: r.code80,
        shareCode: r.shareCode,
        patternNo: r.patternNo,
        nickname: r.nickname,
        typeKeyExistsInTypes80: r.typeKeyExistsInTypes80,
      }];
    })
  ),
};

// 80タイプ網羅の自己検証: type-coverage ケースが意図した80通りのcode80を生成しているか
const coverageCodes = new Set(
  Object.entries(snapshot.flow)
    .filter(([k]) => k.startsWith('type-coverage/'))
    .map(([, v]) => v.code80)
);
if (coverageCodes.size !== 80) {
  console.error(`[警告] type-coverage が ${coverageCodes.size}/80 種類しか生成していません`);
}
const unknownTypeKeys = Object.entries(snapshot.flow).filter(([, v]) => !v.typeKeyExistsInTypes80);
if (unknownTypeKeys.length > 0) {
  console.error(`[警告] TYPES_80 にキーが存在しない結果: ${unknownTypeKeys.map(([k]) => k).join(', ')}`);
}

const json = JSON.stringify(snapshot, null, 2);

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

if (UPDATE) {
  fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
  fs.writeFileSync(GOLDEN_PATH, json);
  console.log(`golden を更新しました: ${GOLDEN_PATH}`);
  console.log(`  flow ${Object.keys(snapshot.flow).length}件 / unit ${Object.keys(snapshot.unit).length}件 / 80タイプ網羅 ${coverageCodes.size}/80`);
  process.exit(0);
}

if (!fs.existsSync(GOLDEN_PATH)) {
  console.error('golden ファイルがありません。先に --update で生成してください。');
  process.exit(1);
}

const golden = fs.readFileSync(GOLDEN_PATH, 'utf8');
if (normalizeLineEndings(golden) === normalizeLineEndings(json)) {
  console.log(`PASS: 診断ロジックは golden と完全一致（flow ${Object.keys(snapshot.flow).length}件 / unit ${Object.keys(snapshot.unit).length}件 / 80タイプ網羅 ${coverageCodes.size}/80）`);
  process.exit(0);
}

// 差分箇所の特定
const goldenObj = JSON.parse(golden);
const diffs = [];
function deepDiff(a, b, prefix) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    diffs.push(`${prefix}: golden=${JSON.stringify(a)} → current=${JSON.stringify(b)}`);
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) deepDiff(a[k], b[k], `${prefix}.${k}`);
}
deepDiff(goldenObj, snapshot, '');
console.error(`FAIL: 診断ロジックの挙動が golden と一致しません（差分 ${diffs.length}件）`);
for (const d of diffs.slice(0, 50)) console.error('  ' + d);
if (diffs.length > 50) console.error(`  ... 他 ${diffs.length - 50}件`);
process.exit(1);
