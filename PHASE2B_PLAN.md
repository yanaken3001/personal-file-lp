# Phase 2b: JSX事前トランスパイル実装プラン

## 目的と前提

目的は、`80cards/index.html` 内の `<script type="text/babel">` を本番配信時にブラウザで変換しない構成へ移行し、LCP/TBTを改善することです。診断ロジック、golden値、表示文言、URL、ファイル名、外部導線は変更しません。

禁止事項として、webpack/Viteなどの恒常的なビルドツール導入は行いません。Babel CLIによる単発の再生成手順に限定します。

## 方式案比較

### A案: ビルド済みJSファイル差し替え

`80cards/index.html` の `<script type="text/babel">` 内のJSXソースを `80cards/src/app.jsx` に退避し、Babelで `80cards/app.js` を生成します。本番HTMLは `app.js` を通常の `<script src="/80cards/app.js">` として読み込みます。`80cards/src/` は `.vercelignore` で配信除外します。

再生成コマンド例:

```powershell
cd tests/80cards
node build-app.mjs
```

手順は `docs/80cards-phase2b-build.md` に明文化します。`80cards/app.js` の冒頭には自動生成ファイルであること、直接編集禁止、再生成コマンドをコメントで明記します。

リスク: HTMLからJSXを外へ出すため、テストハーネスとスクリーンショット基準の調整が必要です。`app.js` が手生成物になるため、ソースと生成物の同期漏れを防ぐdrift検知が必要です。

工数: M。

期待効果: ブラウザ内Babel変換と `@babel/standalone` 読み込みを削除できるため、TBTは大きく改善する見込みです。Phase2実測ではTBT 8,240ms、LCP 32.9sだったため、TBTは秒単位、LCPも数秒以上の改善余地があります。ただし画像・フォント・CSSも残るため、改善幅は実測で確定します。

推奨度: 高。構造が単純で、現行HTML配信のまま最小限に移行できます。

### B案: インラインのビルド済みJSへ置換

`80cards/index.html` 内のJSXソースを `80cards/src/app.jsx` に退避し、Babel CLIで変換した結果を同じHTML内の通常 `<script>` としてインライン埋め込みします。外部 `app.js` は作りません。生成スクリプトはHTML内の特定マーカー間を置換します。

再生成コマンド例:

```powershell
npx babel 80cards/src/app.jsx --presets @babel/preset-react --out-file 80cards/.generated/app.compiled.js
```

その後、専用スクリプトでHTMLのマーカー間に埋め込みます。

リスク: HTML置換スクリプトが必要になり、A案より生成処理が壊れやすいです。HTML差分が大きくなりやすく、レビュー負荷も上がります。一方でリクエスト数は増えません。

工数: MからL。

期待効果: `@babel/standalone` 削除と実行時変換撤去の効果はA案と同等です。外部JS化しないため初回リクエスト数は増えませんが、HTMLサイズは大きいままでキャッシュ効率はA案より劣ります。

推奨度: 中。リクエスト数を増やさない利点はありますが、生成とレビューの安定性でA案に劣ります。

## 推奨案

A案を推奨します。理由は、実装が単純で、`index.html` と生成済み `app.js` の責務が分かれ、将来の差分確認・ロールバック・キャッシュ制御がしやすいためです。恒常的なビルドツール導入を避けつつ、Babel CLIのワンコマンド再生成に収まります。

## goldenテストへの影響と改修方針

現行テストは `80cards/index.html` 内の `text/babel` スクリプトを抽出し、テスト側でトランスパイルして評価する方式です。A案ではJSXソースが `80cards/src/app.jsx` に移り、本番出荷物は `80cards/app.js` になります。goldenテストハーネスは出荷物である `80cards/app.js` を直接評価する方式へ変更します。

担保すること:

- `tests/80cards/golden/diagnosis-golden.json` は1バイトも変更しません。
- テストが検証する期待80CODE、タイプ、判定閾値、同点処理、アダプティブ質問の期待値は変更しません。
- 構造変更前の `npm test` 全PASSを記録し、変更後も同じgoldenで全PASSすることを必須条件にします。
- テストハーネスの変更は「評価対象を出荷物の `80cards/app.js` に変更する」ことに限定し、診断ロジックの再実装や期待値再解釈は行いません。
- `npm test` の先頭で `80cards/src/app.jsx` を一時ディレクトリへBabel変換し、コミット済みの `80cards/app.js` と完全一致するか比較します。不一致ならテスト失敗にします。

## @babel/standalone削除可否

事前変換後は本番実行時にJSXを変換しないため、`@babel/standalone` は不要です。A案/B案のどちらでも、`80cards/index.html` から `@babel/standalone@7.29.7` のscriptタグを削除できます。

削除後の確認観点:

- `type="text/babel"` が0件であること。
- Babelのブラウザ警告がコンソールに出ないこと。
- React/ReactDOMの読み込み順とアプリ起動順が維持されること。

## リグレッション検証手順

1. 変更前ベースラインを記録します。
   - `npm test`
   - `npm run screenshots:current`
   - 本番またはローカル同条件でLighthouse mobileを3回計測し、LCP/TBT/CLSの中央値を記録

2. A案実装後に機械検証します。
   - `npm test`
   - `npm run screenshots:current`
   - baseline/currentスクリーンショット比較
   - `type="text/babel"` 0件、`@babel/standalone` 0件、`app.js` 読み込み成功を確認

3. 実ブラウザで確認します。
   - LP初期描画
   - 診断開始
   - 57問以上を1周し結果表示
   - 結果カード表示
   - シェア導線
   - 相性ページ遷移
   - コンソールエラーゼロ

4. Lighthouse mobileを変更後に3回計測します。
   - LCP中央値
   - TBT中央値
   - CLS中央値
   - Before/After差分を報告

## ロールバック手順

1. `80cards/index.html` を変更前の `type="text/babel"` 構成へ戻します。
2. 追加した `80cards/app.js`、`80cards/src/app.jsx`、生成手順ドキュメント、テストハーネス変更を戻します。
3. `@babel/standalone@7.29.7` のscriptタグとSRIを復旧します。
4. `npm test` とスクリーンショット比較を再実行します。
5. 戻しコミットを1コミットで作成し、診断結果がgoldenと一致することを報告します。
