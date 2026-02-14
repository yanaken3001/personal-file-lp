# LINE返信案生成ツール

Z世代未経験層に最適化されたLINE返信案を自動生成するWebアプリケーションです。

## 機能

- **診断結果の入力**: 80タイプ性格診断の結果とユーザー属性を入力
- **ReadinessScore自動計算**: 転職準備度を0-100のスコアで算出
- **Phase別メッセージ生成**: Curiosity Gap法に基づいた段階的なメッセージ生成
- **影の性質の抽出**: 診断結果から「職場で損をしている部分」を自動抽出
- **戦略的アドバイス**: スコアとフラグに基づいた次のアクション提案

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. データファイルの確認

以下のファイルが `data/` ディレクトリに存在することを確認してください:

- `personality_data.json` (80タイプ診断結果)
- `spec_data.json` (診断仕様データ)
- `message_templates.json` (Phase別テンプレート)

### 3. サーバーの起動

```bash
python app.py
```

サーバーが起動したら、ブラウザで `http://localhost:5000` にアクセスしてください。

## 使い方

1. **診断結果を入力**
   - 氏名(苗字のみ)
   - 性格類型(PP, AI, DDなど)
   - 行動類型(達成型、平和型など)

2. **ユーザー属性を入力**
   - 就業状況
   - 就職時期
   - 希望勤務地
   - 最終学歴

3. **ナーチャリング情報を入力**
   - メッセージPhase(Phase 1〜4)
   - 対話回数
   - フラグ状態(現状否定、未来絶望、武器渇望)

4. **生成ボタンをクリック**
   - LINE返信案が自動生成されます
   - ReadinessScoreと戦略的アドバイスも表示されます

## ディレクトリ構造

```
line_tool/
├── app.py                      # Flaskサーバー
├── message_generator.py        # メッセージ生成ロジック
├── readiness_calculator.py     # ReadinessScore計算ロジック
├── requirements.txt            # 依存パッケージ
├── data/
│   ├── personality_data.json   # 80タイプ診断結果
│   ├── spec_data.json          # 診断仕様データ
│   └── message_templates.json  # Phase別テンプレート
└── static/
    ├── index.html              # Webインターフェース
    ├── style.css               # スタイルシート
    └── script.js               # JavaScript
```

## Phase説明

- **Phase 1: 鏡と影** - 診断後の初回メッセージ。影の性質を一つだけチラ見せ
- **Phase 2: 戦略的雑談** - 共感ベースでラポール構築、情報を小出し
- **Phase 3: 市場教育** - 転職市場の現実を教育してハードルを下げる
- **Phase 4: 出口戦略** - 面談誘導またはスクール誘導

## ReadinessScoreの計算方法

- 就職時期: 最大20点
- 就業状況: 離職中なら15点
- 心理フラグ: 各フラグ15-20点
- ラポール形成: 対話回数×5点(最大25点)

**合計90点以上でPhase 4(誘導)へ移行推奨**

## ライセンス

© 2026 キャリア事業・戦略自動化プロジェクト
