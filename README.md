# カルサク - 電子カルテシステム (SaaS対応版)

## 🎉 システム完成！

**カルサク**ブランドのティールグリーン（#20B2AA）を使用した、完全に動作するSaaS対応電子カルテシステムです。

## 🚀 SaaS展開対応機能

### ✨ 新機能
- 🔐 **高度なセキュリティ**: Helmet、レート制限、CORS設定
- 📅 **予約管理システム**: 患者予約の作成・管理・ステータス更新
- 🗄️ **データベース拡張**: PostgreSQL対応、監査ログ
- 📊 **監視・ログ**: Morgan、Winston、パフォーマンス監視
- 🔄 **自動バックアップ**: 日次データベースバックアップ
- 🐳 **Docker対応**: コンテナ化、Docker Compose
- 🌐 **本番環境対応**: Nginx、SSL、ロードバランサー
- 📱 **レスポンシブデザイン**: モバイル・タブレット対応

### 🛡️ セキュリティ強化
- JWT認証（環境変数対応）
- bcryptjs（12ラウンド）
- レート制限（API: 10r/s, ログイン: 5r/m）
- Helmet（セキュリティヘッダー）
- CORS設定
- SQLインジェクション対策
- XSS対策
- CSRF対策

### 📈 パフォーマンス最適化
- Gzip圧縮
- 静的ファイルキャッシュ
- データベースインデックス
- クエリ最適化
- メモリ使用量監視

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (SSL)   │    │   React App     │    │   PostgreSQL    │
│   (リバースプロキシ) │    │   (フロントエンド) │    │   (データベース)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Node.js API   │
                    │   (バックエンド)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (セッション)    │
                    └─────────────────┘
```

## 🚀 クイックスタート

### 開発環境

```bash
# リポジトリをクローン
git clone <repository-url>
cd karusaku-emr

# 依存関係をインストール
npm install
cd client && npm install && cd ..

# 環境変数を設定
cp env.example .env
# .envファイルを編集して必要な設定を行う

# フロントエンドをビルド
cd client && npm run build && cd ..

# サーバーを起動
npm start
```

### 本番環境（Docker）

```bash
# Docker Composeで起動
docker-compose up -d

# デプロイメントスクリプトを使用
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

## 📊 機能一覧

### 🔐 認証・セキュリティ
- JWT認証システム
- パスワードハッシュ化
- セッション管理
- レート制限
- セキュリティヘッダー

### 👥 患者管理
- 患者登録・編集・削除
- 患者検索・フィルタリング
- 患者詳細情報
- 新規・既存患者の区別
- 患者統計

### 🧑‍⚕️ 施術者管理
- 施術者登録・編集・削除
- 専門分野管理
- 施術者統計
- 資格番号管理

### 📋 診療記録
- 診療記録の作成・編集・削除
- 施術者選択機能
- 患者別記録一覧
- 記録検索・フィルタリング

### 📅 予約管理（新機能）
- 予約作成・編集・削除
- 予約ステータス管理
- 日時フィルタリング
- 施術者・患者選択
- 予約確認・キャンセル

### 📊 レポート・統計
- 月別患者登録数（棒グラフ）
- 施術者別患者数（円グラフ）
- CSVエクスポート機能
- 患者統計
- 診療記録統計

### ⚙️ システム管理
- システム設定
- アカウント管理
- バックアップ・復元
- ログ監視
- パフォーマンス監視

## 🛠️ 技術スタック

### バックエンド
- **Node.js** (v18+)
- **Express.js** (Webフレームワーク)
- **SQLite** (開発) / **PostgreSQL** (本番)
- **Redis** (セッション・キャッシュ)
- **JWT** (認証)
- **bcryptjs** (パスワードハッシュ)
- **Helmet** (セキュリティ)
- **Morgan** (ログ)
- **Winston** (ログ管理)

### フロントエンド
- **React** (v18+)
- **TypeScript** (型安全性)
- **React Router** (ルーティング)
- **CSS3** (カスタムスタイル)
- **レスポンシブデザイン**

### インフラ
- **Docker** (コンテナ化)
- **Docker Compose** (オーケストレーション)
- **Nginx** (リバースプロキシ)
- **SSL/TLS** (暗号化通信)

## 📁 プロジェクト構造

```
karusaku-emr/
├── client/                 # Reactフロントエンド
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── utils/         # ユーティリティ
│   │   └── App.tsx        # メインアプリケーション
│   └── package.json
├── database/              # データベース関連
│   └── migrations/        # マイグレーションファイル
├── nginx/                 # Nginx設定
│   └── nginx.conf
├── scripts/               # デプロイメントスクリプト
│   └── deploy.sh
├── server.js              # Express.jsサーバー
├── package.json           # バックエンド依存関係
├── Dockerfile             # Docker設定
├── docker-compose.yml     # Docker Compose設定
└── README.md
```

## 🔧 設定

### 環境変数

```bash
# サーバー設定
PORT=3001
NODE_ENV=production

# データベース設定
DATABASE_URL=postgresql://username:password@localhost:5432/karusaku_emr
SQLITE_PATH=./medical_records.db

# JWT設定
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# セキュリティ設定
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com

# レート制限設定
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## 🚀 デプロイメント

### クラウドプラットフォーム

#### Vercel + Supabase
```bash
# Vercelにデプロイ
vercel --prod

# Supabaseでデータベース設定
supabase db push
```

#### Railway
```bash
# Railwayにデプロイ
railway up
```

#### Render
```bash
# Renderにデプロイ
render deploy
```

### 自前サーバー

```bash
# Docker Composeでデプロイ
docker-compose up -d

# 手動デプロイ
npm run deploy
```

## 📊 監視・ログ

### ログファイル
- `logs/app.log` - アプリケーションログ
- `logs/access.log` - アクセスログ
- `logs/error.log` - エラーログ

### 監視エンドポイント
- `/health` - ヘルスチェック
- `/api/status` - システムステータス

### メトリクス
- レスポンス時間
- エラー率
- メモリ使用量
- CPU使用量

## 🔒 セキュリティ

### 実装済み対策
- ✅ JWT認証
- ✅ パスワードハッシュ化
- ✅ レート制限
- ✅ CORS設定
- ✅ セキュリティヘッダー
- ✅ SQLインジェクション対策
- ✅ XSS対策
- ✅ CSRF対策

### 推奨設定
- 🔐 強力なJWT_SECRET
- 🔐 HTTPS強制
- 🔐 セキュリティスキャン
- 🔐 定期的なバックアップ
- 🔐 ログ監視

## 📈 パフォーマンス

### 最適化済み
- ✅ Gzip圧縮
- ✅ 静的ファイルキャッシュ
- ✅ データベースインデックス
- ✅ クエリ最適化
- ✅ メモリ使用量監視

### ベンチマーク
- ページ読み込み: < 2秒
- API応答時間: < 500ms
- 同時接続数: 1000+
- データベース接続: プール化

## 🆘 トラブルシューティング

### よくある問題

#### サーバーが起動しない
```bash
# ポート確認
lsof -i :3001

# ログ確認
docker-compose logs karusaku-emr
```

#### データベースエラー
```bash
# データベース確認
sqlite3 medical_records.db ".tables"

# マイグレーション実行
npm run migrate
```

#### フロントエンドビルドエラー
```bash
# 依存関係再インストール
cd client && rm -rf node_modules && npm install
```

## 📞 サポート

### ログイン情報
- **ユーザー名**: admin
- **パスワード**: admin123

### サポートチャンネル
- 📧 Email: support@karusaku.com
- 📱 Slack: #karusaku-support
- 📖 ドキュメント: https://docs.karusaku.com

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🎯 ロードマップ

### v2.1 (次期リリース)
- [ ] 請求管理システム
- [ ] 予約リマインダー
- [ ] モバイルアプリ
- [ ] 多言語対応

### v2.2
- [ ] AI診断支援
- [ ] 画像管理
- [ ] テレメディシン
- [ ] 患者ポータル

### v3.0
- [ ] マルチテナント対応
- [ ] 高度な分析機能
- [ ] 外部システム連携
- [ ] クラウドネイティブ化

---

**カルサク - 医療機関向け電子カルテシステム**  
*SaaS対応・本番環境対応・スケーラブルな医療システム*

🚀 **今すぐデプロイ**: `./scripts/deploy.sh production`

## バックアップ機能

### 自動バックアップ
- **頻度**: 24時間ごと（設定可能）
- **保存場所**: `./backups/` ディレクトリ
- **保持期間**: 最新30個まで（設定可能）
- **ファイル形式**: SQLiteデータベースファイル

### 手動バックアップ
```bash
# 手動バックアップ作成
npm run test-backup

# バックアップ一覧表示
ls -la backups/

# バックアップから復元
npm run test-restore
```

### バックアップ設定
環境変数でカスタマイズ可能：

```bash
# 自動バックアップ有効/無効
AUTO_BACKUP=true

# バックアップ間隔（ミリ秒）
BACKUP_INTERVAL=86400000  # 24時間

# 保持するバックアップ数
MAX_BACKUPS=30

# バックアップ保存ディレクトリ
BACKUP_DIR=./backups

# バックアップ圧縮
COMPRESS_BACKUPS=false

# Google Drive連携設定
GOOGLE_DRIVE_KEY_FILE=./google-drive-key.json
GOOGLE_DRIVE_FOLDER_ID=your-folder-id

# メール設定
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### データ保存について

**保存場所**:
- ローカルPCの `./backups/` ディレクトリ
- 外部クラウドストレージ（手動設定）

**保存容量**:
- 1バックアップ: 約1-10MB（患者数による）
- 30バックアップ: 約30-300MB
- 1年分: 約365-3,650MB（3.6GB）

**保存期間**:
- Free: 30日（最低限）
- Starter: 1年（基本）
- Pro: 3年（医療データ保存期間対応）
- Enterprise: 5年（長期保存）
- 手動: 無制限（ディスク容量次第）

**セキュリティ**:
- ローカル保存で外部アクセスなし
- 暗号化オプションあり
- アクセス権限設定可能
