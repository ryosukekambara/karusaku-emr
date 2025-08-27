# Google Drive連携設定手順

## 1. Google Cloud Console設定

### 1.1 プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成: `karusaku-emr-backup`
3. プロジェクトを選択

### 1.2 Google Drive API有効化
1. 「APIとサービス」→「ライブラリ」
2. 「Google Drive API」を検索して有効化

### 1.3 サービスアカウント作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「サービスアカウント」
3. 名前: `karusaku-backup-service`
4. 説明: `カルサクEMRバックアップ用サービスアカウント`

### 1.4 キーファイル作成
1. サービスアカウントをクリック
2. 「キー」タブ→「新しいキーを追加」→「JSON」
3. ダウンロードしたJSONファイルを `google-drive-key.json` として保存

## 2. Google Driveフォルダ設定

### 2.1 共有フォルダ作成
1. Google Driveで新しいフォルダを作成: `カルサクEMRバックアップ`
2. フォルダIDをコピー（URLの最後の部分）

### 2.2 権限設定
1. フォルダを右クリック→「共有」
2. サービスアカウントのメールアドレスを追加
3. 権限: 「編集者」

## 3. 環境変数設定

```bash
# .envファイルに追加
GOOGLE_DRIVE_KEY_FILE=./google-drive-key.json
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

## 4. テスト実行

```bash
# 手動バックアップ実行
npm run test-backup

# Google Drive連携テスト
curl -X POST http://localhost:3001/api/backup/create \
  -H "Authorization: Bearer demo-token"
```

## 5. セキュリティ注意事項

- `google-drive-key.json`は絶対にGitにコミットしない
- 本番環境では環境変数で管理
- 定期的にキーのローテーション
- アクセスログの監視

