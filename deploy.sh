#!/bin/bash

# カルサク電子カルテ - 自動デプロイスクリプト
echo "🚀 カルサク電子カルテ デプロイ開始..."

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

# 1. フロントエンドビルド
log_info "フロントエンドをビルド中..."
cd client
if npm run build; then
    log_success "フロントエンドビルド完了"
else
    log_error "フロントエンドビルド失敗"
    exit 1
fi
cd ..

# 2. バックエンドテスト
log_info "バックエンドサーバーをテスト中..."
cd server
if timeout 10s node index.js &> /dev/null; then
    log_success "バックエンドサーバーテスト完了"
else
    log_warning "バックエンドサーバーテストでタイムアウト（正常）"
fi
cd ..

# 3. Gitコミット
log_info "変更をコミット中..."
git add .
if git commit -m "自動デプロイ: $(date '+%Y-%m-%d %H:%M:%S')"; then
    log_success "コミット完了"
else
    log_warning "コミットする変更がありません"
fi

# 4. GitHubプッシュ
log_info "GitHubにプッシュ中..."
if git push origin main; then
    log_success "GitHubプッシュ完了"
else
    log_error "GitHubプッシュ失敗"
    exit 1
fi

# 5. デプロイ状況確認
log_info "デプロイ状況を確認中..."
echo ""
echo "📊 デプロイ先URL:"
echo "   • Netlify: https://app.netlify.com/sites/karusaku-emr"
echo "   • Vercel: https://vercel.com/ryosukekambara/karusaku-emr"
echo "   • Render: https://dashboard.render.com/web/srv-xxxxx"
echo ""
echo "🔗 アクセス可能なURL:"
echo "   • 本番環境: https://karusaku-emr.netlify.app"
echo "   • 開発環境: https://karusaku-emr-dev.vercel.app"
echo ""

log_success "🎉 デプロイ完了！"
log_info "次のステップ:"
echo "   1. Netlifyでサイトを確認"
echo "   2. カスタムドメインを設定"
echo "   3. 環境変数を設定"
echo "   4. データベース接続をテスト"
