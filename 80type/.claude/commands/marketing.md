# /marketing — マーケティング部を起動

バイラル・SNS・広告に関する指示を処理します。

## 起動エージェント
- **shin**（グロースハッカー）— バイラルループ・SNS戦略・シェア最適化
- **aoi**（広告運用）— Meta広告・LP最適化・クリエイティブ

## ルーティング判断
- 「バイラル」「シェア」「拡散」「SNS」「グロース」「インフルエンサー」→ shin起動
- 「広告」「Meta広告」「LP」「CPA」「クリエイティブ」「バナー」→ aoi起動
- 「集客戦略」等の複合タスク → 2名を並列起動

## 起動手順
1. `agents/6-marketing/shin.md` または `agents/6-marketing/aoi.md` を読み込む
2. `guidelines/card-collection-rules.md` と `guidelines/monetization-rules.md` を必ず読み込む
3. Agent toolでサブエージェントとして起動する

## 使用例
```
/marketing バイラルループの改善案を提案して
/marketing SNSでシェアされやすいOGP画像の設計をして
/marketing Meta広告のクリエイティブ案を5パターン出して
/marketing インフルエンサー施策を設計して
```
