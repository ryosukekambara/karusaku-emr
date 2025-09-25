#!/bin/bash

# カルサク電子カルテ - デプロイ監視スクリプト

# 色付きログ関数
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# 監視対象URL
NETLIFY_URL="https://karusaku-emr.netlify.app"
VERCEL_URL="https://karusaku-emr.vercel.app"
RENDER_URL="https://karusaku-emr.onrender.com"

echo "🔍 カルサク電子カルテ デプロイ状況監視"
echo "=================================="

# Netlify監視
log_info "Netlify監視中..."
if curl -s -o /dev/null -w "%{http_code}" "$NETLIFY_URL" | grep -q "200"; then
    log_success "Netlify: 正常稼働中 ✅"
else
    log_error "Netlify: アクセス不可 ❌"
fi

# Vercel監視
log_info "Vercel監視中..."
if curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL" | grep -q "200"; then
    log_success "Vercel: 正常稼働中 ✅"
else
    log_warning "Vercel: アクセス不可 ⚠️"
fi

# Render監視
log_info "Render監視中..."
if curl -s -o /dev/null -w "%{http_code}" "$RENDER_URL/api/health" | grep -q "200"; then
    log_success "Render: 正常稼働中 ✅"
else
    log_error "Render: アクセス不可 ❌"
fi

echo ""
echo "📊 監視結果サマリー:"
echo "   • Netlify: フロントエンド配信"
echo "   • Vercel: バックアップ配信"
echo "   • Render: バックエンドAPI"
echo ""
echo "🔗 アクセスURL:"
echo "   • メイン: $NETLIFY_URL"
echo "   • バックアップ: $VERCEL_URL"
echo "   • API: $RENDER_URL"
echo ""

# 自動通知（オプション）
if command -v osascript &> /dev/null; then
    osascript -e 'display notification "デプロイ監視完了" with title "カルサク電子カルテ"'
fi
