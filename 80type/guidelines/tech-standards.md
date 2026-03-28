# 技術スタンダード

## 技術スタック（推奨）

| レイヤー | 技術 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | SSR/SSG/ISR対応、OGP動的生成、Vercel最適化 |
| 言語 | TypeScript | 型安全性、80タイプのデータ構造管理 |
| スタイリング | Tailwind CSS 4 | ユーティリティファースト、レスポンシブ、カスタムカラー |
| アニメーション | Framer Motion | React統合、パフォーマンス、宣言的API |
| 状態管理 | Zustand | 軽量、シンプル、診断スコア管理に最適 |
| DB | Supabase (PostgreSQL) | 無料枠、リアルタイム、認証一体型 |
| 認証 | Supabase Auth | 匿名→メール→LINE の段階的認証 |
| デプロイ | Vercel | Next.js最適化、Edge Functions、自動デプロイ |
| 画像生成 | @vercel/og + Satori | OGP動的生成（カード画像） |
| 画像最適化 | next/image + WebP | 自動最適化、遅延読み込み |

## コーディング規約

### 命名規則
- コンポーネント：PascalCase（`DiagnosisCard`, `ResultScreen`）
- 関数・変数：camelCase（`calculateScore`, `personalityType`）
- 定数：UPPER_SNAKE_CASE（`TYPES_80`, `COMPATIBILITY_MATRIX`）
- ファイル名：kebab-case（`diagnosis-card.tsx`, `result-screen.tsx`）
- CSSクラス：Tailwindユーティリティ使用（カスタムCSSは最小限）

### ディレクトリ構成（推奨）
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # トップページ（診断開始）
│   ├── quiz/page.tsx       # 診断画面
│   ├── result/[id]/page.tsx # 結果画面（動的ルート）
│   ├── collection/page.tsx  # カードコレクション
│   ├── match/[id]/page.tsx  # 相性結果
│   └── api/                # API Routes
├── components/             # UIコンポーネント
│   ├── ui/                 # 汎用UI（Button, Card等）
│   ├── quiz/               # 診断関連
│   ├── result/             # 結果表示関連
│   └── collection/         # コレクション関連
├── lib/                    # ロジック・ユーティリティ
│   ├── diagnosis.ts        # 診断ロジック（既存index.htmlから移植）
│   ├── types-80.ts         # 80タイプデータ
│   ├── compatibility.ts    # 相性マトリクス
│   └── scoring.ts          # スコアリング
├── data/                   # 静的データ
│   ├── questions.ts        # 57問のデータ
│   └── types.ts            # タイプ定義
└── styles/                 # グローバルスタイル
```

### パフォーマンス基準
- LCP: 2.5秒以内
- FID: 100ms以内
- CLS: 0.1以内
- First Contentful Paint: 1.8秒以内
- バンドルサイズ: 初回ロード200KB以下（gzip）

### アクセシビリティ
- WCAG 2.1 AA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応（aria-label等）
- カラーコントラスト比 4.5:1以上

### セキュリティ
- 診断結果のURLは推測不可能なID（UUID v4）
- XSS対策（React標準のエスケープ + CSP）
- CSRF対策（SameSite Cookie）
- 個人情報は最小限のみ収集（GDPR/個人情報保護法準拠）

## 既存コードからの移植対象
- `index.html` 内の以下をTypeScript化して移植：
  - `QUESTIONS` 配列（57問）
  - `QUESTION_ORDER` 配列
  - `TYPES_80` オブジェクト（80タイプの詳細データ）
  - `COMPATIBILITY_MATRIX`（16×16相性マトリクス）
  - `determinePersonalityType()` 関数
  - `determineBehavioralType()` 関数
  - スコアリングロジック

## 移植時の注意
- ロジック自体は変更しない（結果が変わってはいけない）
- TypeScriptの型定義を追加して型安全にする
- テストを書いて、既存ロジックと同じ結果が出ることを保証する
