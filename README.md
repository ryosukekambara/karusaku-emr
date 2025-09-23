# 電子カルテシステム

## 概要
医療管理システムの電子カルテアプリケーション

## 技術スタック
- **フロントエンド**: React + TypeScript
- **バックエンド**: Node.js + Express
- **データベース**: MySQL (PlanetScale)
- **デプロイ**: Vercel + Railway

## 機能
- 患者管理
- 施術記録
- 予約管理
- スタッフ認証
- ダッシュボード

## デプロイ方法

### フロントエンド (Vercel)
1. Vercelにログイン
2. GitHubリポジトリをインポート
3. フレームワーク: Create React App
4. ルートディレクトリ: `client`

### バックエンド (Railway)
1. Railwayにログイン
2. GitHubリポジトリをインポート
3. ルートディレクトリ: `server`
4. 環境変数を設定

### データベース (PlanetScale)
1. PlanetScaleでデータベース作成
2. 接続情報をRailwayの環境変数に設定

## 環境変数
```
JWT_SECRET=your-secret-key
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
```

## ログイン情報
- ユーザー名: `admin`
- パスワード: `admin123`