# 80タイプ診断 UI/デザインブラッシュアップ — Claude Code 実装プロンプト

---

## このプロンプトの使い方

このプロンプトは `/80type/index.html`（80タイプ診断のメインファイル）を対象に、UI/デザインのブラッシュアップを実行するためのものです。

**技術制約：**
- Vercel静的ホスティング
- React via CDN + Babel（ビルドツールなし）
- 単一HTMLファイル構成
- Meta Pixel実装済み（カスタムイベント `CTA80TypeClick` を使用）

**Phase単位で区切っているので、Phase 1から順番に実行してください。各Phaseの完了後に動作確認を行い、問題がなければ次のPhaseに進みます。**

---

# Phase 1：トップページ強化 + プログレスバー改善 + SNSシェア基盤

## 1-1. トップページの情報充実

**対象：** 診断開始前の画面（「診断をはじめる」ボタンの前後）

現在のトップページは「80」ロゴ + タイトル + CTAボタン + 診断済み人数のみ。以下の要素を追加する。

### A. 「何がわかるか」セクションを追加

CTAボタンの**上**に、以下の内容を横並びアイコン付きで挿入する。

```jsx
{/* CTAの前に挿入 */}
<div style={{
  maxWidth: '600px',
  margin: '0 auto 32px',
  padding: '24px',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '16px',
  backdropFilter: 'blur(10px)'
}}>
  <h3 style={{
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '20px',
    textAlign: 'center'
  }}>
    あなたの80タイプがわかると…
  </h3>
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  }}>
    {[
      { icon: '🧠', title: '性格タイプ', desc: '基本的な思考・行動パターン' },
      { icon: '🎯', title: '適職', desc: '本当に向いている仕事' },
      { icon: '📊', title: '行動スタイル', desc: '無意識の行動パターン' },
      { icon: '💼', title: '働き方相性', desc: '合う社風・上司タイプ' },
    ].map((item, i) => (
      <div key={i} style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <span style={{ fontSize: '24px' }}>{item.icon}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{item.title}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{item.desc}</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

### B. ソーシャルプルーフの強化

現在の「15,852人が診断済み」表示の下に、テスティモニアル（ユーザーの声）を追加する。

```jsx
{/* 診断済み人数の下に追加 */}
<div style={{
  maxWidth: '500px',
  margin: '16px auto 0',
  padding: '16px 20px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '12px',
  borderLeft: '3px solid rgba(0,210,255,0.5)'
}}>
  <p style={{
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic'
  }}>
    「正直ここまで当たると思ってなかった。自分の行動パターンが言語化されてスッキリした」
  </p>
  <p style={{
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    margin: '8px 0 0',
    textAlign: 'right'
  }}>
    — 24歳 男性・営業職
  </p>
</div>
```

### C. メタ情報バッジの改善

現在の「約8分 / 全57問 / 無料」のバッジを、より訴求力のある表現に変更する。

```
変更前: 🏠 約8分 / ✏ 全57問 / ✓ 無料
変更後: ⏱ 約7分 / 📝 全57問 / 🔓 無料・登録不要
```

「登録不要」はZ世代にとって重要な訴求ポイント。16Personalitiesもこれを強調している。

---

## 1-2. プログレスバーの改善（チャプター分割）

**対象：** 診断の設問表示画面

### A. チャプター定義の追加

設問のチャプター分けを定義する定数を追加する。

```javascript
const CHAPTERS = [
  {
    id: 1,
    name: 'あなたの行動パターン',
    questionRange: [0, 14],  // Q1〜Q15（15問）
    description: '日常の行動傾向を分析します'
  },
  {
    id: 2,
    name: 'あなたの思考スタイル',
    questionRange: [15, 31],  // Q16〜Q32（17問）
    description: '意思決定と思考の特性を分析します'
  },
  {
    id: 3,
    name: 'あなたの対人スタイル',
    questionRange: [32, 44],  // Q33〜Q45（13問）
    description: '人間関係の傾向を分析します'
  },
  {
    id: 4,
    name: 'あなたの価値観',
    questionRange: [45, 56],  // Q46〜Q57（12問）
    description: '行動の原動力を分析します'
  }
];
```

### B. プログレスバーUIコンポーネント

現在のプログレスバーを以下の構造に置き換える。

```jsx
const ProgressBar = ({ currentQuestion, totalQuestions }) => {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const currentChapter = CHAPTERS.find(ch =>
    currentQuestion >= ch.questionRange[0] && currentQuestion <= ch.questionRange[1]
  );
  const chapterProgress = currentChapter
    ? ((currentQuestion - currentChapter.questionRange[0] + 1) /
       (currentChapter.questionRange[1] - currentChapter.questionRange[0] + 1)) * 100
    : 0;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(13,17,23,0.95)',
      backdropFilter: 'blur(20px)',
      padding: '12px 20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* チャプター名 + 問番号 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: 'rgba(255,255,255,0.8)'
        }}>
          {currentChapter?.name}
        </span>
        <span style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          {currentQuestion + 1} / {totalQuestions}
        </span>
      </div>

      {/* メインプログレスバー */}
      <div style={{
        height: '4px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #00D2FF, #7B68EE)',
          borderRadius: '2px',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>

      {/* チャプターインジケーター */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginTop: '8px'
      }}>
        {CHAPTERS.map((ch) => {
          const isCompleted = currentQuestion > ch.questionRange[1];
          const isCurrent = currentChapter?.id === ch.id;
          return (
            <div
              key={ch.id}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '1.5px',
                background: isCompleted
                  ? '#00D2FF'
                  : isCurrent
                    ? `linear-gradient(90deg, #00D2FF ${chapterProgress}%, rgba(255,255,255,0.1) ${chapterProgress}%)`
                    : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s ease'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
```

### C. チャプター切り替え時のインタースティシャル

チャプターが完了するたびに、0.8秒のトランジション画面を表示する。

```jsx
const ChapterTransition = ({ chapter, onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '16px'
      }}>✓</div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '8px'
      }}>
        Chapter {chapter.id - 1} 完了！
      </h3>
      <p style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.5)'
      }}>
        次は「{chapter.name}」です
      </p>
    </div>
  );
};
```

---

## 1-3. タイプ別カラーシステムの定義

以下のカラー定義を定数としてファイルの上部に追加する。全Phaseで共通利用するため最初に定義する。

```javascript
// ===== タイプ別カラーシステム =====
const TYPE_COLORS = {
  // 性格類型グループカラー（1位軸で決定）
  P: {
    primary: '#FF6B6B',
    secondary: '#FFA07A',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FFA07A)',
    light: 'rgba(255,107,107,0.1)',
    glow: 'rgba(255,107,107,0.3)',
    label: 'エネルギー系'
  },
  A: {
    primary: '#4ECDC4',
    secondary: '#45B7D1',
    gradient: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
    light: 'rgba(78,205,196,0.1)',
    glow: 'rgba(78,205,196,0.3)',
    label: 'アナリティクス系'
  },
  I: {
    primary: '#96E6A1',
    secondary: '#7ED321',
    gradient: 'linear-gradient(135deg, #96E6A1, #7ED321)',
    light: 'rgba(150,230,161,0.1)',
    glow: 'rgba(150,230,161,0.3)',
    label: 'ハーモニー系'
  },
  D: {
    primary: '#A855F7',
    secondary: '#7C3AED',
    gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    light: 'rgba(168,85,247,0.1)',
    glow: 'rgba(168,85,247,0.3)',
    label: 'ドライブ系'
  }
};

// 行動類型のトーン変化（同系色の明度調整用）
const BEHAVIOR_TONE = {
  '達成型': { saturationShift: 0, lightnessShift: 0 },     // 最も鮮やか
  '効率型': { saturationShift: -5, lightnessShift: -8 },   // やや暗め
  '情報型': { saturationShift: -3, lightnessShift: 3 },    // 中間
  '外見型': { saturationShift: -10, lightnessShift: 15 },  // パステル
  '平和型': { saturationShift: -15, lightnessShift: 20 },  // 最もソフト
};

// 16タイプのメタデータ
const TYPE_META = {
  PP: { name: 'エンターテイナー', subname: '鼓舞者', group: 'P', emoji: '🎭' },
  PA: { name: 'アルチザン', subname: '芸術家', group: 'P', emoji: '🎨' },
  PI: { name: 'コラボレーター', subname: '協調者', group: 'P', emoji: '🤝' },
  PD: { name: 'アントレプレナー', subname: '起業家', group: 'P', emoji: '🚀' },
  AP: { name: 'プラクティショナー', subname: '実務家', group: 'A', emoji: '⚙️' },
  AA: { name: 'リサーチャー', subname: '情報家', group: 'A', emoji: '🔍' },
  AI: { name: 'ディリジェンサー', subname: '努力家', group: 'A', emoji: '📐' },
  AD: { name: 'アナリスト', subname: '分析官', group: 'A', emoji: '📊' },
  IP: { name: 'コントリビューター', subname: '貢献者', group: 'I', emoji: '💡' },
  IA: { name: 'サポーター', subname: '支援者', group: 'I', emoji: '🌱' },
  II: { name: 'ハーモナー', subname: '共感者', group: 'I', emoji: '🕊️' },
  ID: { name: 'シンカー', subname: '思考家', group: 'I', emoji: '🧩' },
  DI: { name: 'プロモーター', subname: '推進者', group: 'D', emoji: '⚡' },
  DP: { name: 'リーダー', subname: '指揮官', group: 'D', emoji: '👑' },
  DA: { name: 'ファシリテーター', subname: '先導者', group: 'D', emoji: '🧭' },
  DD: { name: 'イノベーター', subname: '変革者', group: 'D', emoji: '🔥' },
};

// カラーを取得するユーティリティ関数
function getTypeColor(personalityCode) {
  const firstLetter = personalityCode.charAt(0); // P, A, I, D
  return TYPE_COLORS[firstLetter] || TYPE_COLORS.P;
}
```

---

## 1-4. 結果ページのSNSシェアボタン追加

**対象：** 結果表示画面（診断完了後）

### A. シェアボタンコンポーネント

結果ページのヒーローセクション（タイプ名表示の直後）に設置する。

```jsx
const ShareButtons = ({ typeName, behaviorType, personalityCode, resultUrl }) => {
  const typeColor = getTypeColor(personalityCode);
  const typeMeta = TYPE_META[personalityCode];

  const shareText = `私は「${behaviorType}${typeMeta.name}」タイプでした！\n${typeMeta.emoji} ${typeMeta.subname} — 80タイプの中のあなたはどれ？\n\n`;
  const shareUrl = resultUrl || window.location.href;
  const hashtags = '80タイプ診断,パーソナルファイル';

  const shareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('リンクをコピーしました！');
    } catch {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('リンクをコピーしました！');
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      flexWrap: 'wrap',
      margin: '20px 0'
    }}>
      {/* X (Twitter) */}
      <button
        onClick={shareToX}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '16px' }}>𝕏</span>
        でシェア
      </button>

      {/* LINE */}
      <button
        onClick={shareToLine}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: '#06C755',
          color: '#fff',
          border: 'none',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        LINE
      </button>

      {/* リンクコピー */}
      <button
        onClick={copyLink}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        🔗 リンクコピー
      </button>
    </div>
  );
};
```

### B. OGPメタタグの動的設定

結果が確定した時点で、OGPメタタグを動的に書き換える関数を追加する。

```javascript
function updateOGPMeta(personalityCode, behaviorType) {
  const typeMeta = TYPE_META[personalityCode];
  const title = `${behaviorType}${typeMeta.name}（${typeMeta.subname}）| 80タイプ診断`;
  const description = `あなたは80タイプの中で「${behaviorType}${typeMeta.name}」でした。あなたのタイプは？`;

  // OGPタグの更新/追加
  const setMeta = (property, content) => {
    let meta = document.querySelector(`meta[property="${property}"]`) ||
               document.querySelector(`meta[name="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  document.title = title;
  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:type', 'website');
  setMeta('og:url', window.location.href);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
}
```

---

## 1-5. OGPシェアカード画像の自動生成（Canvas API）

結果確定時に、SNSシェア用の画像をCanvas APIで生成する。

```javascript
async function generateShareCard(personalityCode, behaviorType, keywords) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  const typeColor = getTypeColor(personalityCode);
  const typeMeta = TYPE_META[personalityCode];

  // 背景グラデーション
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#0D1117');
  bgGrad.addColorStop(1, '#1A1A2E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // タイプカラーのアクセント線（上部）
  const accentGrad = ctx.createLinearGradient(0, 0, 1200, 0);
  accentGrad.addColorStop(0, typeColor.primary);
  accentGrad.addColorStop(1, typeColor.secondary);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, 1200, 6);

  // タイプカラーの丸（装飾）
  ctx.beginPath();
  ctx.arc(1000, 315, 200, 0, Math.PI * 2);
  ctx.fillStyle = typeColor.light;
  ctx.fill();

  // タイトル「80 TYPE DIAGNOSIS」
  ctx.font = '600 18px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.letterSpacing = '4px';
  ctx.fillText('80 TYPE DIAGNOSIS', 80, 80);

  // 「あなたは」
  ctx.font = '400 24px "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('あなたは', 80, 200);

  // タイプ名（大きく）
  ctx.font = '800 56px "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${behaviorType}${typeMeta.name}`, 80, 280);

  // サブネーム
  ctx.font = '500 28px "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillStyle = typeColor.primary;
  ctx.fillText(`${typeMeta.subname}（${personalityCode}）`, 80, 330);

  // Emoji
  ctx.font = '120px sans-serif';
  ctx.fillText(typeMeta.emoji, 950, 350);

  // キーワードタグ
  if (keywords && keywords.length > 0) {
    const tagY = 420;
    let tagX = 80;
    ctx.font = '500 18px "Hiragino Sans", "Yu Gothic", sans-serif';
    keywords.slice(0, 3).forEach((kw) => {
      const text = `#${kw}`;
      const textWidth = ctx.measureText(text).width;
      // タグ背景
      ctx.fillStyle = typeColor.light;
      ctx.beginPath();
      ctx.roundRect(tagX - 8, tagY - 18, textWidth + 16, 32, 6);
      ctx.fill();
      // タグテキスト
      ctx.fillStyle = typeColor.primary;
      ctx.fillText(text, tagX, tagY + 4);
      tagX += textWidth + 28;
    });
  }

  // URL
  ctx.font = '400 16px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('personal-file.jp/80type', 80, 580);

  // PERSONAL FILE ロゴテキスト
  ctx.font = '700 16px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'right';
  ctx.fillText('PERSONAL FILE', 1120, 580);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}
```

**シェアカードの表示とダウンロードUI：**

```jsx
const ShareCardPreview = ({ imageDataUrl }) => {
  if (!imageDataUrl) return null;

  const downloadImage = () => {
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = '80type-result.png';
    a.click();
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '24px auto',
      textAlign: 'center'
    }}>
      <img
        src={imageDataUrl}
        alt="シェアカード"
        style={{
          width: '100%',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      />
      <button
        onClick={downloadImage}
        style={{
          marginTop: '12px',
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '24px',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        📥 画像を保存してシェア
      </button>
    </div>
  );
};
```

---

# Phase 2：結果ページの全面リデザイン

## 2-1. 結果ページのヒーローセクション

結果ページの最上部を、タイプカラーを活かしたビジュアルに刷新する。

```jsx
const ResultHero = ({ personalityCode, behaviorType, keywords, percentile }) => {
  const typeColor = getTypeColor(personalityCode);
  const typeMeta = TYPE_META[personalityCode];

  return (
    <div style={{
      background: typeColor.gradient,
      padding: '48px 24px 40px',
      borderRadius: '0 0 32px 32px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装飾 */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }} />

      {/* Emoji（キャラ代わり） */}
      <div style={{
        fontSize: '72px',
        marginBottom: '12px',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
      }}>
        {typeMeta.emoji}
      </div>

      {/* 「あなたのタイプ:」 */}
      <p style={{
        fontSize: '14px',
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        margin: '0 0 4px',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>
        あなたのタイプ
      </p>

      {/* タイプ名 */}
      <h1 style={{
        fontSize: '32px',
        fontWeight: '800',
        color: '#fff',
        margin: '0 0 4px',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        {behaviorType}{typeMeta.name}
      </h1>

      {/* サブネーム + コード */}
      <p style={{
        fontSize: '18px',
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        margin: '0 0 16px'
      }}>
        {typeMeta.subname}（{personalityCode}）
      </p>

      {/* キーワードタグ */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        {keywords.map((kw, i) => (
          <span key={i} style={{
            padding: '4px 14px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#fff'
          }}>
            #{kw}
          </span>
        ))}
      </div>

      {/* SNSシェアボタン（この位置に配置） */}
      {/* <ShareButtons ... /> をここに挿入 */}
    </div>
  );
};
```

---

## 2-2. 性格特性スコアスライダー（16Personalities式）

4軸のスコアをスライダー形式で表示する。

```jsx
const ScoreSliders = ({ scores }) => {
  // scores = { P: 32, A: 28, I: 20, D: 35 }（各軸の合計点。8問×5点=最大40点）
  const axes = [
    { left: '行動志向', right: '慎重志向', leftKey: 'P', rightKey: 'A', leftColor: TYPE_COLORS.P.primary, rightColor: TYPE_COLORS.A.primary },
    { left: '感覚重視', right: '論理重視', leftKey: 'P', rightKey: 'A', leftColor: TYPE_COLORS.P.primary, rightColor: TYPE_COLORS.A.primary },
    { left: '個人主義', right: '協調重視', leftKey: 'D', rightKey: 'I', leftColor: TYPE_COLORS.D.primary, rightColor: TYPE_COLORS.I.primary },
    { left: '安定志向', right: '挑戦志向', leftKey: 'I', rightKey: 'D', leftColor: TYPE_COLORS.I.primary, rightColor: TYPE_COLORS.D.primary },
  ];

  // 実際の4軸スコアから対比%を算出
  const computePercentage = (key1, key2) => {
    const total = scores[key1] + scores[key2];
    if (total === 0) return 50;
    return Math.round((scores[key1] / total) * 100);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          fontSize: '14px',
          fontWeight: '600'
        }}>1</span>
        性格特性
      </h2>

      {axes.map((axis, i) => {
        const leftPct = computePercentage(axis.leftKey, axis.rightKey);
        const rightPct = 100 - leftPct;
        const dominant = leftPct >= 50 ? 'left' : 'right';

        return (
          <div key={i} style={{ marginBottom: '20px' }}>
            {/* ラベル */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: dominant === 'left' ? '700' : '400',
                color: dominant === 'left' ? axis.leftColor : 'rgba(255,255,255,0.4)'
              }}>
                {axis.left}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: dominant === 'left' ? axis.leftColor : axis.rightColor
              }}>
                {dominant === 'left' ? `${leftPct}%` : `${rightPct}%`}
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: dominant === 'right' ? '700' : '400',
                color: dominant === 'right' ? axis.rightColor : 'rgba(255,255,255,0.4)'
              }}>
                {axis.right}
              </span>
            </div>

            {/* バー */}
            <div style={{
              display: 'flex',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)'
            }}>
              <div style={{
                width: `${leftPct}%`,
                background: axis.leftColor,
                borderRadius: leftPct > 50 ? '4px 0 0 4px' : '4px',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
              <div style={{
                width: `${rightPct}%`,
                background: axis.rightColor,
                borderRadius: rightPct > 50 ? '0 4px 4px 0' : '4px',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 2-3. 行動タイプ レーダーチャート（SVG）

5つの行動類型スコアを5角形のレーダーチャートで表示する。ライブラリ不要のSVG実装。

```jsx
const RadarChart = ({ behaviorScores, personalityCode }) => {
  // behaviorScores = { 達成: 20, 平和: 12, 情報: 22, 外見: 15, 効率: 18 }
  const typeColor = getTypeColor(personalityCode);
  const labels = ['達成', '平和', '情報', '外見', '効率'];
  const maxScore = 25; // 5問×5点
  const center = 150;
  const radius = 110;

  const getPoint = (index, value) => {
    const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
    const r = (value / maxScore) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0',
      textAlign: 'center'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          fontSize: '14px',
          fontWeight: '600'
        }}>2</span>
        行動タイプ分析
      </h2>

      <svg width="300" height="300" viewBox="0 0 300 300" style={{ maxWidth: '100%' }}>
        {/* グリッド */}
        {gridLevels.map((level, li) => (
          <polygon
            key={li}
            points={labels.map((_, i) => {
              const p = getPoint(i, maxScore * level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* 軸線 */}
        {labels.map((_, i) => {
          const p = getPoint(i, maxScore);
          return (
            <line
              key={i}
              x1={center} y1={center}
              x2={p.x} y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {/* データポリゴン */}
        <polygon
          points={labels.map((label, i) => {
            const p = getPoint(i, behaviorScores[label] || 0);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill={typeColor.glow}
          stroke={typeColor.primary}
          strokeWidth="2"
        />

        {/* データポイント */}
        {labels.map((label, i) => {
          const p = getPoint(i, behaviorScores[label] || 0);
          return (
            <circle
              key={`dot-${i}`}
              cx={p.x} cy={p.y} r="4"
              fill={typeColor.primary}
            />
          );
        })}

        {/* ラベル */}
        {labels.map((label, i) => {
          const p = getPoint(i, maxScore + 5);
          return (
            <text
              key={`label-${i}`}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="13"
              fontWeight="600"
            >
              {label}型
            </text>
          );
        })}
      </svg>
    </div>
  );
};
```

---

## 2-4. 強み・注意点の2カラムレイアウト

```jsx
const StrengthsWeaknesses = ({ strengths, weaknesses, personalityCode }) => {
  const typeColor = getTypeColor(personalityCode);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      margin: '24px 0'
    }}>
      {/* 強み */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '20px',
        borderTop: `3px solid ${typeColor.primary}`
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: typeColor.primary,
          marginBottom: '12px'
        }}>
          💪 強み
        </h3>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {strengths.map((item, i) => (
            <li key={i} style={{
              padding: '8px 0',
              borderBottom: i < strengths.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6'
            }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* 注意点 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '20px',
        borderTop: '3px solid rgba(255,200,100,0.6)'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: 'rgba(255,200,100,0.9)',
          marginBottom: '12px'
        }}>
          ⚠️ 注意したい点
        </h3>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {weaknesses.map((item, i) => (
            <li key={i} style={{
              padding: '8px 0',
              borderBottom: i < weaknesses.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6'
            }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

---

## 2-5. 適職セクション

```jsx
const CareerSection = ({ careers, personalityCode }) => {
  const typeColor = getTypeColor(personalityCode);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          fontSize: '14px',
          fontWeight: '600'
        }}>3</span>
        適した職種
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '12px'
      }}>
        {careers.map((career, i) => (
          <div key={i} style={{
            padding: '16px',
            background: typeColor.light,
            borderRadius: '12px',
            borderLeft: `3px solid ${typeColor.primary}`
          }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '4px'
            }}>
              {career.title}
            </div>
            {career.description && (
              <div style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5'
              }}>
                {career.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 2-6. ぼかしセクション（作業・社風・上司・部下・働き方）+ 面談CTA

```jsx
const BlurredSection = ({ items, personalityCode }) => {
  const typeColor = getTypeColor(personalityCode);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0',
      position: 'relative'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          fontSize: '14px',
          fontWeight: '600'
        }}>4</span>
        あなたに合う働き方
      </h2>

      {/* 見出しのみ表示、詳細はぼかし */}
      <div style={{ position: 'relative' }}>
        {['作業スタイル', '社風', '上司タイプ', '部下タイプ', '働き方'].map((label, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.8)',
              minWidth: '100px'
            }}>
              {label}
            </span>
            <span style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.5)',
              filter: 'blur(5px)',
              userSelect: 'none'
            }}>
              詳細な分析結果がここに表示されます。面談で詳しくお伝えします。
            </span>
          </div>
        ))}

        {/* オーバーレイCTA */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(transparent 20%, rgba(13,17,23,0.9) 80%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '12px'
            }}>
              🔓 詳しい分析結果は面談でお伝えします
            </p>
            <button
              style={{
                padding: '14px 32px',
                background: typeColor.gradient,
                color: '#fff',
                border: 'none',
                borderRadius: '28px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${typeColor.glow}`
              }}
            >
              無料面談で詳しく知る →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 2-7. 転職意向ヒアリング（結果ページ末尾）

```jsx
const CareerIntentQuestion = ({ onSelect, personalityCode }) => {
  const typeColor = getTypeColor(personalityCode);
  const [selected, setSelected] = React.useState(null);

  const options = [
    { id: 1, text: '今すぐ転職・就職したい', route: 'consultation' },
    { id: 2, text: '半年以内に考えている', route: 'consultation' },
    { id: 3, text: '1年以上先に考えている', route: 'affiliate' },
    { id: 4, text: '今は考えていない', route: 'affiliate' },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0',
      textAlign: 'center'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '20px'
      }}>
        あなたの今の転職・就職意向を教えてください
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setSelected(opt.id);
              onSelect(opt);
            }}
            style={{
              padding: '14px 20px',
              background: selected === opt.id ? typeColor.light : 'rgba(255,255,255,0.05)',
              border: selected === opt.id
                ? `2px solid ${typeColor.primary}`
                : '2px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left'
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## 2-8. スティッキーサイドバー（PC向け）

PC表示時（min-width: 768px）に右側に追従するナビゲーション。

```jsx
const StickySidebar = ({ personalityCode, behaviorType, sections }) => {
  const typeColor = getTypeColor(personalityCode);
  const typeMeta = TYPE_META[personalityCode];
  const [activeSection, setActiveSection] = React.useState(0);

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.sectionIndex);
          if (!isNaN(idx)) setActiveSection(idx);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('[data-section-index]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{
      position: 'sticky',
      top: '24px',
      width: '220px',
      flexShrink: 0,
      display: 'none', // デフォルト非表示（CSSメディアクエリで表示）
    }}
    className="sticky-sidebar"
    >
      {/* タイプ情報 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        textAlign: 'center',
        borderTop: `3px solid ${typeColor.primary}`
      }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{typeMeta.emoji}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>あなたのタイプ:</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
          {behaviorType}{typeMeta.name}
        </div>
        <div style={{ fontSize: '13px', color: typeColor.primary }}>
          {typeMeta.subname}（{personalityCode}）
        </div>
      </div>

      {/* 目次 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          このページ内
        </div>
        {sections.map((section, i) => (
          <a
            key={i}
            href={`#section-${i}`}
            style={{
              display: 'block',
              padding: '8px 12px',
              fontSize: '13px',
              color: activeSection === i ? typeColor.primary : 'rgba(255,255,255,0.6)',
              fontWeight: activeSection === i ? '700' : '400',
              textDecoration: 'none',
              borderLeft: activeSection === i
                ? `3px solid ${typeColor.primary}`
                : '3px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            {i + 1}. {section}
          </a>
        ))}
      </div>

      {/* シェアCTA */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button style={{
          padding: '10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'center'
        }}>
          🔗 結果を共有しましょう
        </button>
      </div>
    </div>
  );
};
```

**メディアクエリ（CSSに追加）：**

```html
<style>
  @media (min-width: 900px) {
    .sticky-sidebar {
      display: block !important;
    }
    .result-main-content {
      display: flex;
      gap: 32px;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .result-content-area {
      flex: 1;
      min-width: 0;
    }
  }
</style>
```

---

## 2-9. 結果ページの全体レイアウト組み立て

上記コンポーネントを組み合わせた結果ページの構造。

```jsx
const ResultPage = ({ result }) => {
  // result = {
  //   personalityCode: 'DP',
  //   behaviorType: '情報型',
  //   scores: { P: 28, A: 30, I: 18, D: 36 },
  //   behaviorScores: { 達成: 18, 平和: 12, 情報: 23, 外見: 14, 効率: 20 },
  //   keywords: ['分析力', '決断力', '戦略的思考', '独立志向', '情報収集'],
  //   strengths: ['情報収集力と分析力が高い', '決断が速く実行力がある', ...],
  //   weaknesses: ['他者の感情に鈍感になりがち', '独断的になりやすい', ...],
  //   careers: [{ title: 'コンサルタント', description: '...' }, ...],
  //   shareCardUrl: null
  // }

  const [shareCardUrl, setShareCardUrl] = React.useState(null);
  const [careerIntent, setCareerIntent] = React.useState(null);

  React.useEffect(() => {
    // OGPメタ更新
    updateOGPMeta(result.personalityCode, result.behaviorType);

    // シェアカード生成
    generateShareCard(result.personalityCode, result.behaviorType, result.keywords)
      .then(url => setShareCardUrl(url));
  }, []);

  const sections = [
    '性格特性',
    '行動タイプ分析',
    '適した職種',
    'あなたに合う働き方',
    '転職意向',
  ];

  return (
    <div>
      {/* ヒーロー */}
      <ResultHero
        personalityCode={result.personalityCode}
        behaviorType={result.behaviorType}
        keywords={result.keywords}
      />

      {/* シェアボタン */}
      <div style={{ padding: '0 20px' }}>
        <ShareButtons
          typeName={TYPE_META[result.personalityCode].name}
          behaviorType={result.behaviorType}
          personalityCode={result.personalityCode}
        />
      </div>

      {/* シェアカード */}
      <div style={{ padding: '0 20px' }}>
        <ShareCardPreview imageDataUrl={shareCardUrl} />
      </div>

      {/* メインコンテンツ（PC: 2カラム、SP: 1カラム） */}
      <div className="result-main-content">
        <div className="result-content-area">
          {/* ① 性格特性スライダー */}
          <div data-section-index="0" id="section-0">
            <ScoreSliders scores={result.scores} />
          </div>

          {/* ② 行動タイプ レーダーチャート */}
          <div data-section-index="1" id="section-1">
            <RadarChart
              behaviorScores={result.behaviorScores}
              personalityCode={result.personalityCode}
            />
          </div>

          {/* ③ 強み・注意点 */}
          <StrengthsWeaknesses
            strengths={result.strengths}
            weaknesses={result.weaknesses}
            personalityCode={result.personalityCode}
          />

          {/* ④ 適した職種 */}
          <div data-section-index="2" id="section-2">
            <CareerSection
              careers={result.careers}
              personalityCode={result.personalityCode}
            />
          </div>

          {/* ⑤ ぼかしセクション（働き方相性） */}
          <div data-section-index="3" id="section-3">
            <BlurredSection personalityCode={result.personalityCode} />
          </div>

          {/* ⑥ 転職意向ヒアリング */}
          <div data-section-index="4" id="section-4">
            <CareerIntentQuestion
              personalityCode={result.personalityCode}
              onSelect={(opt) => {
                setCareerIntent(opt);
                // Meta Pixelイベント発火
                if (typeof fbq !== 'undefined') {
                  fbq('trackCustom', 'CTA80TypeClick', {
                    type: result.personalityCode,
                    behavior: result.behaviorType,
                    intent: opt.text,
                    route: opt.route
                  });
                }
              }}
            />
          </div>

          {/* ⑦ CTA（転職意向に応じた分岐） */}
          {careerIntent && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '32px 24px',
              margin: '24px 0',
              textAlign: 'center'
            }}>
              {careerIntent.route === 'consultation' ? (
                // 面談CTA
                <>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>
                    あなたの80タイプを活かした転職相談
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                    専門アドバイザーが診断結果をもとに、あなたに合った企業を提案します
                  </p>
                  <a
                    href="【面談登録URL】"
                    style={{
                      display: 'inline-block',
                      padding: '16px 40px',
                      background: 'linear-gradient(135deg, #00D2FF, #7B68EE)',
                      color: '#fff',
                      borderRadius: '28px',
                      fontSize: '16px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(0,210,255,0.3)'
                    }}
                  >
                    無料面談に申し込む
                  </a>
                </>
              ) : (
                // アフィリエイトCTA（枠のみ。荻久保がURLをはめる）
                <>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>
                    あなたのタイプにおすすめのスキルアップ
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                    {result.behaviorType}{TYPE_META[result.personalityCode].name}のあなたに合ったスクールを厳選
                  </p>
                  {/* アフィリエイトリンク枠（URLが空の場合は面談CTAにフォールバック） */}
                  <div id={`affiliate-slot-${result.personalityCode}`}>
                    {/* 荻久保がここにリンクを差し込む */}
                    <a
                      href="【面談登録URL】"
                      style={{
                        display: 'inline-block',
                        padding: '16px 40px',
                        background: 'linear-gradient(135deg, #00D2FF, #7B68EE)',
                        color: '#fff',
                        borderRadius: '28px',
                        fontSize: '16px',
                        fontWeight: '700',
                        textDecoration: 'none'
                      }}
                    >
                      無料面談に申し込む
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ⑧ 全タイプ一覧グリッド */}
          <TypeGrid currentType={result.personalityCode} />
        </div>

        {/* スティッキーサイドバー（PC） */}
        <StickySidebar
          personalityCode={result.personalityCode}
          behaviorType={result.behaviorType}
          sections={sections}
        />
      </div>
    </div>
  );
};
```

---

## 2-10. 全16タイプ一覧グリッド

```jsx
const TypeGrid = ({ currentType }) => {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        全16タイプ一覧
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px'
      }}>
        {Object.entries(TYPE_META).map(([code, meta]) => {
          const color = TYPE_COLORS[meta.group];
          const isCurrent = code === currentType;

          return (
            <div
              key={code}
              style={{
                padding: '14px 10px',
                background: isCurrent ? color.light : 'rgba(255,255,255,0.02)',
                border: isCurrent ? `2px solid ${color.primary}` : '2px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{meta.emoji}</div>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: isCurrent ? color.primary : 'rgba(255,255,255,0.7)',
              }}>
                {meta.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
              }}>
                {meta.subname}（{code}）
              </div>
              {isCurrent && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: color.primary,
                }}>
                  ← あなた
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

# Phase 3：診断画面のリデザイン（1問1画面化）

## 3-1. 1問1画面の設問コンポーネント

現在の設問表示を、Typeform/16Personalities風の1問1画面UIに変更する。

```jsx
const QuestionScreen = ({ question, questionIndex, totalQuestions, onAnswer }) => {
  const [selectedValue, setSelectedValue] = React.useState(null);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const options = [
    { value: 1, label: 'まったく当てはまらない' },
    { value: 2, label: 'あまり当てはまらない' },
    { value: 3, label: 'どちらとも言えない' },
    { value: 4, label: 'やや当てはまる' },
    { value: 5, label: 'とても当てはまる' },
  ];

  const handleSelect = (value) => {
    setSelectedValue(value);
    setIsAnimating(true);

    // 0.5秒後に次の問題へ
    setTimeout(() => {
      onAnswer(value);
      setSelectedValue(null);
      setIsAnimating(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      animation: isAnimating ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* 設問テキスト */}
      <h2 style={{
        fontSize: '22px',
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        lineHeight: '1.6',
        marginBottom: '40px'
      }}>
        {question.text}
      </h2>

      {/* 回答ボタン群 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '400px'
      }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            disabled={selectedValue !== null}
            style={{
              padding: '16px 20px',
              background: selectedValue === opt.value
                ? 'linear-gradient(135deg, #00D2FF, #7B68EE)'
                : 'rgba(255,255,255,0.05)',
              border: selectedValue === opt.value
                ? 'none'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: selectedValue === opt.value ? '700' : '500',
              cursor: selectedValue !== null ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              transform: selectedValue === opt.value ? 'scale(1.02)' : 'scale(1)',
              textAlign: 'center'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
```

## 3-2. 診断完了時のコンフェティ（紙吹雪）エフェクト

最後の設問に回答後、結果計算中に表示する。

```jsx
const Confetti = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 1 + Math.random() * 2,
    color: ['#FF6B6B', '#4ECDC4', '#96E6A1', '#A855F7', '#00D2FF', '#FFD700'][Math.floor(Math.random() * 6)]
  }));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-10px',
            width: '8px',
            height: '8px',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: p.color,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`
          }}
        />
      ))}
    </div>
  );
};
```

**CSSアニメーション（追加）：**

```html
<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  @keyframes confettiFall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
</style>
```

---

## 3-3. 結果計算中のローディング画面

```jsx
const LoadingResult = ({ onComplete }) => {
  const [step, setStep] = React.useState(0);
  const steps = [
    '性格類型を分析中...',
    '行動パターンを解析中...',
    '80タイプの中からマッチング中...',
    'あなたのタイプが判明しました！'
  ];

  React.useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setStep(i), i * 800)
    );
    const complete = setTimeout(onComplete, steps.length * 800 + 400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(complete);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px'
    }}>
      <Confetti />
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '4px solid rgba(255,255,255,0.1)',
        borderTopColor: '#00D2FF',
        animation: 'spin 1s linear infinite',
        marginBottom: '32px'
      }} />
      <p style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#fff',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {steps[step]}
      </p>
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '8px'
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: i <= step ? '#00D2FF' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s ease'
          }} />
        ))}
      </div>
    </div>
  );
};
```

**CSS追加：**
```html
<style>
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

---

# Phase 4：グローバルCSS・レスポンシブ・仕上げ

## 4-1. グローバルスタイルの追加

HTMLファイルの `<head>` 内に以下のスタイルを追加する。

```html
<style>
  /* === ベースリセット === */
  * { box-sizing: border-box; }
  body {
    font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* === スクロールバーのスタイル === */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 3px;
  }

  /* === アニメーション === */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  @keyframes confettiFall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  /* === レスポンシブ === */
  @media (min-width: 900px) {
    .sticky-sidebar {
      display: block !important;
    }
    .result-main-content {
      display: flex;
      gap: 32px;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .result-content-area {
      flex: 1;
      min-width: 0;
    }
  }

  /* === スマホ最適化 === */
  @media (max-width: 480px) {
    .result-hero h1 {
      font-size: 26px !important;
    }
  }

  /* === タッチフィードバック === */
  button:active {
    transform: scale(0.98) !important;
    transition: transform 0.1s ease !important;
  }

  /* === セーフエリア対応（iPhone） === */
  body {
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>
```

---

# 実装時の注意事項

## 技術制約（必ず守ること）

1. **単一HTMLファイル構成を維持する。** ファイルを分割しないこと。
2. **React via CDN + Babel を使用する。** import/export 文は使用不可。すべてグローバルスコープに定義する。
3. **外部ライブラリのインストール不可。** Chart.jsなどは使わない。SVGで自作する。
4. **Meta Pixelの既存実装を壊さないこと。** `CTA80TypeClick` カスタムイベントは維持し、転職意向ヒアリングの回答時にも発火させる。
5. **CDN読み込みのURL例（必要な場合）:**
   ```html
   <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
   <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
   ```

## データの扱い

1. **80タイプの結果データ（タイプ名、説明、強み、弱み、適職など）は `80タイプ性格診断結果.xlsx` に全データが入っている。** このExcelの内容をJavaScriptのオブジェクトとしてコード内に埋め込むこと。
2. **タイプ名は `ClaudeCode_引き継ぎ情報.md` のセクション2-3の正式名称のみ使用すること。** 旧名称（「〜タイプ」表記）は使用禁止。
3. **判定ロジック:**
   - P / A / I / D の4軸を各8問・5段階評価で測定
   - 最高得点軸 → 基本系統、2位軸 → 補助系統
   - 1位と2位の差が16点以上 → 純粋類型
   - 同点時の優先順位：D → P → A → I

## 設問順序

設問は性格類型と行動類型を混合したランダム順で出題する。出題順はセッション内で固定（毎回同じランダム順）。ユーザーごとにシャッフルは不要。

---

*このプロンプトは2026年3月11日に作成されました。*
*Phase単位で実行し、各Phase完了後に動作確認を行ってから次に進んでください。*
