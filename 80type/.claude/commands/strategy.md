# /strategy — プロダクト企画部を起動

プロダクト戦略・ロードマップ・優先順位に関する指示を処理します。

## 起動エージェント
- **riku**（PM）— 戦略立案・優先順位・ロードマップ
- **sora**（UXリサーチャー）— ユーザー行動分析・ペルソナ・CVR

## ルーティング判断
- 「戦略」「ロードマップ」「フェーズ」「優先順位」「KPI」→ riku起動
- 「ユーザー行動」「CVR」「離脱」「ファネル」「ペルソナ」→ sora起動
- 両方に関わる場合 → 2名を並列起動

## 起動手順
1. `agents/1-product/riku.md` または `agents/1-product/sora.md` を読み込む
2. `guidelines/project-overview.md` を必ず読み込む
3. 必要に応じて `guidelines/card-collection-rules.md`, `guidelines/monetization-rules.md` も読み込む
4. Agent toolでサブエージェントとして起動する

## 使用例
```
/strategy 来月のリリース計画を立てて
/strategy バイラル係数を改善するための施策を提案して
/strategy Phase 1 MVPの優先順位を整理して
```
