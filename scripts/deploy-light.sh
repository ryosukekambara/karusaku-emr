#!/bin/bash

# カルサク EMRシステム 超低コストデプロイメントスクリプト
# 月額¥3,000以下で運用可能

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

log_info "🚀 カルサク EMRシステム 超低コストデプロイメント開始"
log_info "📅 日時: $(date)"
log_info "🌍 環境: $ENVIRONMENT"
log_info "💰 目標コスト: 月額¥3,000以下"

# 環境変数ファイルの確認
if [ ! -f ".env" ]; then
    log_warn "⚠️  .envファイルが見つかりません。env.exampleからコピーします。"
    cp env.example .env
    log_warn "⚠️  本番環境では必ず.envファイルを適切に設定してください。"
fi

# 依存関係のインストール（軽量化）
log_info "📦 依存関係をインストール中（軽量化）..."
npm ci --only=production --no-audit --no-fund

# フロントエンドのビルド（軽量化）
log_info "🔨 フロントエンドをビルド中（軽量化）..."
cd client && npm ci --only=production --no-audit --no-fund && npm run build && cd ..

# データベースバックアップ（既存データがある場合）
if [ -f "medical_records.db" ]; then
    log_info "💾 データベースをバックアップ中..."
    cp medical_records.db "$BACKUP_DIR/backup_$TIMESTAMP.db"
fi

# 軽量Docker Composeでデプロイ
log_info "🐳 軽量Docker Composeでデプロイ中..."
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# ヘルスチェック
log_info "🏥 ヘルスチェック中..."
sleep 15

for i in {1..20}; do
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ アプリケーションが正常に起動しました"
        break
    fi
    
    if [ $i -eq 20 ]; then
        log_error "❌ アプリケーションの起動に失敗しました"
        docker-compose -f docker-compose.production.yml logs karusaku-emr
        exit 1
    fi
    
    log_info "⏳ 起動待機中... ($i/20)"
    sleep 3
done

# 軽量パフォーマンステスト
log_info "⚡ 軽量パフォーマンステスト実行中..."
curl -w "time_total: %{time_total}s\n" -o /dev/null -s http://localhost:3001/ > "$LOG_DIR/performance_$TIMESTAMP.log"

# 軽量セキュリティチェック
log_info "🔒 軽量セキュリティチェック実行中..."
docker-compose -f docker-compose.production.yml exec karusaku-emr npm audit --audit-level=high || log_warn "⚠️  セキュリティ警告があります"

# コスト分析
log_info "💰 コスト分析:"
echo "=== 月額コスト予測 ==="
echo "サーバー費用: ¥1,500/月 (VPS 1GB RAM)"
echo "ドメイン費用: ¥200/月"
echo "SSL証明書: ¥0/月 (Let's Encrypt無料)"
echo "バックアップ: ¥0/月 (ローカル保存)"
echo "監視: ¥0/月 (軽量監視)"
echo "合計: ¥1,700/月"
echo ""

# デプロイメント完了
log_info "🎉 超低コストデプロイメント完了！"
log_info "📊 アプリケーションURL: http://localhost:3001"
log_info "📊 管理画面: http://localhost:3001/dashboard"
log_info "📊 ヘルスチェック: http://localhost:3001/health"

# 軽量ログ表示
log_info "📋 最近のログ:"
docker-compose -f docker-compose.production.yml logs --tail=10 karusaku-emr

# 軽量監視情報
log_info "📈 軽量監視情報:"
echo "コンテナ状態:"
docker-compose -f docker-compose.production.yml ps
echo ""
echo "リソース使用量:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

log_info "✅ 超低コストデプロイメントが正常に完了しました！"
log_info "💰 月額コスト: ¥1,700以下"
log_info "💵 利益率: 70%以上"


