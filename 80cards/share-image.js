/*
 * 80CARDS 結果画像の生成（canvas）
 *
 * 結果画面の表示後に動的読み込みされ、9:16（1080x1920）と 1:1（1080x1080）の
 * JPEG を端末内で作る。サーバーへは何も送らない。
 *
 * 設計書: 08_80CARDS拡散/01_改修設計書_v1.md 1節・2節
 * 呼び出し: window.PF80ShareImage.generate({ behaviorPrefix, behaviorName, typeCode, nickname, summary, rarityTier, rarityLabel })
 *          window.PF80ShareImage.generatePair({ a:{behaviorPrefix,typeCode,nickname}, b:{同左}, score, label })  ← 相性ペア画像（P2）
 * 戻り値の imageStatus: 'ready' / 'ready_font_timeout' / 'ready_font_missing' / 'ready_char_missing' とその組み合わせ
 *   （GA4 の image_status にそのまま送る。画像は作れたが品質が落ちた理由を区別するため）
 * 後始末: 不要になった結果は PF80ShareImage.release(result) で Object URL を解放する
 *
 * 一言（summary）は 80CODE ごとに文節で分割した固定データ（PHRASES）で折り返す。
 * 元データは TYPES_80[...].summary。BudouX 0.9.3 の出力を人が直したもの。
 * tests/80cards/check-share-image.mjs が、summary との一致を全80件で検査する。
 */
(function (root) {
  'use strict';

  var VERSION = '20261008e';          // このスクリプト自身の版（app.jsx の読み込み URL と揃える）
  var IMAGE_VERSION = '20261008';     // キャラ縮小画像の版（画像を差し替えたときだけ上げる）
  var JPEG_QUALITY = 0.92;
  var FONT_TIMEOUT_MS = 4000;
  var FONT_NO_FACE_GRACE_MS = 1500;   // @font-face が未登録（スタイルシート未適用）のとき、登録を待つ上限
  var IMAGE_TIMEOUT_MS = 8000;

  var GROUP = { P: '#FF3B5C', A: '#4D6CFA', I: '#00D4AA', D: '#8B5CF6' };   // 結果画面の groupColorMap と同一
  var INK = '#1A1A1A';
  var CTA_TEXT = 'あなたの80CODEは？';
  var RARITY_MAX = 4;                 // 段階の数（★の数）。段階表そのものは app.jsx の RARITY_TIER_BY_TYPE が正本
  var FONT_JP = '"Noto Sans JP","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif';
  var FONT_NUM = '"Inter","Noto Sans JP","Helvetica Neue",Arial,sans-serif';

  /* ============ 一言の文節データ（80件） ============ */
  var PHRASES = {
    ACAA: ["自分の","専門分野では","知識量で","絶対に","負けたくない","専門家"],
    ACAD: ["他人の","論理矛盾に","瞬時に","気づける","スナイパー"],
    ACAI: ["真面目で","努力家な","委員長タイプ"],
    ACAP: ["変幻自在な","表情を持つ","柔軟な","タイプ"],
    ACDA: ["誰も","敵わない","ロジックマシーン"],
    ACDD: ["誰も","止められない","行動力おばけ"],
    ACDI: ["柔軟性と","決断力を","バランスよく","持つタイプ"],
    ACDP: ["言葉の力を","駆使して","人を","動かす天性の","リーダー類型"],
    ACIA: ["真面目で","正義感が","強い","委員長タイプ"],
    ACID: ["柔軟で","迅速な","判断力を","持つタイプ"],
    ACII: ["冷静な","判断と","情熱が","あふれる","タイプ"],
    ACIP: ["真面目さと","熱意が","融合した","タイプ"],
    ACPA: ["言いたいことを","ハッキリと","言う","職人タイプ"],
    ACPD: ["何度","失敗しても","諦めない","天性の","アントレプレナー類型"],
    ACPI: ["感情が","高まると、","積極的に","行動する","タイプ"],
    ACPP: ["何度","失敗しても","折れない","スーパーポジティブ類型"],
    EFAA: ["合理的で","頭の回転が","速い","タイプ"],
    EFAD: ["何でも","効率よく","こなせる","スーパーマン"],
    EFAI: ["コツコツ積み重ねて","専門家に","なっていく","人材"],
    EFAP: ["無駄なことは","極力省いて","生きていきたい","タイプ"],
    EFDA: ["何でもできる","最強人材"],
    EFDD: ["全類型の","中で","トップクラスの","意思決定スピードを","持つ類型"],
    EFDI: ["より","効率的な","選択肢を","見つけたら","意見を","速やかに","変更できる","タイプ"],
    EFDP: ["難解な","物事を","単純化して","最速で","目標を","達成する","類型"],
    EFIA: ["効率的で","サポート力抜群の","タイプ"],
    EFID: ["深い考察により","効率的な","選択肢を","選び出すタイプ"],
    EFII: ["忠実かつ","効率的に","働く","頼れる","サポート役"],
    EFIP: ["頼りになる","事務員タイプ"],
    EFPA: ["ポジティブと","慎重と","合理主義が","同居する","不思議な","タイプ"],
    EFPD: ["難しい","課題でも","周りを","巻き込みながら","達成していく","優秀類型"],
    EFPI: ["明るく","元気で","仕事も","できる","タイプ"],
    EFPP: ["高い","コミュニケーションスキルと","効率性を","併せ持つ","類型"],
    HMAA: ["知的で","優しい","先生タイプ"],
    HMAD: ["賢く","優しい","バランスの良い","管理職"],
    HMAI: ["努力と","誠実性で","上り詰めていく","タイプ"],
    HMAP: ["感情の","浮き沈みを","ある程度","コントロールできる","タイプ"],
    HMDA: ["ロジカルかつ","人当たりも","良い","万能タイプ"],
    HMDD: ["意思決定スピードと","他人への","配慮を","両立させる","バランスの良い","類型"],
    HMDI: ["意思決定スピードが","とても","早く、","周りにも","気を使える","タイプ"],
    HMDP: ["リーダーシップと","社交性を","併せ持つ","バランスの良い","管理職類型"],
    HMIA: ["優しく","気が利く","サポート役"],
    HMID: ["周りを","気遣い、","細かく","考える","丁寧な","タイプ"],
    HMII: ["この類型の","80％は","優しさで","できている"],
    HMIP: ["一緒にいて","絶妙な","安心感を","与える","タイプ"],
    HMPA: ["他人に","合わせて","テンションを","調整できる","タイプ"],
    HMPD: ["極めて","バランスの良い","管理職類型"],
    HMPI: ["チームに","一人は","ほしい","ムードメーカー"],
    HMPP: ["社交性と","優しさを","併せ持った","管理職適任類型"],
    INAA: ["自分の","専門分野の","生き字引のような","存在"],
    INAD: ["ハマったら","とことん学ぶ","研究者タイプ"],
    INAI: ["真面目で","信頼できる","優等生"],
    INAP: ["興味あるものを","無我夢中で","探究できる","タイプ"],
    INDA: ["特定の","分野で","第一人者に","なりやすい","タイプ"],
    INDD: ["高い","学習能力と","意思決定スピードを","併せ持った","類型"],
    INDI: ["一度","決断した","ことでも","後で","よく","調べて","再確認する","タイプ"],
    INDP: ["決断力も","知性も","併せ持っている","完成度の","高いリーダー類型"],
    INIA: ["頼れる","影の支援者タイプ"],
    INID: ["情報を","集めて","深く","考えることが","好きな","タイプ"],
    INII: ["あれこれ","調べて","情報通に","なっていく","タイプ"],
    INIP: ["事務処理能力が","高い","万能型人材"],
    INPA: ["勉強熱心で","特殊な","性格を","持った","職人タイプ"],
    INPD: ["決断力も","行動力も","知性も","併せ持っている","万能型"],
    INPI: ["社交的で","知識もある","優秀類型"],
    INPP: ["社交性と","知性を","併せ持った","優れた","万能型"],
    SHAA: ["知的で","カッコイイ人が","多い","類型"],
    SHAD: ["理路整然と","意見を","言える","演説家タイプ"],
    SHAI: ["不安だからこそ","人の倍","努力する","タイプ"],
    SHAP: ["人に","弱みを","見せない","強い","ハートの持ち主"],
    SHDA: ["見た目も","実力も","大事にする","タイプ"],
    SHDD: ["分析力と","決断力を","兼ね備えた、","洗練された","類型"],
    SHDI: ["多角的視点で","検討することが","得意な","類型"],
    SHDP: ["自身の能力を","理解し","その力を","活かせる","自信を","持った","リーダー類型"],
    SHIA: ["周囲の","状況や","感情に","配慮し、","慎重に","行動できる","タイプ"],
    SHID: ["他人を","気遣い、","周りの","状況を","把握する","タイプ"],
    SHII: ["他人の","意見を","大切にする","慎重な","タイプ"],
    SHIP: ["他人の","意見を","考慮する","気遣いのある","タイプ"],
    SHPA: ["イケてる","感じを","演出したい","芸術家タイプ"],
    SHPD: ["行動力抜群の","目立ちたがり屋が","多い","類型"],
    SHPI: ["社交的で","魅力的な","一面を","持つタイプ"],
    SHPP: ["天性の","エンターテイナー類型"]
  };

  /* ============ 色・描画ユーティリティ ============ */
  function hex2rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function mix(h, o, t) {
    var a = hex2rgb(h), b = hex2rgb(o);
    return '#' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
  }
  function rgba(h, a) { var c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function deep(h) { return mix(h, '#000000', 0.28); }
  function setFont(ctx, weight, px, fam) { ctx.font = weight + ' ' + px + 'px ' + (fam || FONT_JP); }

  /* 字間つき描画（ctx.letterSpacing は Safari 非対応のため1文字ずつ描く） */
  function spacedWidth(ctx, segs, sp) {
    var w = 0, n = 0;
    segs.forEach(function (s) { Array.from(s.t).forEach(function (ch) { w += ctx.measureText(ch).width; n++; }); });
    return w + sp * Math.max(0, n - 1);
  }
  function drawSpaced(ctx, segs, x, y, sp, align) {
    var total = spacedWidth(ctx, segs, sp);
    var cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ctx.textAlign = 'left';
    segs.forEach(function (s) {
      Array.from(s.t).forEach(function (ch) {
        ctx.fillStyle = s.c;
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + sp;
      });
    });
  }
  function fitSizeSegs(ctx, segs, weight, maxPx, minPx, maxW, fam, sp) {
    var px = maxPx;
    for (; px > minPx; px -= 2) {
      setFont(ctx, weight, px, fam);
      if (spacedWidth(ctx, segs, sp) <= maxW) break;
    }
    setFont(ctx, weight, px, fam);
    return px;
  }
  function fitSize(ctx, text, weight, maxPx, minPx, maxW, fam, sp) {
    return fitSizeSegs(ctx, [{ t: text }], weight, maxPx, minPx, maxW, fam, sp || 0);
  }

  /* ============ 日本語の文節折り返し ============
     ・禁則: 行頭に来てはいけない文字は直前の文節へ、行末に来てはいけない開き括弧は次の文節へ結合
     ・最短行数に収めたうえで、各行の幅のばらつきが最小になる分割を選ぶ（短い中央揃えコピー向け） */
  var HEAD_NG = /^[、。，．,.)）」』】〕〉》!！?？・:：;；ー〜～ぁぃぅぇぉっゃゅょァィゥェォッャュョゝゞヽヾ々]/;
  var TAIL_NG = /[(（「『【〔〈《]$/;

  function normalizePhrases(ph) {
    var out = [];
    ph.forEach(function (p) {
      if (out.length && (HEAD_NG.test(p) || TAIL_NG.test(out[out.length - 1]))) out[out.length - 1] += p;
      else out.push(p);
    });
    return out;
  }

  /* 文節データが無い・summary と食い違うときの代替。Intl.Segmenter があれば語単位、無ければ1文字単位 */
  function autoPhrases(text) {
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        var seg = new Intl.Segmenter('ja', { granularity: 'word' });
        var out = [];
        Array.from(seg.segment(text)).forEach(function (s) { out.push(s.segment); });
        if (out.length) return out;
      }
    } catch (e) { /* 1文字単位へ */ }
    return Array.from(text);
  }

  function phrasesFor(code80, summary) {
    var p = PHRASES[code80];
    if (p && p.join('') === summary) return p;
    return autoPhrases(summary);
  }

  /* 1文字単位の貪欲法（文節が1つでも幅を超えるときの最終手段） */
  function breakChars(ctx, text, maxW) {
    var lines = [], cur = '';
    Array.from(text).forEach(function (ch) {
      if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else { cur += ch; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function breakPhrases(ctx, phrases, maxW) {
    var ph = normalizePhrases(phrases).reduce(function (acc, p) {
      return acc.concat(ctx.measureText(p).width > maxW ? Array.from(p) : [p]);
    }, []);
    var n = ph.length;
    if (!n) return [];
    var w = ph.map(function (p) { return ctx.measureText(p).width; });
    var pre = [0];
    for (var i = 0; i < n; i++) pre.push(pre[i] + w[i]);

    var L = 1, cur = 0;
    for (var a = 0; a < n; a++) {
      if (cur + w[a] > maxW + 0.01 && cur > 0) { L++; cur = w[a]; } else { cur += w[a]; }
    }
    if (L === 1) return [ph.join('')];

    var avg = pre[n] / L, INF = 1e18;
    var dp = [], pv = [];
    for (var k0 = 0; k0 <= L; k0++) { dp.push(new Array(n + 1).fill(INF)); pv.push(new Array(n + 1).fill(-1)); }
    dp[0][0] = 0;
    for (var k = 1; k <= L; k++) {
      for (var j = 1; j <= n; j++) {
        for (var s = k - 1; s < j; s++) {
          var ww = pre[j] - pre[s];
          if (ww > maxW + 0.01 || dp[k - 1][s] >= INF) continue;
          var c = dp[k - 1][s] + Math.pow(ww - avg, 2);
          if (c < dp[k][j]) { dp[k][j] = c; pv[k][j] = s; }
        }
      }
    }
    if (dp[L][n] >= INF) return breakChars(ctx, ph.join(''), maxW);
    var lines = [], jj = n;
    for (var kk = L; kk >= 1; kk--) { var ii = pv[kk][jj]; lines.unshift(ph.slice(ii, jj).join('')); jj = ii; }
    return lines;
  }

  /* 折り返した結果が maxLines 行以内・高さ maxH 以内に収まる最大の文字の大きさを選ぶ。minPx 未満にはしない。
     lhRatio は行間（文字の大きさに対する倍率）。返す lh は行送りのpx */
  function layoutSummary(ctx, phrases, weight, startPx, minPx, maxW, maxLines, lhRatio, maxH) {
    var px = startPx, lines, lh;
    for (; ; px -= 2) {
      setFont(ctx, weight, px);
      lines = breakPhrases(ctx, phrases, maxW);
      lh = Math.round(px * (lhRatio || 1.4));
      var fitsH = !maxH || (lines.length - 1) * lh + px <= maxH;
      if ((lines.length <= maxLines && fitsH) || px <= minPx) break;
    }
    return { lines: lines, px: px, lh: lh };
  }

  function drawLines(ctx, lines, x, y, lh, align, color) {
    ctx.textAlign = align;
    ctx.fillStyle = color;
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
  }
  function drawImageFit(ctx, img, cx, bottom, maxW, maxH) {
    if (!img) return null;
    var s = Math.min(maxW / img.width, maxH / img.height), w = img.width * s, h = img.height * s;
    ctx.drawImage(img, cx - w / 2, bottom - h, w, h);
    return { x0: cx - w / 2, y0: bottom - h, x1: cx + w / 2, y1: bottom };
  }
  function paintBg(ctx, W, H, c, glow) {
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, mix(c, '#ffffff', 0.86));
    g.addColorStop(1, mix(c, '#ffffff', 0.94));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    glow.forEach(function (o) {
      var r = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      r.addColorStop(0, rgba(o.c, 0.30));
      r.addColorStop(1, rgba(o.c, 0));
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, W, H);
    });
  }
  /* ============ レア度（星の行 + 段階名） ============
     段階（★の数）と名前だけを出す。人数・割合・「○人に1人」などの件数表現は載せない（ユーザー指示 2026-10-08）。
     枠・塗りの囲みは付けない（ボタンに見えるため）。80CODE のすぐ下に、星の行 → 段階名の順で置く。
     ★は文字ではなく図形で描く（端末のフォントによる字形の差・絵文字化を避ける）。
     ★1 でも4つの星が同じ大きさで見えるよう、塗らない星は同じ色の輪郭で描く（段階名の文字色・大きさは全段階で同じ） */
  function starPath(ctx, cx, cy, R) {
    var r = R * 0.46;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? R : r, a = -Math.PI / 2 + i * Math.PI / 5;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* 文字の外接枠（描画位置の検査用）。x は揃えの基準（center=中心 / left=左端）、y はベースライン */
  function textBox(ctx, str, x, y, align, sp, px) {
    var m = ctx.measureText(str);
    var w = sp ? spacedWidth(ctx, [{ t: str }], sp) : m.width;
    var x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    var asc = typeof m.actualBoundingBoxAscent === 'number' ? m.actualBoundingBoxAscent : px * 0.88;
    var desc = typeof m.actualBoundingBoxDescent === 'number' ? m.actualBoundingBoxDescent : px * 0.12;
    return { x0: x0, y0: y - asc, x1: x0 + w, y1: y + desc };
  }
  function unionBox(a, b) {
    if (!a) return b;
    return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
  }

  function rarityBlock(ctx, x, top, align, tier, label, color, L, note) {
    var R = L.starR, gap = L.starGap, lw = Math.max(4, Math.round(R * 0.16));
    var rowW = gap * (RARITY_MAX - 1) + 2 * R;
    var cx0 = align === 'center' ? x - rowW / 2 + R : x + R;
    var cy = top + R;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    for (var i = 0; i < RARITY_MAX; i++) {
      starPath(ctx, cx0 + gap * i, cy, R - lw / 2);
      if (i < tier) {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
    note('stars', { x0: cx0 - R, y0: top, x1: cx0 + gap * (RARITY_MAX - 1) + R, y1: top + 2 * R });
    var px = fitSize(ctx, label, 900, L.rarityLabelPx, L.rarityLabelMin, L.rarityLabelW, FONT_JP, 3);
    var base = top + 2 * R + L.rarityLabelGap + Math.round(px * 0.88);
    ctx.textBaseline = 'alphabetic';
    drawSpaced(ctx, [{ t: label, c: deep(color) }], x, base, 3, align);
    note('rarityLabel', textBox(ctx, label, x, base, align, 3, px));
    return { labelPx: px, starR: R, bottom: base };
  }

  /* ============ 画面ごとの配置 ============
     高さ・大きさ・位置はここに集める（1080px幅のキャンバス上の値）。
     文字は4行（行動類型 / あだ名 / 一言2〜3行）。全80件のはみ出し・重なりの確認はブラウザでの全件生成検査で行う（設計書 9.5）。 */
  var LAYOUT_STORY = {
    x: 540, align: 'center',
    glow: { x: 540, y: 930, r: 520 },
    labelBase: 310, labelPx: 52, labelSp: 12,
    codeBase: 498, codeMax: 200, codeMin: 120, codeW: 880, codeSp: 8,
    rarityTop: 532, starR: 40, starGap: 104, rarityLabelPx: 80, rarityLabelMin: 70, rarityLabelW: 900, rarityLabelGap: 22,
    charCx: 540, charTop: 744, charTopNoRarity: 590, charBottom: 1152, charMaxW: 720,
    behBase: 1216, behPx: 48, behSp: 8,
    nickBase: 1350, nickMax: 132, nickMin: 72, nickW: 920,
    sumTop: 1398, sumBottom: 1650, sumStart: 88, sumMin: 60, sumW: 920, sumLines: 3, sumLh: 1.34,
    ctaBase: 1766, ctaPx: 52
  };
  var LAYOUT_SQUARE = {
    x: 80, align: 'left',
    glow: { x: 830, y: 300, r: 430 },
    labelBase: 104, labelPx: 44, labelSp: 10,
    codeBase: 262, codeMax: 176, codeMin: 110, codeW: 540, codeSp: 6,
    rarityTop: 298, starR: 36, starGap: 92, rarityLabelPx: 76, rarityLabelMin: 66, rarityLabelW: 560, rarityLabelGap: 18,
    charCx: 848, charTop: 64, charTopNoRarity: 64, charBottom: 505, charMaxW: 360,
    behBase: 566, behPx: 44, behSp: 8,
    nickBase: 688, nickMax: 108, nickMin: 56, nickW: 920,
    sumTop: 728, sumBottom: 972, sumStart: 76, sumMin: 50, sumW: 920, sumLines: 3, sumLh: 1.32,
    ctaBase: 1038, ctaPx: 40
  };

  /* ============ 結果画像1枚の描画 ============ */
  /* t: { code80, behaviorName, typeCode, nickname, summary, group, rarityTier, rarityLabel }
     rec: 検査用。渡すと { boxes: {名前: 外接枠}, info: {大きさ・行数} } を書き込む（本番の描画では渡さない） */
  function renderResult(img, t, fmt, rec) {
    var story = fmt === 'story', W = 1080, H = story ? 1920 : 1080;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    try {
      paintResult(c.getContext('2d'), img, t, story, W, H, rec);
    } catch (e) {
      releaseCanvas(c);   // 描画に失敗したら、作りかけの canvas を残さない
      throw e;
    }
    return c;
  }

  function paintResult(ctx, img, t, story, W, H, rec) {
    var L = story ? LAYOUT_STORY : LAYOUT_SQUARE, x = L.x, align = L.align;
    var G = GROUP[t.group], D = deep(G);
    var codeSegs = [{ t: t.code80.slice(0, 2), c: rgba(G, 0.45) }, { t: t.code80.slice(2), c: G }];
    var phrases = phrasesFor(t.code80, t.summary);
    var hasRarity = t.rarityTier >= 1 && t.rarityTier <= RARITY_MAX && !!t.rarityLabel;
    var info = rec ? rec.info = {} : {};
    var note = function (name, box) { if (rec) { rec.boxes = rec.boxes || {}; rec.boxes[name] = box; } };
    ctx.textBaseline = 'alphabetic';

    paintBg(ctx, W, H, G, [{ x: L.glow.x, y: L.glow.y, r: L.glow.r, c: G }]);

    // 1. MY 80CODE（小さな見出し）と 80CODE
    setFont(ctx, 700, L.labelPx);
    drawSpaced(ctx, [{ t: 'MY 80CODE', c: D }], x, L.labelBase, L.labelSp, align);
    note('label', textBox(ctx, 'MY 80CODE', x, L.labelBase, align, L.labelSp, L.labelPx));
    info.codePx = fitSizeSegs(ctx, codeSegs, 900, L.codeMax, L.codeMin, L.codeW, FONT_NUM, L.codeSp);
    drawSpaced(ctx, codeSegs, x, L.codeBase, L.codeSp, align);
    note('code', textBox(ctx, t.code80, x, L.codeBase, align, L.codeSp, info.codePx));

    // 2. レア度（80CODE のすぐ下。枠なし）
    if (hasRarity) {
      var rb = rarityBlock(ctx, x, L.rarityTop, align, t.rarityTier, t.rarityLabel, G, L, note);
      info.rarityStarR = rb.starR;
      info.rarityLabelPx = rb.labelPx;
    }

    // 3. キャラ
    note('char', drawImageFit(ctx, img, L.charCx, L.charBottom, L.charMaxW, L.charBottom - (hasRarity ? L.charTop : L.charTopNoRarity)));

    // 4. タイプ表示（行動類型 / あだ名 / 一言）。枠・点・16タイプのコードは出さない
    if (t.behaviorName) {
      setFont(ctx, 700, L.behPx);
      drawSpaced(ctx, [{ t: t.behaviorName, c: D }], x, L.behBase, L.behSp, align);
      note('behavior', textBox(ctx, t.behaviorName, x, L.behBase, align, L.behSp, L.behPx));
    }
    info.nickPx = fitSize(ctx, t.nickname, 900, L.nickMax, L.nickMin, L.nickW, FONT_JP, 0);
    ctx.textAlign = align;
    ctx.fillStyle = INK;
    ctx.fillText(t.nickname, x, L.nickBase);
    note('nickname', textBox(ctx, t.nickname, x, L.nickBase, align, 0, info.nickPx));

    var ls = layoutSummary(ctx, phrases, 700, L.sumStart, L.sumMin, L.sumW, L.sumLines, L.sumLh, L.sumBottom - L.sumTop);
    var base0 = L.sumTop + Math.round(ls.px * 0.88);
    drawLines(ctx, ls.lines, x, base0, ls.lh, align, 'rgba(26,26,26,.86)');
    var sbox = null;
    ls.lines.forEach(function (ln, i) { sbox = unionBox(sbox, textBox(ctx, ln, x, base0 + i * ls.lh, align, 0, ls.px)); });
    note('summary', sbox);
    info.summaryPx = ls.px;
    info.summaryLines = ls.lines.length;
    info.summaryLineTexts = ls.lines;

    // 5. 呼びかけ（枠・塗りなしの普通の文字）
    setFont(ctx, 700, L.ctaPx);
    ctx.textAlign = align;
    ctx.fillStyle = D;
    ctx.fillText(CTA_TEXT, x, L.ctaBase);
    note('cta', textBox(ctx, CTA_TEXT, x, L.ctaBase, align, 0, L.ctaPx));
    info.w = W;
    info.h = H;
  }

  /* ============ 相性ペア画像（P2） ============
     友だち（左）と自分（右）の2人を並べる。載せるもの: 見出し「2人の相性」／相性の点数とラベル／2人のキャラ・80CODE・あだ名／呼びかけ。
     1人用の画像と同じ約束: 枠・塗りの囲み（ボタンに見える要素）・URL・「無料・登録不要」の文字は載せない。文字は大きく。
     点数とラベルは画面の getCompatibility() の値をそのまま受け取って描く（ここでは計算しない）。
     2人の80CODE・あだ名は、長い方に合わせて同じ大きさにそろえる。 */
  var PAIR_HEADING = '2人の相性';
  var PAIR_UNIT = '点';   // 相性の点数の単位。サイト全体で「点」に統一（2026-10-08 ユーザー確定。相性結果の画面・シェア文・トップの見本・相性マトリクスと同じ）
  var LAYOUT_PAIR_STORY = {
    cx: 540,
    glowY: 1010, glowR: 560,
    headBase: 326, headPx: 52, headSp: 12,
    scoreBase: 620, scoreMax: 300, scoreMin: 240, scoreW: 640,
    labelBase: 780, labelMax: 124, labelMin: 84, labelW: 920,
    colA: 295, colB: 785, colW: 480,
    charBottom: 1284, charMaxH: 450, charMaxW: 410, crossPx: 72,
    codeBase: 1412, codeMax: 136, codeMin: 100, codeSp: 6,
    nickBase: 1516, nickMax: 84, nickMin: 48,
    ctaBase: 1766, ctaPx: 52
  };
  var LAYOUT_PAIR_SQUARE = {
    cx: 540,
    glowY: 560, glowR: 520,
    headBase: 96, headPx: 40, headSp: 10,
    scoreBase: 292, scoreMax: 200, scoreMin: 160, scoreW: 560,
    labelBase: 400, labelMax: 88, labelMin: 60, labelW: 920,
    colA: 295, colB: 785, colW: 480,
    charBottom: 712, charMaxH: 270, charMaxW: 330, crossPx: 56,
    codeBase: 826, codeMax: 120, codeMin: 80, codeSp: 5,
    nickBase: 910, nickMax: 68, nickMin: 44,
    ctaBase: 1020, ctaPx: 40
  };

  function codeSegsFor(code80, color) {
    return code80.length === 4
      ? [{ t: code80.slice(0, 2), c: rgba(color, 0.45) }, { t: code80.slice(2), c: color }]
      : [{ t: code80, c: color }];
  }

  /* 点数（大きな数字＋小さな「点」）の幅。数字の大きさが px のとき、「点」は px の 0.38 倍 */
  function scoreMetrics(ctx, str, px) {
    var unitPx = Math.round(px * 0.38), gap = Math.round(px * 0.05);
    setFont(ctx, 900, px, FONT_NUM);
    var nw = ctx.measureText(str).width;
    setFont(ctx, 900, unitPx, FONT_NUM);
    var uw = ctx.measureText(PAIR_UNIT).width;
    return { px: px, unitPx: unitPx, gap: gap, nw: nw, uw: uw, total: nw + gap + uw };
  }

  function paintPair(ctx, imgA, imgB, t, story, W, H, rec) {
    var L = story ? LAYOUT_PAIR_STORY : LAYOUT_PAIR_SQUARE, cx = L.cx;
    var GA = GROUP[t.a.group], GB = GROUP[t.b.group];
    var DA = deep(GA), DB = deep(GB), DM = deep(mix(GA, GB, 0.5));
    var info = rec ? rec.info = {} : {};
    var note = function (name, box) { if (rec) { rec.boxes = rec.boxes || {}; rec.boxes[name] = box; } };
    ctx.textBaseline = 'alphabetic';

    // 背景: 左上は友だち、右下は自分のグループ色
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, mix(GA, '#ffffff', 0.86));
    bg.addColorStop(1, mix(GB, '#ffffff', 0.86));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    [[L.colA, GA], [L.colB, GB]].forEach(function (o) {
      var r = ctx.createRadialGradient(o[0], L.glowY, 0, o[0], L.glowY, L.glowR);
      r.addColorStop(0, rgba(o[1], 0.30));
      r.addColorStop(1, rgba(o[1], 0));
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, W, H);
    });

    // 1. 見出し「2人の相性」（小さな見出し。1人用の「MY 80CODE」にあたる）
    setFont(ctx, 700, L.headPx);
    drawSpaced(ctx, [{ t: PAIR_HEADING, c: DM }], cx, L.headBase, L.headSp, 'center');
    note('heading', textBox(ctx, PAIR_HEADING, cx, L.headBase, 'center', L.headSp, L.headPx));

    // 2. 相性の点数（特大）。左から右へ友だち→自分のグループ色
    var scoreStr = String(t.score);
    var sm = scoreMetrics(ctx, scoreStr, L.scoreMax);
    while (sm.total > L.scoreW && sm.px > L.scoreMin) sm = scoreMetrics(ctx, scoreStr, sm.px - 4);
    var sx0 = cx - sm.total / 2;
    var sg = ctx.createLinearGradient(sx0, 0, sx0 + sm.total, 0);
    sg.addColorStop(0, GA);
    sg.addColorStop(1, GB);
    ctx.textAlign = 'left';
    ctx.fillStyle = sg;
    setFont(ctx, 900, sm.px, FONT_NUM);
    ctx.fillText(scoreStr, sx0, L.scoreBase);
    var nbox = textBox(ctx, scoreStr, sx0, L.scoreBase, 'left', 0, sm.px);
    setFont(ctx, 900, sm.unitPx, FONT_NUM);
    ctx.fillText(PAIR_UNIT, sx0 + sm.nw + sm.gap, L.scoreBase);
    var ubox = textBox(ctx, PAIR_UNIT, sx0 + sm.nw + sm.gap, L.scoreBase, 'left', 0, sm.unitPx);
    note('score', unionBox(nbox, ubox));
    info.scorePx = sm.px;

    // 3. 相性のラベル（大きく）
    info.labelPx = fitSize(ctx, t.label, 900, L.labelMax, L.labelMin, L.labelW, FONT_JP, 0);
    var lw = ctx.measureText(t.label).width;
    var lg = ctx.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0);
    lg.addColorStop(0, DA);
    lg.addColorStop(1, DB);
    ctx.textAlign = 'center';
    ctx.fillStyle = lg;
    ctx.fillText(t.label, cx, L.labelBase);
    note('label', textBox(ctx, t.label, cx, L.labelBase, 'center', 0, info.labelPx));

    // 4. 2人のキャラと「×」
    var charTop = L.charBottom - L.charMaxH;
    note('charA', drawImageFit(ctx, imgA, L.colA, L.charBottom, L.charMaxW, L.charMaxH));
    note('charB', drawImageFit(ctx, imgB, L.colB, L.charBottom, L.charMaxW, L.charMaxH));
    setFont(ctx, 700, L.crossPx, FONT_NUM);
    var crossBase = Math.round(charTop + L.charMaxH / 2 + L.crossPx * 0.35);
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(DM, 0.7);
    ctx.fillText('×', cx, crossBase);
    note('cross', textBox(ctx, '×', cx, crossBase, 'center', 0, L.crossPx));

    // 5. 2人の80CODE（同じ大きさ）
    var segsA = codeSegsFor(t.a.code80, GA), segsB = codeSegsFor(t.b.code80, GB);
    var cpA = fitSizeSegs(ctx, segsA, 900, L.codeMax, L.codeMin, L.colW, FONT_NUM, L.codeSp);
    var cpB = fitSizeSegs(ctx, segsB, 900, L.codeMax, L.codeMin, L.colW, FONT_NUM, L.codeSp);
    info.codePx = Math.min(cpA, cpB);
    setFont(ctx, 900, info.codePx, FONT_NUM);
    drawSpaced(ctx, segsA, L.colA, L.codeBase, L.codeSp, 'center');
    note('codeA', textBox(ctx, t.a.code80, L.colA, L.codeBase, 'center', L.codeSp, info.codePx));
    drawSpaced(ctx, segsB, L.colB, L.codeBase, L.codeSp, 'center');
    note('codeB', textBox(ctx, t.b.code80, L.colB, L.codeBase, 'center', L.codeSp, info.codePx));

    // 6. 2人のあだ名（同じ大きさ）
    var npA = fitSize(ctx, t.a.nickname, 900, L.nickMax, L.nickMin, L.colW, FONT_JP, 0);
    var npB = fitSize(ctx, t.b.nickname, 900, L.nickMax, L.nickMin, L.colW, FONT_JP, 0);
    info.nickPx = Math.min(npA, npB);
    setFont(ctx, 900, info.nickPx, FONT_JP);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText(t.a.nickname, L.colA, L.nickBase);
    note('nickA', textBox(ctx, t.a.nickname, L.colA, L.nickBase, 'center', 0, info.nickPx));
    ctx.fillText(t.b.nickname, L.colB, L.nickBase);
    note('nickB', textBox(ctx, t.b.nickname, L.colB, L.nickBase, 'center', 0, info.nickPx));

    // 7. 呼びかけ（枠・塗りなしの普通の文字。1人用と同じ文言）
    setFont(ctx, 700, L.ctaPx);
    ctx.textAlign = 'center';
    ctx.fillStyle = DM;
    ctx.fillText(CTA_TEXT, cx, L.ctaBase);
    note('cta', textBox(ctx, CTA_TEXT, cx, L.ctaBase, 'center', 0, L.ctaPx));
    info.w = W;
    info.h = H;
  }

  /* t: { a:{code80,typeCode,nickname,group}, b:{…}, score, label }。rec は検査用（renderResult と同じ） */
  function renderPair(imgA, imgB, t, fmt, rec) {
    var story = fmt === 'story', W = 1080, H = story ? 1920 : 1080;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    try {
      paintPair(c.getContext('2d'), imgA, imgB, t, story, W, H, rec);
    } catch (e) {
      releaseCanvas(c);
      throw e;
    }
    return c;
  }

  /* ============ 読み込み・書き出し ============ */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('image timeout')); }, IMAGE_TIMEOUT_MS);
      var i = new Image();
      i.onload = function () { clearTimeout(timer); resolve(i); };
      i.onerror = function () { clearTimeout(timer); reject(new Error('image load failed')); };
      i.src = src;
    });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* フォントの用意を待ち、結果の種類を返す。
       'ok'          ... Noto Sans JP の字形が読み込めた
       'timeout'     ... 読み込み中のまま FONT_TIMEOUT_MS で打ち切った（システムフォントで描く）
       'missing'     ... @font-face が見つからないまま待ち時間を過ぎた（スタイルシート未適用・ブロック。システムフォントで描く）
       'unsupported' ... document.fonts が使えない環境
     document.fonts.load() は、その family の @font-face が1つも登録されていないと、エラーにも待ちにもならず
     空配列で成功を返す。成功扱いにすると、フォント未適用のまま描いてしまうため、返り値の中身（FontFace の数）で見分ける */
  function ensureFonts(sample) {
    var doc = root.document;
    if (!doc || !doc.fonts || !doc.fonts.load) return Promise.resolve('unsupported');
    var jp = ['900 100px "Noto Sans JP"', '700 100px "Noto Sans JP"', '500 100px "Noto Sans JP"'];
    var latin = ['900 100px "Inter"', '700 100px "Inter"'];
    var startedAt = Date.now();
    var noFaceSince = 0;

    function once() {
      var left = FONT_TIMEOUT_MS - (Date.now() - startedAt);
      if (left <= 0) return Promise.resolve(noFaceSince ? 'missing' : 'timeout');
      var loads = jp.concat(latin).map(function (f) {
        return doc.fonts.load(f, sample).then(function (faces) { return faces ? faces.length : 0; }, function () { return 0; });
      });
      return Promise.race([
        Promise.all(loads).then(function (counts) { return { counts: counts }; }),
        wait(left).then(function () { return { timeout: true }; })
      ]).then(function (res) {
        // 待ちが終わらなかった＝@font-face は登録済みで読み込み中（未登録なら上の分岐で即座に空配列が返る）
        if (res.timeout) return 'timeout';
        var jpFaces = res.counts[0] + res.counts[1] + res.counts[2];
        if (jpFaces > 0) return 'ok';
        // @font-face が未登録。スタイルシートがまだ適用されていない可能性があるので、少しだけ待って再確認する
        if (!noFaceSince) noFaceSince = Date.now();
        if (Date.now() - noFaceSince >= FONT_NO_FACE_GRACE_MS) return 'missing';
        return wait(250).then(once);
      });
    }
    return once();
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      var done = function (blob) { resolve(blob || null); };
      try {
        canvas.toBlob(function (blob) {
          if (blob) return done(blob);
          canvas.toBlob(done, 'image/png');
        }, 'image/jpeg', JPEG_QUALITY);
      } catch (e) { done(null); }
    });
  }

  function makeFile(blob, name) {
    try {
      if (typeof File === 'function') return new File([blob], name, { type: blob.type });
    } catch (e) { /* Blob のまま返す */ }
    blob.name = name;
    return blob;
  }

  function releaseCanvas(canvas) { canvas.width = 0; canvas.height = 0; }

  /* 画像の用意の結果を GA4 の image_status 用の文字列にまとめる（新しいパラメータは増やさず、値で区別する） */
  function buildImageStatus(fontStatus, charOk) {
    var s = 'ready';
    if (fontStatus === 'timeout') s += '_font_timeout';
    else if (fontStatus === 'missing' || fontStatus === 'unsupported') s += '_font_missing';
    if (!charOk) s += '_char_missing';
    return s;
  }

  /* 不要になった結果の Object URL を解放する（モーダルを閉じる・画面を離れる・古い結果を捨てるとき） */
  function release(result) {
    if (!result) return;
    ['story', 'square'].forEach(function (k) {
      var o = result[k];
      if (o && o.url) {
        try { URL.revokeObjectURL(o.url); } catch (e) { /* 解放済み */ }
        o.url = '';
      }
    });
  }

  /* 画像の用意（共通）。フォントと画像を待ち、9:16 と 1:1 を描いて JPEG にする。
     job: { sample: フォント読み込み用の文字列, imageUrls: [キャラ画像のURL…], render(imgs, fmt): canvas, nameFor(fmt): ファイル名 }
     戻り値: { story:{…}, square:{…}, fontsOk, fontStatus, charImageOk, imageStatus, timing }（呼び出し側が code80 などを足す） */
  function produce(job) {
    var t0 = performance.now();
    var tFont, tImg;

    return Promise.all([
      ensureFonts(job.sample).then(function (st) { tFont = performance.now(); return st; }),
      Promise.all(job.imageUrls.map(function (u) {
        return loadImage(u).then(function (i) { return i; }, function () { return null; });
      })).then(function (imgs) { tImg = performance.now(); return imgs; })
    ]).then(function (res) {
      var fontStatus = res[0], imgs = res[1];
      var tDraw0 = performance.now();
      var specs = ['story', 'square'];
      var canvases = [];
      try {
        specs.forEach(function (fmt) { canvases.push(job.render(imgs, fmt)); });
      } catch (e) {
        canvases.forEach(releaseCanvas);   // 途中で失敗しても作りかけの canvas を残さない
        throw e;
      }
      var tDraw1 = performance.now();
      return Promise.all(canvases.map(canvasToBlob)).then(function (blobs) {
        canvases.forEach(releaseCanvas);   // blob にした後は canvas を使わない（成功・失敗とも解放）
        var tEnc = performance.now();
        // 先に全部の blob を確認する。1つでも失敗したら URL を作らずに終える（URL の取りこぼしを防ぐ）
        if (blobs.some(function (b) { return !b; })) throw new Error('encode failed');
        var out = {};
        specs.forEach(function (fmt, i) {
          var blob = blobs[i];
          var name = job.nameFor(fmt) + '.' + (blob.type === 'image/png' ? 'png' : 'jpg');
          out[fmt] = {
            fmt: fmt,
            width: 1080,
            height: fmt === 'story' ? 1920 : 1080,
            blob: blob,
            file: makeFile(blob, name),
            name: name,
            url: URL.createObjectURL(blob),
            bytes: blob.size,
            type: blob.type
          };
        });
        var charOk = imgs.every(function (i) { return !!i; });
        out.fontsOk = fontStatus === 'ok';
        out.fontStatus = fontStatus;
        out.charImageOk = charOk;
        out.imageStatus = buildImageStatus(fontStatus, charOk);
        out.timing = {
          totalMs: Math.round(tEnc - t0),
          fontWaitMs: Math.round(tFont - t0),
          imageWaitMs: Math.round(tImg - t0),
          drawMs: Math.round((tDraw1 - tDraw0) * 10) / 10,
          encodeMs: Math.round(tEnc - tDraw1)
        };
        return out;
      }, function (err) {
        canvases.forEach(releaseCanvas);
        throw err;
      });
    });
  }

  function charImageUrl(typeCode) {
    return '/80cards/share-image/' + typeCode.toLowerCase() + '.webp?v=' + IMAGE_VERSION;
  }

  /* opts: { behaviorPrefix:'AC', typeCode:'PP', behaviorName:'達成型', nickname, summary, rarityTier:1〜4, rarityLabel } */
  function generate(opts) {
    var typeCode = String(opts.typeCode || '');
    var t = {
      code80: String(opts.behaviorPrefix || '') + typeCode,
      behaviorName: opts.behaviorName || '',
      typeCode: typeCode,
      nickname: opts.nickname || typeCode,
      summary: opts.summary || '',
      group: typeCode.charAt(0),
      rarityTier: Number(opts.rarityTier) || 0,
      rarityLabel: opts.rarityLabel || ''
    };
    if (!GROUP[t.group] || t.code80.length !== 4) return Promise.reject(new Error('invalid type'));

    return produce({
      sample: ['MY 80CODE', t.code80, t.behaviorName, typeCode, t.nickname, t.summary, t.rarityLabel, CTA_TEXT, '0123456789'].join(''),
      imageUrls: [charImageUrl(typeCode)],
      render: function (imgs, fmt) { return renderResult(imgs[0], t, fmt); },
      nameFor: function (fmt) { return '80cards-' + t.code80 + '-' + fmt; }
    }).then(function (out) {
      out.code80 = t.code80;
      return out;
    });
  }

  /* 相性ペア画像。opts: { a:{behaviorPrefix, typeCode, nickname}, b:{同左}, score: 数値, label: '最強コンビ' }
     a=友だち（左）／b=自分（右）。behaviorPrefix が空でも作る（その場合は16タイプの2文字だけを出す） */
  function pairSide(o) {
    var typeCode = String((o && o.typeCode) || '');
    return {
      code80: String((o && o.behaviorPrefix) || '') + typeCode,
      typeCode: typeCode,
      nickname: (o && o.nickname) || typeCode,
      group: typeCode.charAt(0)
    };
  }
  function generatePair(opts) {
    var a = pairSide(opts && opts.a), b = pairSide(opts && opts.b);
    var score = Math.round(Number(opts && opts.score));
    var label = String((opts && opts.label) || '');
    if (!GROUP[a.group] || !GROUP[b.group] || a.typeCode.length !== 2 || b.typeCode.length !== 2 ||
        !(score >= 0 && score <= 100) || !label) return Promise.reject(new Error('invalid pair'));
    var t = { a: a, b: b, score: score, label: label };

    return produce({
      sample: [PAIR_HEADING, PAIR_UNIT, a.code80, b.code80, a.nickname, b.nickname, label, CTA_TEXT, '0123456789×'].join(''),
      imageUrls: [charImageUrl(a.typeCode), charImageUrl(b.typeCode)],
      render: function (imgs, fmt) { return renderPair(imgs[0], imgs[1], t, fmt); },
      nameFor: function (fmt) { return '80cards-pair-' + a.code80 + '-' + b.code80 + '-' + fmt; }
    }).then(function (out) {
      out.code80A = a.code80;
      out.code80B = b.code80;
      return out;
    });
  }

  /* ============ 端末の判定 ============ */
  function detectInApp(ua) {
    ua = ua || '';
    if (/(FBAN|FBAV|FB_IAB|Instagram|\bLine\/|LIAPP|Twitter|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Snapchat|KAKAOTALK|YJApp|Pinterest)/i.test(ua)) return true;
    if (/Android/.test(ua) && /; wv\)/.test(ua)) return true;                       // Android WebView
    if (/(iPhone|iPad|iPod)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return true;   // iOS WKWebView（Safari / CriOS 以外）
    return false;
  }

  function canShareFile(file) {
    try {
      return !!(root.navigator && typeof root.navigator.share === 'function' &&
        typeof root.navigator.canShare === 'function' && root.navigator.canShare({ files: [file] }));
    } catch (e) { return false; }
  }

  function isCoarsePointer() {
    try { return !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }

  var api = {
    version: VERSION,
    PHRASES: PHRASES,
    generate: generate,
    generatePair: generatePair,
    release: release,
    detectInApp: detectInApp,
    canShareFile: canShareFile,
    isCoarsePointer: isCoarsePointer,
    // 検査用
    _internal: { normalizePhrases: normalizePhrases, breakPhrases: breakPhrases, phrasesFor: phrasesFor, layoutSummary: layoutSummary, renderResult: renderResult, renderPair: renderPair, autoPhrases: autoPhrases, ensureFonts: ensureFonts, buildImageStatus: buildImageStatus }
  };

  root.PF80ShareImage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
