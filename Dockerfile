# マルチステージビルド
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# フロントエンドをビルド
RUN cd client && npm ci && npm run build

# 本番環境用イメージ
FROM node:18-alpine AS production

# セキュリティ強化
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 作業ディレクトリを設定
WORKDIR /app

# 本番用依存関係のみをコピー
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# アプリケーションコードをコピー
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./
COPY --from=builder --chown=nextjs:nodejs /app/client/build ./client/build

# 環境変数ファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /app/env.example ./.env

# データベースディレクトリを作成
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# ユーザーを切り替え
USER nextjs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# ポートを公開
EXPOSE 3001

# アプリケーションを起動
CMD ["node", "server.js"]


