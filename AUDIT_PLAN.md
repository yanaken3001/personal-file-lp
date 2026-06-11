# 80CARDS サイト総合監査レポート（AUDIT_PLAN）

- 監査日: 2026-06-11
- 対象: `80cards/` 配下全ファイル（本番: https://www.personal-file.jp/80cards/index.html）
- フェーズ: **調査専用（コード変更なし）**。本書の行番号は監査日時点の `80cards/index.html`（14,441行・832KB）基準。
- 全体アーキテクチャ要約:
  - `index.html` 単一ファイルに CSS 約6,400行（147〜6522行）と React 18 JSX 約7,900行（6535〜14439行）を内包。**Babel Standalone によるブラウザ内実行時トランスパイル**で動作するSPA。
  - 80タイプ全データ（`TYPES_80`、約2,655行）もJS内にハードコード。ビルドステップなし。
  - 周辺に `compatibility.html`（相性・データ二重定義あり）、`types.html`、`contact.html`（GAS送信）、`contact-thanks.html`（Jicoo予約）、`dev-results.html`（開発用）、`share/` 配下176枚のOGP用静的ページ。
  - 状態は全てインメモリReact state。永続化はsessionStorage 1箇所（contact導線のコンテキスト引き継ぎ）のみ。

---

## 1. エグゼクティブサマリ（重大な発見トップ5）

1. **【B/G・高】Babel Standalone による実行時トランスパイル＋CDNバージョン無指定**
   7,900行のJSXを毎回ブラウザでトランスパイル（スマホで推定2〜4秒のメインスレッド占有、LCP推定5〜8秒）。さらに `@babel/standalone` は**バージョン無指定**（index.html:6528）のため、unpkg側のメジャー更新でサイトが突然壊れるリスクが常在。React/Babel/html2canvas の4本全てに SRI（integrity）なし。バージョン固定とSRI追加は挙動変化ゼロで即可能。

2. **【A・高】診断途中のリロード／ブラウザ「戻る」で57問の回答が全消失＋白画面対策なし**
   進行状態の永続化なし（localStorage未使用）、history API/popstate 未実装、React Error Boundary なし、CDN障害時のフォールバック・noscriptもなし。57問（約3分）という長い診断で途中事故＝完全離脱になる。クリティカルパス上で最も収益に直結する欠陥。

3. **【E・高】相性シェアURLが常にトップページ固定で、タイプ情報が乗らない（バイラル損失）**
   相性結果のシェア（index.html:13785）は `https://www.personal-file.jp/80cards/` 固定。受け取った友達は相性結果に到達できない。また**LINE公式アカウントの友達追加CTA（lin.ee等）は全ページに1つも存在しない**（現行の収益導線はJicoo面談予約のみ）。個人診断結果のシェアボタンにLINEシェアもない。仕様か欠落かの判断が必要。

4. **【B・高】html2canvas（約300KB）が完全未使用なのに同期ブロッキング読み込み**
   index.html:6530で読み込むが呼び出し箇所ゼロ（カード画像はCanvas API直描画）。scriptタグ1行削除だけでLCP/INPが200〜500ms改善見込み。**ノーリスクで即効く唯一の修正**。

5. **【F・中】データの二重管理と832KB単一ファイル**
   `TYPE_NICKNAMES`・`TYPE_CATCHCOPY`・`COMPATIBILITY_MATRIX`・`getCharacterImage` が index.html と compatibility.html に完全重複定義。片方だけ更新すると不整合が起きる構造。なお懸念されていた旧あだ名は**タイプ名としては残存ゼロ**（types.html・share/全176ページとも現行名で一致確認済み。「歩くWikipedia」は説明文中の比喩6箇所のみ。ただし index.html:6811 の summary フィールドは旧あだ名の名残の可能性があり要判断）。

---

## 2. 現状仕様ドキュメント（診断判定ロジック）

> リファクタリング時のリグレッション検知基準。**この仕様の数値・順序を1つでも変えると診断結果が変わる。**

### 2-1. 質問構造（57問）

定義: `QUESTIONS_80`（index.html:9196-9263）、出題順 `QUESTION_ORDER`（9265-9277）

| 軸 | 種別 | 問数 | reverse問 |
|---|---|---|---|
| P / A / I / D | 基本タイプ4軸 | 各8問（計32問） | P-4, A-6, I-7, D-5 |
| K(達成) / H(調和) / J(情報) / G(演出) / E(効率) | 行動類型5軸 | 各5問（計25問） | K-4, J-4, G-4, E-4（Hなし） |

- 回答: 5段階リッカート（rawValue 1〜5）。
- 出題順は4ブロック混在配置（QUESTION_ORDER 固定配列。ランダム化なし）。

### 2-2. スコア計算式（index.html:9574-9606）

```
通常問:    scored = reverse ? (6 - raw) : raw;  scores[axis] += scored
pair問:    scores[agreeAxis] += scored;  scores[disagreeAxis] += (6 - scored)   ※合計常に6
再回答:    旧回答を multiplier=-1 で減算してから新回答を加算（14237-14241, 14299-14303）
```

- 正規化なし。生合計で比較。
- レンジ: 基本軸 8〜40点、行動軸 5〜25点。全問「3」回答時: P=A=I=D=24、K=H=J=G=E=15。

### 2-3. タイプ判定

**基本16タイプ `determinePersonalityType`（9456-9474）**
1. D/P/A/I を降順ソート。完全同点時の優先度: **D > P > A > I**
2. 1位−2位 **≥ 12点** → 1位重複コード（例: DD）／ **< 12点** → 1位+2位（例: DA）

**行動類型 `determineBehavioralType`（9477-9498）**
1. K/H/J/G/E を降順ソート
2. 同点時: 性格主軸マッチを優先（P主軸→K、D主軸→K、A主軸→J、I主軸→H）。それも無ければ固定優先度 **K > H > J > G > E**

**80タイプ = 16基本タイプ × 5行動類型**。`TYPES_80` のキーは `行動類型名+あだ名`（例: 「効率型氷の頭脳」）。

### 2-4. 閾値（マジックナンバー）一覧

| 定数 | 値 | 場所 | 用途 |
|---|---|---|---|
| PERSONALITY_TIE_THRESHOLD | 2 | 9286 | 基本軸1-2位差≤2でアダプティブ発動 |
| BEHAVIOR_TIE_THRESHOLD | 1 | 9287 | 行動軸1-2位差≤1でアダプティブ発動 |
| MAX_ADAPTIVE_QUESTIONS | 8 | 9288 | 追加質問上限 |
| （未命名）12 | 12 | 9470付近 | 基本軸「独走」判定（XX型化）の閾値 |

### 2-5. アダプティブ質問（9525-9572）

- 57問目回答直後に判定。基本軸同点なら4問、行動軸同点なら4問、両方なら8問追加（最大65問）。
- 全て `scoring: "pair"`。質問文は `PERSONALITY_TIE_ITEMS` / `BEHAVIOR_TIE_ITEMS`（9290-9330）。
- 57問目より前に戻るとアダプティブ問はリセット（14250-14253）。

### 2-6. 80CODE仕様（9715-9750）

`get80Code = BEHAVIOR_CODE_PREFIX[行動類型名] + 基本タイプ2文字`

| 行動類型 | 現行2文字 | 旧1文字（getLegacyShareCode・**現在未使用=デッドコード**） |
|---|---|---|
| 達成型 | AC | a |
| 調和型 | HM | h |
| 効率型 | EF | e |
| 演出型 | SH | s |
| 情報型 | IN | i |

- パターン番号 `getPatternNo`（11321-11328）= 行動類型index×16 + タイプindex + 1。タイプ順は `TYPE_ORDER_CLEAN`（11322）で、`PERSONALITY_NAMES`（9188）とD系の並びが異なる点に注意（patternNo計算はTYPE_ORDER_CLEAN基準）。
- 相性URL: `?match=` + `btoa(JSON.stringify({t: typeCode, b: behaviorCode}))`（9892-9903）。デコード失敗はtry-catchでnull→通常フローへ。

### 2-7. 状態管理仕様

- React state: `phase` / `qIndex` / `scores` / `answerHistory` / `adaptiveQuestions`（14206-14211）。**永続化なし**。
- sessionStorage: `pf80cardsResultContext` 1箇所のみ（12436-12447、try-catch済）。contact.html→contact-thanks.html→Jicoo予約プリフィルへ引き継ぎ。
- `answerHistory=Array(56).fill(3)`（9655）は開発用プリセット。`ALLOW_DEV_RESULT_PREVIEW`（ローカル/dev-results.html iframe時のみ有効、9631-9632）のため**本番診断には影響しない**。

### 2-8. リグレッション検証用テストベクトル（コードリーディングから導出・要実測確認）

| # | 入力（概要） | 期待結果 |
|---|---|---|
| 1 | P軸全問5（P-4はraw=1）、他全問1（reverse問はraw=5） | P=40,他8 → **PP**×達成型 = **ACPP**（行動軸同点4問追加） |
| 2 | D軸全問5、E軸全問5、他全問1 | D=40,E=25 → **DD**×効率型 = **EFDD**（追加質問なし・57問終了） |
| 3 | A=32, J=20, E=20, 他低 | **AA**×情報型 = **INAA**（行動軸タイブレーク4問追加） |
| 4 | 全問「3」回答 | 全軸同点 → D>P優先・差0<12 → **DP**×達成型 = **ACDP**（8問追加・最大） |
| 5 | D=38, A=36, G=24, 他低 | 差2<12 → **DA**×演出型 = **SHDA**（基本軸4問追加) |

---

## 3. 指摘一覧テーブル

影響度: 高/中/低。修正リスク: 挙動変化の可能性（無=1pxも変わらない／低=要目視／中=タイミング等変化／高=設計変更）。工数: S(〜30分)/M(〜半日)/L(1日〜)。

### A. 不具合・潜在バグ

| ID | 分類 | 内容（場所） | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| A-1 | A | 診断途中リロードで回答全消失。永続化なし（index.html:14206-14211） | 高 | 中（復元仕様の設計が必要） | M | Yes |
| A-2 | A | ブラウザ「戻る」で診断全消失。history/popstate未実装 | 高 | 中 | M | Yes |
| A-3 | A | React Error Boundary なし。コンポーネント例外で白画面 | 高 | 無（正常系は不変。異常系にフォールバックUIが増えるのみ） | S | No |
| A-4 | A | CDN（unpkg×3, cdnjs×1）失敗で完全白画面。noscriptすらない（6525-6530） | 高 | 無（noscript/エラーメッセージ追加のみなら） | S〜L | No(暫定)/Yes(根本) |
| A-5 | A | MatchModalのクリップボードコピーに.catchなし。失敗時フィードバックゼロ（14093-14098。ShareButtons側11170にはフォールバックあり） | 中 | 無 | S | No |
| A-6 | A | compatibility.html copyUrl() に.catchなし（compatibility.html:1685） | 中 | 無 | S | No |
| A-7 | A | generateCompatibilityCardのcatchが空でエラー握りつぶし（13776-13779） | 低 | 無 | S | No |

### B. パフォーマンス

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| B-1 | B | Babel Standaloneで7,900行JSXを実行時トランスパイル。スマホで2〜4秒メインスレッド占有、LCP推定5〜8秒、その間タップ不能（INP最悪要因） | 高 | 高（事前ビルド移行は設計変更） | L | No(出力同等を目指す) |
| B-2 | B | html2canvas（約300KB）完全未使用なのに同期読み込み（6530）。呼び出しゼロ確認済み | 高 | **無（削除のみ・完全安全）** | S | No |
| B-3 | B | React/ReactDOM/Babelにasync/deferなし→HTMLパースブロック（6525-6528）。deferは文書順実行のため依存関係は保たれる | 高 | 低（描画タイミングが変わるため要目視） | S | No |
| B-4 | B | character/*.png（16枚・計約11MB）がPNGのまま。card-backgroundはwebp済みなのに不揃い。LCP 0.5〜1秒改善余地 | 高 | 低（webp化＋getCharacterImage:9756の拡張子変更。画質要目視） | M | No |
| B-5 | B | 未使用CSS約1,200〜1,400行（旧テーマ群: .site-header, .start-screen, .result-screen, .line-section等、主に147-1741行に集中。全CSSの約20%） | 中 | 低（網羅照合の上で削除。要目視） | M | No |
| B-6 | B | Webフォント6ファミリー・20ウェイト超を一括読込（126行）。Noto Sans JP 300等未使用疑いウェイトあり | 中 | 低（誤削除でfallback太さ変化のリスク） | S | No |
| B-7 | B | キャラ画像imgにwidth/height属性なし→CLS要因（11553-11575）。style指定が優先されるため属性追加は表示不変 | 中 | 無 | S | No |
| B-8 | B | デッドアセット計約12MB超: share-character/全16枚（未参照）、character/日本語名PNG16枚、logo/未参照7枚（80cards-logo-full.png, -new.png, -compact.png, 80CARDSロゴ.png, アイコン.png, LINE背景.png, LINEアイコン.png） | 低 | 無（配信されないので性能影響はないが整理価値あり） | S | No |

### C. デザイン・UX

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| C-1 | C | viewport `maximum-scale=1.0, user-scalable=no`（index.html:14のみ。他ページは正常）。WCAG 1.4.4違反。iOS Safariは無視するがAndroid一部で拡大不能 | 高 | 中（ピンチズាム可能になる=挙動変化） | S | **Yes** |
| C-2 | C | 「← 前の質問に戻る」ボタンの実効高さ約33px（44px未満）（CSS 2214-2228） | 中 | 中（見た目変化） | S | Yes |
| C-3 | C | モーダル閉じるボタン36×36px（44px未満）（CSS 3468-3481） | 中 | 中 | S | Yes |
| C-4 | C | 回答選択後の非選択肢 opacity 0.28 →コントラスト約1.5:1。低視力者には選択肢消失に近い（2188） | 中 | 中 | S | Yes |
| C-5 | C | ダークモード未対応（prefers-color-scheme記述ゼロ）。theme-color #faf9f7 ライト固定（37行） | 低 | 中 | S〜L | Yes |
| C-6 | C | 進捗UI・自動遷移・チャプター演出・アダプティブ告知は**実装済みで良好**（事実記録: ProgressBar80のN/57表示、500ms自動遷移10777-10788、ChapterTransition 14280-14283、AdaptiveIntroScreen 14261） | - | - | - | - |

### D. アクセシビリティ

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| D-1 | D | プログレスバーに role="progressbar"/aria-value* なし（1742付近） | 中 | 無 | S | No |
| D-2 | D | MatchShareModalに role="dialog"/aria-modal なし（14100付近。PersonalFileResultModal側は実装済み） | 中 | 無 | S | No |
| D-3 | D | `.lp-type-menu-type-clean:focus { outline: none }` でフォーカスリング消去（5503-5508）。`:focus-visible`化で実質無変化にできる | 中 | 無〜低 | S | No |
| D-4 | D | モーダル2種ともフォーカストラップなし | 中 | 無 | S | No |
| D-5 | D | 質問文がh2（10810）→SRが57問全てを見出し認識。h1も状態により2箇所（10545, 12171） | 中 | 無（視覚不変のセマンティクス変更） | S | No |
| D-6 | D | --text-tertiary #9590A5 の11pxテキストがコントラスト約3.1:1（AA未達） | 中 | 中（色 or サイズ変更=見た目変化） | S | Yes |
| D-7 | D | alt属性はほぼ完備（10/10。alt="シェアカード"の汎用性のみ改善余地） | 低 | 無 | S | No |

### E. SEO / OGP / シェア / LINE導線

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| E-1 | E | **相性シェアURLが常にトップ固定**（13785）。タイプ・相性情報がURLに乗らず、受け手が結果に到達できない。encodeMatchData活用で改善可能 | 高 | 中（シェア先URLが変わる=機能追加） | M | **Yes** |
| E-2 | E | **LINE友達追加CTA（lin.ee等）が全ページに不在**。LINEシェアも相性結果のみで個人結果シェアにはなし（ShareButtons 11189-11212）。現行の収益導線はJicoo予約のみ | 高 | 中（CTA追加=仕様追加） | M | **Yes**（事業判断） |
| E-3 | E | updateOGPMeta（10981-11009）が og:image を更新しない。index.html直シェア時は常にトップ用ogp.png | 中 | 無（meta更新1行。なおSNSボットはJS非実行のため効果は限定的、要検証） | S | No |
| E-4 | E | Jicoo予約プリフィルのパラメータキーが日本語（contact-thanks.html:355「携帯番号（…）」）。動作はJicoo実装依存で不安定 | 中 | 低（Jicoo側仕様確認が前提） | S | 要確認 |
| E-5 | E | 旧3文字shareページのtitle/canonical不一致（share/aaa/: titleはACAAだがcanonicalはaaa/。haa/等も同様）。noindexのため実害限定 | 中 | 無（canonicalを4文字版に向けるだけなら） | S | No |
| E-6 | E | 相性結果Xシェアが旧 twitter.com/intent（13788。個人結果はx.comに統一済み） | 低 | 無 | S | No |
| E-7 | E | トップogp.pngが2752×1536（推奨1200×630の4倍超。JSON-LDのprimaryImageOfPageにも同値） | 低 | 低（画像差し替え） | S | No |
| E-8 | E | 健全な点（事実記録）: canonical正規化OK（/80cards/に統一）、share/176ページのOGP画像は全て実在・壊れリンクゼロ、share配下noindex＋twitterbot許可は意図的設計、sitemap 6URLは妥当 | - | - | - | - |

### F. コード品質

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| F-1 | F | TYPE_NICKNAMES / TYPE_CATCHCOPY / COMPATIBILITY_MATRIX / getCharacterImage が index.html と compatibility.html に完全重複定義（index:9678-9785 / compat:1332-1412）。更新漏れリスク | 中 | 低（共通JS化は読み込み構造変更。現時点では同期確認のみでも可） | M | No |
| F-2 | F | デッドコード: getLegacyShareCode（9747、呼び出しゼロ）、generateShareCard（11012、定義のみ）。console.log/TODO/debuggerは**全ファイルゼロ（クリーン）** | 低 | 無 | S | No |
| F-3 | F | トップレベル132宣言が全てwindowグローバルに露出（text/babelのため）。現状実害なし、将来の衝突リスク | 低 | 無（IIFE化） | S | No |
| F-4 | F | dev-results.html が本番に露出（noindexだがURL直叩き可。GTM/Pixel発火でデータ汚染） | 中 | 無ではない（アクセス制限はサーバー設定） | S | 要判断 |
| F-5 | F | index.html:6811 summary「自分の専門分野に関してはまるで歩くWikipedia」は旧あだ名の名残の可能性（他5箇所は説明文中の比喩で意図的と判断）。**タイプ名としての旧称残存は全ファイルゼロ**、types.html/share/176ページとも現行名と全件一致確認済み | 低 | 文言変更=仕様変更 | S | **Yes**（ユーザー判断） |
| F-6 | F | 832KB単一ファイル（CSS 6,376行＋JSX 7,906行＋データ2,655行）。分割はキャッシュ/読込挙動の変化を伴うため Phase 3 扱い | 中 | 中〜高 | L | No(原理上)/実質要検証 |
| F-7 | F | アニメーション遅延等の未命名マジックナンバー散在（10479-10482, 10924-10926, 9982等）。判定閾値は命名済みで良好 | 低 | 無（定数化のみ） | S | No |

### G. セキュリティ

| ID | 分類 | 内容 | 影響度 | 修正リスク | 工数 | 仕様変更 |
|---|---|---|---|---|---|---|
| G-1 | G | @babel/standalone バージョン無指定（6528）→ unpkgのメジャー更新で突然全壊するリスク。react@18もパッチ固定なし | 高 | **無（バージョン固定のみ）** | S | No |
| G-2 | G | 外部スクリプト4本全てSRI（integrity）なし。CDN侵害時のサプライチェーンリスク | 中 | 無（属性追加。※バージョン完全固定が前提） | S | No |
| G-3 | G | GAS実行URL2本がcontact.htmlにハードコード（996-998）。スパム投入は理論上可能。フロント直叩き構成の構造的制約（GAS側の保護状況は本監査スコープ外・要確認） | 中 | 隠蔽は不可能（プロキシ化が唯一の解） | L | Yes |
| G-4 | G | 健全な点（事実記録）: **XSS経路ゼロ**（URLパラメータは全てホワイトリスト検証 or try-catch後にReactテキスト描画/innerHTMLは定数のみ）、ミックスコンテンツゼロ、秘密鍵ハードコードなし | - | - | - | - |

---

## 4. リファクタリング実行計画

### Phase 1: 挙動変化ゼロが確実なもの（即実施可・リグレッション最小）

| 順 | 項目 | 対応ID |
|---|---|---|
| 1 | html2canvas のscriptタグ削除 | B-2 |
| 2 | @babel/standalone・react・react-dom のバージョン完全固定（現在配信中のバージョンを実測してピン留め） | G-1 |
| 3 | SRI（integrity属性）追加 ※2の固定後 | G-2 |
| 4 | デッドコード削除（getLegacyShareCode / generateShareCard） | F-2 |
| 5 | デッドアセット削除（share-character/16枚、character/日本語名PNG16枚、logo/未参照7枚）※削除前にgrep再確認 | B-8 |
| 6 | .catch追加3箇所（MatchModalコピー / compatibility copyUrl / 相性カード生成ログ） | A-5,6,7 |
| 7 | aria/role追加（progressbar、MatchShareModalのdialog化、フォーカストラップ、alt文言） | D-1,2,4,7 |
| 8 | `:focus { outline:none }` → `:focus:not(:focus-visible)` 化 | D-3 |
| 9 | img width/height属性追加（style優先のため表示不変） | B-7 |
| 10 | React Error Boundary追加（正常系不変・異常系のみフォールバック） | A-3 |
| 11 | noscriptメッセージ追加 | A-4暫定 |
| 12 | share/旧3文字ページのcanonical正規化（4文字版へ向ける） | E-5 |
| 13 | 相性XシェアのみのtwitterドメインをX.comへ統一 | E-6 |

**Phase 1 のリグレッション確認方法:**
1. 修正前に基準スナップショットを取得: 375px/390px/430px幅でLP・診断1問目・57問目・結果・相性の各画面スクリーンショット。
2. 診断結果不変の検証: `dev-results.html`（既存の開発ビュー）と `?dev_scores=` パラメータをローカルで使い、**§2-8のテストベクトル5件＋境界2件（基本軸差12/11点、行動軸差1/2点）** の80CODE・あだ名・patternNoが修正前後で一致することを確認。
3. ネットワークタブで読み込みリソース一覧の差分が「html2canvas消滅のみ」であることを確認。
4. iOS Safari / Android Chrome 実機で診断完走1回ずつ（57問→結果→シェア→相性リンク発行→相性受け取り）。

### Phase 2: 挙動変化の可能性が低いが要目視確認のもの

| 順 | 項目 | 対応ID | 確認ポイント |
|---|---|---|---|
| 1 | React/ReactDOM/Babelにdefer追加 | B-3 | 白画面時間の変化、実行順序（deferは文書順保証）、GA/Pixelとの順序 |
| 2 | character/*.png のwebp化＋参照切替 | B-4 | 画質目視（カード拡大表示・Canvas描画のシェアカード出力含む）、旧iOS表示 |
| 3 | 未使用CSS約1,200行の削除 | B-5 | 全クラス名をJSX側とgrep照合→削除→全画面スクショ比較 |
| 4 | フォントウェイト削減 | B-6 | 全画面で font-weight 描画比較（fallback太さ変化に注意） |
| 5 | IIFE化（グローバル汚染解消） | F-3 | dev-results.htmlのiframe連携（window参照）が壊れないか要確認 |
| 6 | og:imageの動的更新追加 | E-3 | SNSデバッガー（X Card Validator等）で確認 |
| 7 | ogp.pngの1200×630化 | E-7 | 各SNSでのカード表示確認 |

**Phase 2 のリグレッション確認方法:** Phase 1の手順に加えて——
- CSS削除は「削除候補クラス一覧→JSX/HTML全ファイルgrepゼロ件証明→削除」の3段階を機械的に実施し、削除リストを記録（ロールバック可能に）。
- webp化はシェアカード画像生成（Canvas描画）の出力画像を修正前後でピクセル比較。
- 全80タイプの結果画面を `dev_scores` で一巡し目視（80枚スクショの自動取得を推奨）。

### Phase 3: 仕様判断・事業判断が必要なもの

| 項目 | 対応ID | 判断ポイント |
|---|---|---|
| 診断途中の状態保存（リロード復元）＋popstate対応 | A-1, A-2 | 復元UXの設計（「続きから」表示の是非）。離脱率改善効果が大きく優先度高 |
| viewport user-scalable解除 | C-1 | ズーム許可によるレイアウト体験変化を許容するか |
| タップ領域拡大（戻るボタン・モーダル×・dimmed透明度） | C-2,3,4 | 見た目が変わる。375px実機で確認 |
| 相性シェアURLへのタイプ情報付与 | E-1 | バイラル設計の本丸。?match=を使った導線設計 |
| LINE友達追加CTA・個人結果LINEシェアの追加 | E-2 | **事業判断**: LINEナーチャリングを導線に組み込むか、Jicoo直予約を維持するか |
| Jicooプリフィルキーの英語化 | E-4 | Jicoo側仕様確認が先 |
| index.html:6811 summary文言の更新 | F-5 | 旧あだ名の名残か意図的比喩かをコンテンツオーナーが判断 |
| dev-results.htmlのアクセス制限 | F-4 | サーバー設定（Basic認証等） |
| 事前ビルド（Babel排除）への移行 | B-1 | 効果最大だが運用フロー激変。下記「着手しない方がよいもの」も参照 |

**Phase 3 のリグレッション確認方法:** 機能追加を伴うため、§2の仕様書を正として「既存57問フロー・判定結果・80CODE・シェアURL（既存形式）が一切変わらないこと」をPhase 1と同じテストベクトルで担保した上で、新機能のみを個別にテスト。

---

## 5. 着手しない方がよいもの（費用対効果・リスクの正直な評価)

1. **ビルドパイプライン全面導入（Vite等への移行）** — 効果は最大（LCP 2〜4秒短縮）だが、「1ファイルをサーバーに置くだけ」という現在の運用が崩れ、デプロイ事故リスクが増える。やるなら通常のリファクタリングと混ぜず、§2の仕様書とテストベクトルを整備した後に独立プロジェクトとして実施すべき。**暫定対処（B-2/B-3/G-1）だけでも体感はかなり改善する**ため、まずそちらを先に。
2. **クリティカルCSS分離・非同期CSS読み込み** — 100〜300msの改善に対しFOUC（一瞬の崩れ）リスクと依存関係分析コストが見合わない。未使用CSS削除（Phase 2）で十分。
3. **Service Worker / オフライン対応** — リピーター比率が読めない診断サービスでは投資対効果が不明。キャッシュ更新事故のリスクの方が大きい。
4. **share/176ページの構造再編（3文字レガシーURLの統廃合）** — 全てnoindexで実害が小さい。既に拡散済みURLを壊すリスクの方が大きい。canonical修正（Phase 1）に留めるべき。
5. **ダークモード対応** — 6,400行のCSS全体に影響する大工事。カードのブランド体験（紙のカード感）はライト前提のデザインであり、要望が顕在化するまで不要。
6. **GAS URLの隠蔽（プロキシサーバー化）** — フロントエンドのみの構成では原理的に不可能。GAS側のバリデーション・レート制限の確認で代替する方が現実的。
7. **TYPES_80のJSON外部化** — fetch非同期化によるローディング体験の変化と失敗時ハンドリング追加が必要になり、「挙動変化ゼロ」では実現できない。データ更新頻度が上がるまでは現状維持＋compatibility.htmlとの同期チェックリスト運用で足りる。

---

## 付記: 監査中に確認した「問題なし」事項（再調査不要リスト）

- イベントリスナー/タイマーのクリーンアップ: 全useEffectで適切に実装（リークなし）
- 回答ボタン連打: selectedValueガード＋disabledで二重進行防止済み
- XSS: 全URLパラメータ経路でホワイトリスト検証 or try-catch＋Reactテキスト描画。innerHTMLは定数のみ
- console.log / debugger / TODO残骸: 全ファイルゼロ
- 壊れたリンク・404リソース: ゼロ（share/176ページのOGP画像も全実在）
- タイプ名・あだ名の新旧不一致: ゼロ（index.html / types.html / share/ 全176ページ一致）
- canonical正規化・sitemap・share配下のnoindex設計: 妥当
