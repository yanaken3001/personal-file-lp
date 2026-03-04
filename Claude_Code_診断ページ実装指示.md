# ジブンタイプ診断ページ 実装指示

## 概要

変換済みHTMLファイル `diagnosis_index.html` を `/diagnosis/index.html` として配置し、
OGP画像5枚をルートに配置してください。
JSXからの変換は完了済みのため、ファイル配置のみで動作します。

## 作業内容

### 1. ファイル配置

```bash
# diagnosisディレクトリが無ければ作成
mkdir -p diagnosis

# HTMLファイルを配置
cp diagnosis_index.html diagnosis/index.html

# OGP画像を配置（すべてプロジェクトルート直下）
cp ogp-diagnosis.png ogp-diagnosis.png
cp share_ogp_P.png share_ogp_P.png
cp share_ogp_I.png share_ogp_I.png
cp share_ogp_A.png share_ogp_A.png
cp share_ogp_D.png share_ogp_D.png
```

配置後のディレクトリ構成:
```
プロジェクトルート/
├── index.html              ← 既存トップページ（変更しない）
├── light-diagnostic.html   ← 既存ファイル（変更しない）
├── ogp-diagnosis.png       ← 診断ページ用OGP画像（新規）
├── share_ogp_P.png         ← P型結果シェア用OGP（新規）
├── share_ogp_I.png         ← I型結果シェア用OGP（新規）
├── share_ogp_A.png         ← A型結果シェア用OGP（新規）
├── share_ogp_D.png         ← D型結果シェア用OGP（新規）
├── diagnosis/
│   └── index.html          ← ジブンタイプ診断（新規）
```

### 2. OGP画像の役割

| ファイル | サイズ | 用途 |
|---|---|---|
| ogp-diagnosis.png | 1200×630 | `/diagnosis` のURLがSNSでシェアされたときのサムネイル。diagnosis/index.html のmetaタグで参照済み |
| share_ogp_P.png | 1200×630 | P型の診断結果をX(Twitter)やLINEでシェアしたときのサムネイル（将来用） |
| share_ogp_I.png | 1200×630 | I型の診断結果シェア用（将来用） |
| share_ogp_A.png | 1200×630 | A型の診断結果シェア用（将来用） |
| share_ogp_D.png | 1200×630 | D型の診断結果シェア用（将来用） |

**ogp-diagnosis.png** は diagnosis/index.html 内の以下のmetaタグで参照されています:
```html
<meta property="og:image" content="https://www.personal-file.jp/ogp-diagnosis.png" />
<meta name="twitter:image" content="https://www.personal-file.jp/ogp-diagnosis.png" />
```

**share_ogp_P/I/A/D.png** は現時点ではmetaタグから参照されていません。
現在のサイトは静的HTMLのため、タイプ別の動的OGP切り替えには別途対応が必要です。
まずファイルだけ配置しておき、将来的にタイプ別シェアURLを実装する際に使用します。

### 3. 既存ファイルへの注意

**既存のindex.htmlやlight-diagnostic.htmlは絶対に変更しないでください。**
diagnosis/index.html は完全に独立したページです。

### 4. 動作確認

- [ ] `https://www.personal-file.jp/diagnosis` でページが表示される
- [ ] スタート画面のアニメーション（スキャナーUI）が動く
- [ ] 診断カウンター「31,247人〜」が表示されカウントアップする
- [ ] 「スキャン開始」→ 10問の質問 → ローディング → 結果表示 の全フローが動く
- [ ] バケット質問 → ぼかしプレビュー → CTAボタン が表示される
- [ ] CTAリンク先が https://www.personal-file.jp/ であること
- [ ] LINE・Xシェアボタンが機能すること
- [ ] スマホ表示（375px幅）でレイアウトが崩れないこと
- [ ] 既存トップページに影響がないこと
- [ ] `https://www.personal-file.jp/ogp-diagnosis.png` に画像が表示される
- [ ] `https://www.personal-file.jp/share_ogp_P.png` に画像が表示される

### 5. 技術メモ

- React 18 + Babel をCDN経由で読み込むスタンドアロンHTML
- ビルド不要。HTMLファイルを置くだけで動作
- CSSはすべてインラインスタイルのため、グローバルCSSとの干渉なし
- Vercelは `/diagnosis/index.html` を自動的に `/diagnosis` のURLで配信する

### 6. 本番パフォーマンスについて

現在はBabel CDN（ブラウザ側でJSX変換）を使用しています。
初回読み込み時にJSXのコンパイルが走るため、やや遅延があります。

本番最適化が必要な場合は、以下の対応を検討してください:
- Babelでプリコンパイルして通常のJSに変換
- React CDNをproduction minified版に変更（すでに対応済み）

ただし、初回リリースはこのままで問題ありません。
