GitHubアップロード用

スクリーンショットのURLからWorker名を `satin-serch-v5` と読み取りました。
綴りは `serch` です（searchではありません）。

構成:
- wrangler.toml
- package.json
- src/index.js

このフォルダ内のファイルをGitHubリポジトリの同じ階層構成でアップロードしてください。
CloudflareのGit連携でリポジトリを接続し、デプロイコマンドを `npx wrangler deploy` に設定します。

注意: Google LensのWebアップロードを試す方式であり、公式の一般公開逆画像検索APIではありません。Lens側の制限・仕様変更で候補が取れない可能性があります。
