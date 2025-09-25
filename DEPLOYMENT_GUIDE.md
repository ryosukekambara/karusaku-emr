# 🚀 カルサク電子カルテ - デプロイガイド

## 📋 デプロイ状況
- ✅ **GitHub**: コードプッシュ完了
- ⏳ **Netlify**: フロントエンドデプロイ待ち
- ⏳ **Vercel**: バックアップデプロイ待ち  
- ⏳ **Render**: バックエンドデプロイ待ち

## 🌐 1. Netlifyデプロイ（フロントエンド）

### 手順：
1. **Netlifyにアクセス**: https://netlify.com
2. **GitHubでログイン**: 「Continue with GitHub」
3. **新しいサイト作成**: 「Add new site」→「Import an existing project」
4. **リポジトリ選択**: `ryosukekambara/karusaku-emr`
5. **ビルド設定**:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`
6. **デプロイ**: 「Deploy site」

### 期待されるURL:
- `https://karusaku-emr.netlify.app`

## ⚡ 2. Vercelデプロイ（バックアップ）

### 手順：
1. **Vercelにアクセス**: https://vercel.com
2. **GitHubでログイン**: 「Continue with GitHub」
3. **プロジェクト作成**: 「New Project」
4. **リポジトリ選択**: `ryosukekambara/karusaku-emr`
5. **設定確認**: `vercel.json`が自動認識される
6. **デプロイ**: 「Deploy」

### 期待されるURL:
- `https://karusaku-emr.vercel.app`

## 🔧 3. Renderデプロイ（バックエンド）

### 手順：
1. **Renderにアクセス**: https://render.com
2. **GitHubでログイン**: 「Continue with GitHub」
3. **Webサービス作成**: 「New」→「Web Service」
4. **リポジトリ選択**: `ryosukekambara/karusaku-emr`
5. **設定**:
   - **Name**: `karusaku-emr`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
6. **環境変数設定**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: `karusaku-emr-secret-key-2024`
7. **デプロイ**: 「Create Web Service」

### 期待されるURL:
- `https://karusaku-emr.onrender.com`

## 🔗 4. 環境変数設定

### Netlify環境変数:
```
REACT_APP_API_BASE_URL=https://karusaku-emr.onrender.com
```

### Vercel環境変数:
```
REACT_APP_API_BASE_URL=https://karusaku-emr.onrender.com
```

## 📊 5. デプロイ確認

### 監視スクリプト実行:
```bash
./monitor.sh
```

### 手動確認:
- **フロントエンド**: https://karusaku-emr.netlify.app
- **バックエンド**: https://karusaku-emr.onrender.com/api/health
- **バックアップ**: https://karusaku-emr.vercel.app

## 🎯 6. カスタムドメイン設定（オプション）

### Netlify:
1. **Domain settings** → **Add custom domain**
2. **DNS設定**: CNAMEレコードを追加
3. **SSL証明書**: 自動発行

### 推奨ドメイン:
- `karusaku-emr.com`
- `emr.karusaku.com`

## 🚨 トラブルシューティング

### よくある問題:
1. **ビルドエラー**: `client/package.json`の依存関係確認
2. **API接続エラー**: 環境変数`REACT_APP_API_BASE_URL`確認
3. **CORSエラー**: RenderのCORS設定確認
4. **データベースエラー**: SQLiteファイルの権限確認

### ログ確認:
- **Netlify**: Deploy logs
- **Vercel**: Function logs  
- **Render**: Service logs

## 📱 7. スマートフォンアクセス

### QRコード生成:
```bash
# 本番URLのQRコード
qrencode -t ansiutf8 "https://karusaku-emr.netlify.app"
```

### アクセス方法:
1. **QRコード読み取り**
2. **URL直接入力**
3. **ブックマーク登録**

## 🔄 8. 自動デプロイ設定

### GitHub Actions（オプション）:
- プッシュ時の自動デプロイ
- テスト実行
- 通知設定

## 📈 9. パフォーマンス最適化

### フロントエンド:
- 画像最適化
- コード分割
- キャッシュ設定

### バックエンド:
- データベースインデックス
- APIレスポンス最適化
- ログレベル調整

## 🎉 完了後の確認事項

- [ ] フロントエンドが正常に表示される
- [ ] ログイン機能が動作する
- [ ] データベース接続が正常
- [ ] APIエンドポイントが応答する
- [ ] スマートフォンでアクセス可能
- [ ] カスタムドメインが設定済み（オプション）

---

**🎯 目標**: スタッフがスマートフォンからアクセス可能な電子カルテシステム
