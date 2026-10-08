// 80CARDS 招待URL（相性リンク）の検査
//
// 使い方: node check-match-invite.mjs
//   1. 招待URLの形: https://www.personal-file.jp/80cards/?match=<従来どおりの値>&utm_source=80cards&utm_medium=<経路>&utm_campaign=match
//      ・?match= の値は、従来の encodeMatchData() の出力そのまま（形式を変えていない）
//      ・16タイプ × 5行動類型 × 4経路（invite_line / invite_x / invite_copy / invite_pair）のすべてで、
//        URLSearchParams で読み戻した match が decodeMatchData() で元の {typeCode, behaviorCode} に戻る（base64 の記号が欠けない）
//      ・utm は3つ（utm_source / utm_medium / utm_campaign）だけが付く
//   2. 経路名が決めた4つで、設計書どおり invite_line / invite_x / invite_copy を含む
//   3. 招待文面に URL が含まれず（URL は別パラメータで渡す）、80CODE とあだ名が入る
import { loadDiagnosisLogic } from './extract-logic.mjs';

const { INVITE_MEDIUMS, buildInviteUrl, buildInviteMessage, encodeMatchData, decodeMatchData, get80Code, TYPE_NICKNAMES, getMatchBehaviorName } = loadDiagnosisLogic();

const failures = [];
const fail = (m) => failures.push(m);

const TYPE_CODES = ['PP', 'PA', 'PI', 'PD', 'AP', 'AA', 'AI', 'AD', 'IP', 'IA', 'II', 'ID', 'DP', 'DA', 'DI', 'DD'];
const BEHAVIOR_CODES = ['K', 'H', 'J', 'G', 'E'];   // ResultScreen80 が渡す behavioralType.code（達成・調和・情報・演出・効率）
const EXPECTED_MEDIUMS = { line: 'invite_line', x: 'invite_x', copy: 'invite_copy', pair: 'invite_pair' };

if (JSON.stringify(INVITE_MEDIUMS) !== JSON.stringify(EXPECTED_MEDIUMS)) fail(`INVITE_MEDIUMS が想定と違います: ${JSON.stringify(INVITE_MEDIUMS)}`);

let n = 0;
for (const t of TYPE_CODES) {
  for (const b of BEHAVIOR_CODES) {
    for (const medium of Object.values(EXPECTED_MEDIUMS)) {
      n += 1;
      const url = buildInviteUrl(t, b, medium);
      const u = new URL(url);
      const id = `${t}/${b}/${medium}`;
      if (u.origin + u.pathname !== 'https://www.personal-file.jp/80cards/') fail(`${id}: 宛先が違います ${u.origin}${u.pathname}`);
      if (!url.startsWith(`https://www.personal-file.jp/80cards/?match=${encodeMatchData(t, b)}&`)) fail(`${id}: ?match= の形式が従来と違います ${url}`);
      const keys = [...u.searchParams.keys()].sort().join(',');
      if (keys !== 'match,utm_campaign,utm_medium,utm_source') fail(`${id}: パラメータが想定と違います ${keys}`);
      if (u.searchParams.get('utm_source') !== '80cards') fail(`${id}: utm_source が80cardsではありません`);
      if (u.searchParams.get('utm_medium') !== medium) fail(`${id}: utm_medium が違います ${u.searchParams.get('utm_medium')}`);
      if (u.searchParams.get('utm_campaign') !== 'match') fail(`${id}: utm_campaign がmatchではありません`);
      const back = decodeMatchData(u.searchParams.get('match'));
      if (!back || back.typeCode !== t || back.behaviorCode !== b) fail(`${id}: ?match= を読み戻せません ${JSON.stringify(back)}`);
      if (!getMatchBehaviorName(back && back.behaviorCode)) fail(`${id}: 行動類型の名前に戻せません`);
    }
  }
}

const msg = buildInviteMessage(get80Code('達成型', 'PP'), TYPE_NICKNAMES.PP);
if (!msg.includes('ACPP') || !msg.includes(TYPE_NICKNAMES.PP)) fail(`招待文面に80CODEとあだ名が入っていません: ${msg}`);
if (/https?:\/\//.test(msg)) fail('招待文面にURLが入っています（URLは別パラメータで渡します）');

if (failures.length) {
  console.error(`FAIL: ${failures.length}件`);
  failures.slice(0, 40).forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
console.log(`PASS: 招待URL ${n}通り（16タイプ × 5行動類型 × 4経路）で、?match= の形式が従来どおり・utmの3つだけが付く・読み戻せる`);
