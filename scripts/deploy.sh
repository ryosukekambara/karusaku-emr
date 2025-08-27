#!/bin/bash

# カルサク EMRシステム デプロイメントスクリプト
# 使用方法: ./scripts/deploy.sh [production|staging]

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 環境設定
ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# ディレクトリ作成
mkdir -p $BACKUP_DIR $LOG_DIR

log_info "🚀 カルサク EMRシステム デプロイメント開始"
log_info "📅 日時: $(date)"
log_info "🌍 環境: $ENVIRONMENT"

# 環境変数ファイルの確認
if [ ! -f ".env" ]; then
    log_warn "⚠️  .envファイルが見つかりません。env.exampleからコピーします。"
    cp env.example .env
    log_warn "⚠️  本番環境では必ず.envファイルを適切に設定してください。"
fi

# 依存関係のインストール
log_info "📦 依存関係をインストール中..."
npm ci --only=production

# フロントエンドのビルド
log_info "🔨 フロントエンドをビルド中..."
cd client && npm ci && npm run build && cd ..

# データベースバックアップ（既存データがある場合）
if [ -f "medical_records.db" ]; then
    log_info "💾 データベースをバックアップ中..."
    cp medical_records.db "$BACKUP_DIR/backup_$TIMESTAMP.db"
fi

# Docker Composeでデプロイ
log_info "🐳 Docker Composeでデプロイ中..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# ヘルスチェック
log_info "🏥 ヘルスチェック中..."
sleep 10

for i in {1..30}; do
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ アプリケーションが正常に起動しました"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log_error "❌ アプリケーションの起動に失敗しました"
        docker-compose logs karusaku-emr
        exit 1
    fi
    
    log_info "⏳ 起動待機中... ($i/30)"
    sleep 2
done

# データベースマイグレーション
log_info "🗄️ データベースマイグレーション実行中..."
docker-compose exec karusaku-emr node database/migrate.js

# パフォーマンステスト
log_info "⚡ パフォーマンステスト実行中..."
curl -w "@scripts/curl-format.txt" -o /dev/null -s http://localhost:3001/ > "$LOG_DIR/performance_$TIMESTAMP.log"

# セキュリティチェック
log_info "🔒 セキュリティチェック実行中..."
docker-compose exec karusaku-emr npm audit --audit-level=moderate || log_warn "⚠️  セキュリティ警告があります"

# デプロイメント完了
log_info "🎉 デプロイメント完了！"
log_info "📊 アプリケーションURL: http://localhost:3001"
log_info "📊 管理画面: http://localhost:3001/dashboard"
log_info "📊 ヘルスチェック: http://localhost:3001/health"

# ログ表示
log_info "📋 最近のログ:"
docker-compose logs --tail=20 karusaku-emr

# 監視情報
log_info "📈 監視情報:"
echo "コンテナ状態:"
docker-compose ps
echo ""
echo "リソース使用量:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

log_info "✅ デプロイメントが正常に完了しました！"


