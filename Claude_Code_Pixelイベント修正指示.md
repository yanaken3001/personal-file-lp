# diagnosis/index.html の更新指示（Pixelイベント修正）

## 背景

Meta Pixelの自動トラッキング機能が標準イベント名（Lead, ViewContent）を勝手に検出し、意図しないタイミングでイベントが発火してしまう問題が発生しました。
対策として、標準イベントをカスタムイベントに変更済みのHTMLファイルに差し替えます。

## 作業内容

プロジェクトルートにある `diagnosis_index.html` で `diagnosis/index.html` を上書きしてください。

```bash
cp diagnosis_index.html diagnosis/index.html
```

これだけです。

## 何が変わったか（参考情報）

| タイミング | 旧（問題あり） | 新（修正済み） |
|---|---|---|
| 診断開始 | `fbq('track', 'ViewContent')` | `fbq('trackCustom', 'DiagnosisStart')` |
| CTAクリック | `fbq('track', 'Lead')` | `fbq('trackCustom', 'CTA80TypeClick')` |

`trackCustom` を使うことで、Metaの自動トラッキングとの競合を回避しています。

## 確認

```bash
# カスタムイベントに変更されているか確認
grep -c "trackCustom" diagnosis/index.html
# → 3 が返ればOK

# 旧標準イベントが残っていないか確認
grep -c "'track', 'Lead'" diagnosis/index.html
# → 0 が返ればOK
grep -c "'track', 'ViewContent'" diagnosis/index.html
# → 0 が返ればOK
```

## 注意

既存の index.html（トップページ）は変更しないでください。
