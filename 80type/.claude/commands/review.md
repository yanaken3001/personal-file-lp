# /review — 品質管理部を起動

コードレビュー・デザインチェック・テキスト校正に関する指示を処理します。

## 起動エージェント
- **jun**（QAレビュアー）— コード・デザイン・テキストの品質チェック

## 起動手順
1. `agents/8-quality/jun.md` を読み込む
2. `guidelines/output-standards.md` を必ず読み込む
3. レビュー対象に応じて追加guidelinesを読み込む：
   - コードレビュー → `guidelines/tech-standards.md`
   - デザインレビュー → `guidelines/brand-guidelines.md`, `guidelines/character-design-rules.md`
   - テキストレビュー → `guidelines/brand-guidelines.md`, `guidelines/type-system.md`
4. Agent toolでサブエージェントとして起動する

## 使用例
```
/review 結果画面のコードをレビューして
/review カードデザインがブランドガイドラインに合っているかチェックして
/review PP（チームの太陽）の説明文を校正して
/review リリース前チェックリストを実行して
```
