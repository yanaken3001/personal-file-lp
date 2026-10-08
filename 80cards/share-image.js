/*
 * 80CARDS 結果画像の生成（canvas）
 *
 * 結果画面の表示後に動的読み込みされ、9:16（1080x1920）と 1:1（1080x1080）の
 * JPEG を端末内で作る。サーバーへは何も送らない。
 *
 * 設計書: 08_80CARDS拡散/01_改修設計書_v1.md 1節・2節
 * 呼び出し: window.PF80ShareImage.generate({ behaviorPrefix, typeCode, nickname, summary, rarityTier, rarityLabel })
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

  var VERSION = '20261008b';          // このスクリプト自身の版（app.jsx の読み込み URL と揃える）
  var IMAGE_VERSION = '20261008';     // キャラ縮小画像の版（画像を差し替えたときだけ上げる）
  var JPEG_QUALITY = 0.92;
  var FONT_TIMEOUT_MS = 4000;
  var FONT_NO_FACE_GRACE_MS = 1500;   // @font-face が未登録（スタイルシート未適用）のとき、登録を待つ上限
  var IMAGE_TIMEOUT_MS = 8000;

  var GROUP = { P: '#FF3B5C', A: '#4D6CFA', I: '#00D4AA', D: '#8B5CF6' };   // 結果画面の groupColorMap と同一
  var INK = '#1A1A1A';
  var URL_TEXT = 'personal-file.jp/80cards';
  var CTA_TEXT = 'あなたの80CODEは？';
  var NOTE_TEXT = '無料・登録不要・約3分';
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

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

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

  /* maxLines 行に収まるまでフォントを縮めて折り返す */
  function layoutSummary(ctx, phrases, weight, startPx, minPx, maxW, maxLines) {
    var px = startPx, lines;
    for (; ; px -= 2) {
      setFont(ctx, weight, px);
      lines = breakPhrases(ctx, phrases, maxW);
      if (lines.length <= maxLines || px <= minPx) break;
    }
    return { lines: lines, px: px };
  }

  function drawLines(ctx, lines, x, y, lh, align, color) {
    ctx.textAlign = align;
    ctx.fillStyle = color;
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
  }
  function drawImageFit(ctx, img, cx, bottom, maxW, maxH) {
    if (!img) return;
    var s = Math.min(maxW / img.width, maxH / img.height), w = img.width * s, h = img.height * s;
    ctx.drawImage(img, cx - w / 2, bottom - h, w, h);
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
  function pill(ctx, text, x, y, h, color, align, px, weight) {
    setFont(ctx, weight || 700, px);
    var tw = spacedWidth(ctx, [{ t: text }], 3), w = tw + h * 1.1, x0 = align === 'center' ? x - w / 2 : x;
    roundRect(ctx, x0, y, w, h, h / 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.textBaseline = 'middle';
    drawSpaced(ctx, [{ t: text, c: deep(color) }], x0 + w / 2, y + h / 2 + 2, 3, 'center');
    ctx.textBaseline = 'alphabetic';
    return w;
  }

  /* ============ レア度バッジ ============
     段階（★の数）と名前だけを出す。人数・割合・「○人に1人」などの件数表現は載せない（ユーザー指示 2026-10-08）。
     ★は文字ではなく図形で描く（端末のフォントによる字形の差・絵文字化を避ける） */
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
  function rarityBadge(ctx, x, y, w, h, tier, label, color) {
    var R = 13, gap = 32, pad = 24, midY = y + 28;
    ctx.save();
    roundRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    // 上段: 左に RARITY、右に★（段階の数だけ塗る）
    setFont(ctx, 700, 18, FONT_NUM);
    ctx.textBaseline = 'middle';
    drawSpaced(ctx, [{ t: 'RARITY', c: rgba(deep(color), 0.72) }], x + pad, midY + 1, 3, 'left');
    var firstStar = x + w - pad - R - gap * (RARITY_MAX - 1);
    for (var i = 0; i < RARITY_MAX; i++) {
      starPath(ctx, firstStar + gap * i, midY, R);
      ctx.fillStyle = i < tier ? color : rgba(color, 0.2);
      ctx.fill();
    }
    // 下段: 段階の名前
    ctx.textBaseline = 'alphabetic';
    fitSize(ctx, label, 900, 26, 18, w - pad * 2, FONT_JP, 0);
    ctx.textAlign = 'center';
    ctx.fillStyle = deep(color);
    ctx.fillText(label, x + w / 2, y + h - 13);
    ctx.restore();
  }

  /* ============ 結果画像1枚の描画 ============ */
  /* t: { code80, behaviorName, typeCode, nickname, summary, group, rarityTier, rarityLabel } */
  function renderResult(img, t, fmt) {
    var story = fmt === 'story', W = 1080, H = story ? 1920 : 1080;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    try {
      paintResult(c.getContext('2d'), img, t, story, W, H);
    } catch (e) {
      releaseCanvas(c);   // 描画に失敗したら、作りかけの canvas を残さない
      throw e;
    }
    return c;
  }

  function paintResult(ctx, img, t, story, W, H) {
    var G = GROUP[t.group], D = deep(G);
    var codeSegs = [{ t: t.code80.slice(0, 2), c: rgba(G, 0.45) }, { t: t.code80.slice(2), c: G }];
    var pillText = '● ' + t.behaviorName + t.typeCode;
    var phrases = phrasesFor(t.code80, t.summary);
    var hasRarity = t.rarityTier >= 1 && t.rarityTier <= RARITY_MAX && !!t.rarityLabel;

    if (story) {
      paintBg(ctx, W, H, G, [{ x: 540, y: 830, r: 520, c: G }]);
      setFont(ctx, 700, 34);
      drawSpaced(ctx, [{ t: 'MY 80CODE', c: D }], 540, 318, 10, 'center');
      fitSizeSegs(ctx, codeSegs, 900, 210, 120, 880, FONT_NUM, 8);
      drawSpaced(ctx, codeSegs, 540, 520, 8, 'center');
      drawImageFit(ctx, img, 540, 1085, 720, 520);
      if (hasRarity) rarityBadge(ctx, 730, 266, 300, 84, t.rarityTier, t.rarityLabel, G);
      pill(ctx, pillText, 540, 1112, 76, G, 'center', 36, 700);
      fitSize(ctx, t.nickname, 900, 132, 72, 920, FONT_JP, 0);
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.fillText(t.nickname, 540, 1312);
      var ls = layoutSummary(ctx, phrases, 500, 44, 36, 860, 2);
      drawLines(ctx, ls.lines, 540, 1392, Math.round(ls.px * 1.41), 'center', 'rgba(26,26,26,.82)');
      // CTA（下35%は表示されない場合があるため補助要素のみ）
      roundRect(ctx, 150, 1604, 780, 100, 50);
      ctx.fillStyle = G;
      ctx.fill();
      setFont(ctx, 900, 46);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(CTA_TEXT, 540, 1670);
      setFont(ctx, 700, 36, FONT_NUM);
      ctx.fillStyle = 'rgba(26,26,26,.62)';
      ctx.fillText(URL_TEXT, 540, 1768);
      setFont(ctx, 500, 28);
      ctx.fillStyle = 'rgba(26,26,26,.5)';
      ctx.fillText(NOTE_TEXT, 540, 1822);
    } else {
      paintBg(ctx, W, H, G, [{ x: 800, y: 560, r: 420, c: G }]);
      setFont(ctx, 700, 30);
      drawSpaced(ctx, [{ t: 'MY 80CODE', c: D }], 80, 122, 8, 'left');
      fitSizeSegs(ctx, codeSegs, 900, 196, 110, 560, FONT_NUM, 6);
      drawSpaced(ctx, codeSegs, 80, 300, 6, 'left');
      pill(ctx, pillText, 80, 340, 68, G, 'left', 32, 700);
      if (hasRarity) rarityBadge(ctx, 700, 56, 300, 84, t.rarityTier, t.rarityLabel, G);
      fitSize(ctx, t.nickname, 900, 108, 52, 470, FONT_JP, 0);
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.fillText(t.nickname, 80, 508);
      var sq = layoutSummary(ctx, phrases, 500, 36, 28, 470, 3);
      drawLines(ctx, sq.lines, 80, 584, Math.round(sq.px * 1.5), 'left', 'rgba(26,26,26,.82)');
      drawImageFit(ctx, img, 812, 800, 420, 500);
      roundRect(ctx, 80, 872, 430, 92, 46);
      ctx.fillStyle = G;
      ctx.fill();
      setFont(ctx, 900, 38);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(CTA_TEXT, 295, 933);
      setFont(ctx, 700, 30, FONT_NUM);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(26,26,26,.6)';
      ctx.fillText(URL_TEXT, 1000, 930);
      setFont(ctx, 500, 24);
      ctx.fillText(NOTE_TEXT, 1000, 968);
    }
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

  /* opts: { behaviorPrefix:'AC', typeCode:'PP', behaviorName:'達成型', nickname, summary, rarityTier:1〜4, rarityLabel } */
  function generate(opts) {
    var t0 = performance.now();
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

    var imgUrl = '/80cards/share-image/' + typeCode.toLowerCase() + '.webp?v=' + IMAGE_VERSION;
    var sample = ['MY 80CODE', t.code80, t.behaviorName, typeCode, t.nickname, t.summary, t.rarityLabel, 'RARITY', CTA_TEXT, NOTE_TEXT, URL_TEXT, '0123456789%●'].join('');
    var tFont, tImg;

    return Promise.all([
      ensureFonts(sample).then(function (st) { tFont = performance.now(); return st; }),
      loadImage(imgUrl).then(function (i) { tImg = performance.now(); return i; }, function () { tImg = performance.now(); return null; })
    ]).then(function (res) {
      var fontStatus = res[0], img = res[1];
      var tDraw0 = performance.now();
      var specs = [['story', 'story'], ['square', 'square']];
      var canvases = [];
      try {
        specs.forEach(function (s) { canvases.push(renderResult(img, t, s[0])); });
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
        specs.forEach(function (s, i) {
          var blob = blobs[i];
          var ext = blob.type === 'image/png' ? 'png' : 'jpg';
          var name = '80cards-' + t.code80 + '-' + s[0] + '.' + ext;
          out[s[0]] = {
            fmt: s[0],
            width: 1080,
            height: s[0] === 'story' ? 1920 : 1080,
            blob: blob,
            file: makeFile(blob, name),
            name: name,
            url: URL.createObjectURL(blob),
            bytes: blob.size,
            type: blob.type
          };
        });
        out.code80 = t.code80;
        out.fontsOk = fontStatus === 'ok';
        out.fontStatus = fontStatus;
        out.charImageOk = !!img;
        out.imageStatus = buildImageStatus(fontStatus, !!img);
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
    release: release,
    detectInApp: detectInApp,
    canShareFile: canShareFile,
    isCoarsePointer: isCoarsePointer,
    // 検査用
    _internal: { normalizePhrases: normalizePhrases, breakPhrases: breakPhrases, phrasesFor: phrasesFor, layoutSummary: layoutSummary, renderResult: renderResult, autoPhrases: autoPhrases, ensureFonts: ensureFonts, buildImageStatus: buildImageStatus }
  };

  root.PF80ShareImage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
