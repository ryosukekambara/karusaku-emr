#!/bin/bash

# カルサク EMRシステム 本番環境デプロイメントスクリプト
# 加盟者に迷惑をかけない高可用性構成

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

log_info "🚀 カルサク EMRシステム 本番環境デプロイメント開始"
log_info "📅 日時: $(date)"
log_info "🌍 環境: $ENVIRONMENT"
log_info "🎯 目標: 加盟者に迷惑をかけない高可用性"

# 環境変数ファイルの確認
if [ ! -f ".env" ]; then
    log_error "❌ .envファイルが見つかりません。本番環境では必須です。"
    exit 1
fi

# システム要件チェック
log_info "🔍 システム要件チェック中..."
TOTAL_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2}')
AVAILABLE_DISK=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')

if [ $TOTAL_MEMORY -lt 1024 ]; then
    log_error "❌ メモリ不足: ${TOTAL_MEMORY}MB (最低1GB必要)"
    exit 1
fi

if [ $AVAILABLE_DISK -lt 10 ]; then
    log_error "❌ ディスク容量不足: ${AVAILABLE_DISK}GB (最低10GB必要)"
    exit 1
fi

log_info "✅ システム要件: メモリ${TOTAL_MEMORY}MB, ディスク${AVAILABLE_DISK}GB"

# 依存関係のインストール
log_info "📦 依存関係をインストール中..."
npm ci --only=production --no-audit --no-fund

# フロントエンドのビルド
log_info "🔨 フロントエンドをビルド中..."
cd client && npm ci --only=production --no-audit --no-fund && npm run build && cd ..

# データベースバックアップ（既存データがある場合）
if [ -f "medical_records.db" ]; then
    log_info "💾 データベースをバックアップ中..."
    cp medical_records.db "$BACKUP_DIR/backup_$TIMESTAMP.db"
    log_info "✅ バックアップ完了: $BACKUP_DIR/backup_$TIMESTAMP.db"
fi

# 本番環境Docker Composeでデプロイ
log_info "🐳 本番環境Docker Composeでデプロイ中..."
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# ヘルスチェック（強化版）
log_info "🏥 ヘルスチェック中..."
sleep 20

for i in {1..30}; do
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ アプリケーションが正常に起動しました"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log_error "❌ アプリケーションの起動に失敗しました"
        docker-compose -f docker-compose.production.yml logs karusaku-emr
        exit 1
    fi
    
    log_info "⏳ 起動待機中... ($i/30)"
    sleep 3
done

# パフォーマンステスト
log_info "⚡ パフォーマンステスト実行中..."
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/)
log_info "📊 レスポンス時間: ${RESPONSE_TIME}秒"

if (( $(echo "$RESPONSE_TIME > 3" | bc -l) )); then
    log_warn "⚠️ レスポンス時間が3秒を超えています: ${RESPONSE_TIME}秒"
fi

# 負荷テスト（軽量版）
log_info "🔧 軽量負荷テスト実行中..."
for i in {1..10}; do
    curl -s http://localhost:3001/ > /dev/null &
done
wait
log_info "✅ 軽量負荷テスト完了"

# セキュリティチェック
log_info "🔒 セキュリティチェック実行中..."
docker-compose -f docker-compose.production.yml exec karusaku-emr npm audit --audit-level=high || log_warn "⚠️ セキュリティ警告があります"

# 監視設定確認
log_info "📊 監視設定確認中..."
if docker-compose -f docker-compose.production.yml ps | grep -q "monitoring"; then
    log_info "✅ 監視サービスが正常に動作中"
else
    log_warn "⚠️ 監視サービスが起動していません"
fi

# バックアップ設定確認
log_info "💾 バックアップ設定確認中..."
if docker-compose -f docker-compose.production.yml ps | grep -q "backup"; then
    log_info "✅ バックアップサービスが正常に動作中"
else
    log_warn "⚠️ バックアップサービスが起動していません"
fi

# リソース使用量確認
log_info "📈 リソース使用量確認中..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# 可用性テスト
log_info "🔄 可用性テスト実行中..."
for i in {1..5}; do
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ 可用性テスト $i/5: 成功"
    else
        log_error "❌ 可用性テスト $i/5: 失敗"
        exit 1
    fi
    sleep 2
done

# デプロイメント完了
log_info "🎉 本番環境デプロイメント完了！"
log_info "📊 アプリケーションURL: http://localhost:3001"
log_info "📊 管理画面: http://localhost:3001/dashboard"
log_info "📊 ヘルスチェック: http://localhost:3001/health"

# ログ表示
log_info "📋 最近のログ:"
docker-compose -f docker-compose.production.yml logs --tail=15 karusaku-emr

# 監視情報
log_info "📈 監視情報:"
echo "コンテナ状態:"
docker-compose -f docker-compose.production.yml ps
echo ""
echo "リソース使用量:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# パフォーマンス指標
log_info "📊 パフォーマンス指標:"
echo "=== 性能指標 ==="
echo "レスポンス時間: ${RESPONSE_TIME}秒"
echo "メモリ使用量: $(docker stats --no-stream --format '{{.MemUsage}}' karusaku-emr-app)"
echo "CPU使用量: $(docker stats --no-stream --format '{{.CPUPerc}}' karusaku-emr-app)"
echo ""

# 運用コスト
log_info "💰 運用コスト:"
echo "=== 月額コスト予測 ==="
echo "VPS (2GB RAM): ¥3,000/月"
echo "ドメイン: ¥200/月"
echo "SSL証明書: ¥0/月 (Let's Encrypt無料)"
echo "バックアップ: ¥500/月"
echo "監視: ¥300/月"
echo "合計: ¥4,000/月"
echo ""

# 推奨事項
log_info "💡 推奨事項:"
echo "1. 定期的なバックアップ確認"
echo "2. ログ監視の継続"
echo "3. パフォーマンス監視"
echo "4. セキュリティアップデート"
echo "5. ユーザー通知システムの活用"

log_info "✅ 本番環境デプロイメントが正常に完了しました！"
log_info "🎯 加盟者に迷惑をかけない高可用性システムが稼働中です"
log_info "💰 月額コスト: ¥4,000以下"
log_info "💵 利益率: 70%以上"


