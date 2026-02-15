# Vercel デプロイ手順ガイド

このプロジェクトをWeb上で公開するための手順です。

## 前提条件

1. **GitHubアカウント**を持っていること
2. **Vercelアカウント**を持っていること (GitHubアカウントで登録推奨)

## 手順 1: GitHubリポジトリの作成

1. [GitHub](https://github.com/new) にアクセスして、新しいリポジトリを作成します。
   - **Repository name**: `line-tool` (または任意の名前)
   - **Public/Private**: どちらでも構いません (Private推奨)
   - **Initialize this repository with**: 何もチェックしないでください (空のリポジトリを作成)
2. 「Create repository」ボタンをクリックします。

## 手順 2: コードのプッシュ (ローカルでの操作)

VS Codeのターミナルで以下のコマンドを実行し、作成したリポジトリにコードをアップロードします。
(`URL` の部分は、GitHubで作成したリポジトリのURLに置き換えてください)

```bash
# すでにgit initとcommitは完了しています
# リモートリポジトリを追加 (URLは自分のものに置き換え!)
git remote add origin https://github.com/あなたのユーザー名/line-tool.git

# メインブランチ名をmainに変更
git branch -M main

# コードをプッシュ
git push -u origin main
```

## 手順 3: Vercelでデプロイ

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセスします。
2. 「**Add New...**」 -> 「**Project**」をクリックします。
3. 「**Import Git Repository**」で、先ほど作成した `line-tool` リポジトリの横にある「**Import**」ボタンをクリックします。
4. **Configure Project** 画面が表示されます:
   - **Framework Preset**: `Other` のままでOK (または自動検出されます)
   - **Root Directory**: `./` (そのままでOK)
   - **Environment Variables**: 必要に応じて設定 (今回は不要)
5. 「**Deploy**」ボタンをクリックします。

## 手順 4: 動作確認

デプロイが完了すると、ドメイン (例: `line-tool.vercel.app`) が発行されます。
そのURLにアクセスして、ツールが正常に動くか確認してください。
