# 電子カルテシステム デプロイメントガイド

## 要件
- 同じWi-Fiを使用しない
- スタッフと管理者が異なる環境からアクセス
- 小規模データベース
- 他社展開を想定

## 推奨ソリューション

### 1. クラウドホスティング（推奨）
**Vercel + PlanetScale**

#### フロントエンド（Vercel）
```bash
# Vercelにデプロイ
npm install -g vercel
cd client
vercel --prod
```

#### バックエンド（Railway/Render）
```bash
# Railwayにデプロイ
npm install -g @railway/cli
cd server
railway login
railway init
railway up
```

#### データベース（PlanetScale）
- MySQL互換のサーバーレスデータベース
- 無料プランで十分
- 自動スケーリング

### 2. VPS（仮想専用サーバー）
**さくらのVPS + Nginx + SSL**

#### 設定手順
1. VPS契約（月額500円〜）
2. Ubuntu/Debianインストール
3. Node.js + PM2設定
4. Nginxリバースプロキシ
5. Let's Encrypt SSL証明書

### 3. ローカル + トンネリング
**ngrok/Cloudflare Tunnel**

```bash
# ngrokでトンネル作成
npm install -g ngrok
ngrok http 5000
# 公開URL: https://xxxxx.ngrok.io
```

## 実装方法

### オプション1: クラウド（最速）
- フロントエンド: Vercel（無料）
- バックエンド: Railway（無料枠）
- データベース: PlanetScale（無料枠）
- 所要時間: 30分

### オプション2: VPS（安定）
- サーバー: さくらのVPS
- 月額: 500円〜
- 設定時間: 2時間
- 完全制御可能

### オプション3: トンネリング（一時的）
- ngrok: 無料（制限あり）
- 即座に利用可能
- 開発・テスト用

## 推奨
**オプション1（クラウド）**を推奨します。
- 無料で開始可能
- 自動スケーリング
- メンテナンス不要
- 他社展開に最適
