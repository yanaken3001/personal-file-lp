const DEFAULT_TO = 'register@per-sonal.co.jp';
const DEFAULT_FROM = 'パーソナルファイル事務局 <noreply@per-sonal.co.jp>';

const EMPLOYMENT_STATUS = {
  2: '在職中',
  3: '離職中 ※現在アルバイト・派遣を含む',
  4: '在学中',
};

const EMPLOYMENT_TIMEFRAME = {
  1: 'できるだけ早く',
  2: '1～3ヶ月以内',
  3: '3～6か月以内',
  4: '相談したい',
  5: '6ヶ月以上先',
};

const WORK_LOCATION = {
  1: '北海道（札幌）',
  4: '宮城県',
  11: '埼玉県',
  12: '千葉県',
  13: '東京都',
  14: '神奈川県',
  23: '愛知県',
  27: '大阪府',
  34: '広島県',
  40: '福岡県',
};

const EDUCATION = {
  1: '中卒',
  2: '高卒',
  3: '専門卒',
  4: '高専卒',
  5: '短大卒',
  6: '大卒',
  7: '大学院卒',
  8: 'その他',
};

const OTHER_FLAGS = {
  1: '体調面で不安がある',
  2: '外国籍である',
  3: '上記に該当するものはない',
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item, 50)).filter(Boolean);
}

function pickLabel(map, value) {
  const key = normalizeText(value, 20);
  return map[key] || key || '-';
}

function formatOtherFlags(values) {
  const items = normalizeArray(values).map((value) => OTHER_FLAGS[value] || value);
  return items.length ? items.join('、') : '-';
}

function escapeHtml(value) {
  return normalizeText(value, 2000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (!origin) return true;

  try {
    const { hostname } = new URL(origin);
    return [
      'www.personal-file.jp',
      'personal-file.jp',
      'localhost',
      '127.0.0.1',
    ].includes(hostname);
  } catch (error) {
    return false;
  }
}

function buildRows(payload) {
  const lead = payload.lead || {};
  const result = payload.result || {};
  const marketing = payload.marketing_params || {};
  const fullName = `${normalizeText(lead.last_name, 80)} ${normalizeText(lead.first_name, 80)}`.trim();
  const fullNameKana = `${normalizeText(lead.last_name_kana, 80)} ${normalizeText(lead.first_name_kana, 80)}`.trim();

  return [
    ['通知種別', '80CARDS診断結果つき登録通知'],
    ['登録日時', normalizeText(payload.submitted_at, 80) || '-'],
    ['user_id', normalizeText(payload.user_id, 80) || '-'],
    ['lead_event_id', normalizeText(payload.lead_event_id, 120) || '-'],
    ['route', normalizeText(payload.route, 120) || '-'],
    ['氏名', fullName || '-'],
    ['氏名かな', fullNameKana || '-'],
    ['メールアドレス', normalizeText(lead.email, 160) || '-'],
    ['電話番号', normalizeText(lead.tel, 80) || '-'],
    ['誕生日', normalizeText(lead.birthday, 80) || '-'],
    ['就業状況', pickLabel(EMPLOYMENT_STATUS, lead.employment_status)],
    ['希望の就職時期', pickLabel(EMPLOYMENT_TIMEFRAME, lead.desired_employment_timeframe)],
    ['希望の勤務地', pickLabel(WORK_LOCATION, lead.desired_work_location)],
    ['最終学歴', pickLabel(EDUCATION, lead.last_educational_background)],
    ['その他', formatOtherFlags(lead.others)],
    ['80CODE', normalizeText(result.type_code, 80) || '-'],
    ['16タイプ', normalizeText(result.type16_code, 80) || '-'],
    ['タイプ名', normalizeText(result.type_name, 120) || '-'],
    ['行動類型', normalizeText(result.behavior_type, 120) || '-'],
    ['グループ', normalizeText(result.group_name, 120) || '-'],
    ['utm_source', normalizeText(marketing.utm_source, 120) || '-'],
    ['utm_medium', normalizeText(marketing.utm_medium, 120) || '-'],
    ['utm_campaign', normalizeText(marketing.utm_campaign, 160) || '-'],
    ['fbclid', normalizeText(marketing.fbclid, 240) || '-'],
  ];
}

function buildText(rows) {
  const lines = [
    '80CARDS経由の登録がありました。',
    '通常の登録通知メールと照合するための、80CARDS専用の別通知です。',
    '',
  ];
  rows.forEach(([label, value]) => lines.push(`${label}：${value}`));
  return lines.join('\n');
}

function buildHtml(rows) {
  const bodyRows = rows.map(([label, value]) => (
    `<tr><th style="text-align:left;padding:8px 10px;border:1px solid #e8e4ef;background:#f7f3ff;width:150px;">${escapeHtml(label)}</th><td style="padding:8px 10px;border:1px solid #e8e4ef;">${escapeHtml(value)}</td></tr>`
  )).join('');

  return `<!doctype html>
<html lang="ja">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP','Segoe UI',sans-serif;color:#1c1b22;line-height:1.7;">
  <p>80CARDS経由の登録がありました。</p>
  <p>通常の登録通知メールと照合するための、80CARDS専用の別通知です。</p>
  <table style="border-collapse:collapse;font-size:14px;">${bodyRows}</table>
</body>
</html>`;
}

async function sendWithResend({ to, from, subject, text, html, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { skipped: true, reason: 'RESEND_API_KEY is not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend API failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
  }

  if (!isAllowedOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: 'Forbidden' });
  }

  try {
    const payload = await readBody(req);
    if (payload.notification_type !== '80cards_result_registration') {
      return sendJson(res, 400, { ok: false, error: 'Invalid notification type' });
    }

    const rows = buildRows(payload);
    const result = payload.result || {};
    const lead = payload.lead || {};
    const subjectParts = [
      '【80CARDS診断結果】',
      normalizeText(result.type_code, 40) || '80CODE未取得',
      normalizeText(result.type_name, 80) || 'タイプ名未取得',
      `${normalizeText(lead.last_name, 60)} ${normalizeText(lead.first_name, 60)}`.trim() || '氏名未取得',
    ];
    const subject = subjectParts.join(' / ');
    const idempotencyKey = normalizeText(payload.lead_event_id, 120) || `80cards-${Date.now()}`;

    const sent = await sendWithResend({
      to: process.env.PF80CARDS_NOTIFY_TO || DEFAULT_TO,
      from: process.env.PF80CARDS_NOTIFY_FROM || DEFAULT_FROM,
      subject,
      text: buildText(rows),
      html: buildHtml(rows),
      idempotencyKey,
    });

    return sendJson(res, 200, { ok: true, skipped: Boolean(sent.skipped) });
  } catch (error) {
    console.error('80CARDS result notification failed', error.message);
    return sendJson(res, 500, { ok: false, error: 'Notification failed' });
  }
};
