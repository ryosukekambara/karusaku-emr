#!/bin/bash

# カルサク電子カルテ - QRコード生成スクリプト

# 色付きログ関数
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

# QRコード生成関数
generate_qr() {
    local url="$1"
    local description="$2"
    
    echo ""
    echo "📱 $description"
    echo "URL: $url"
    echo "QRコード:"
    
    if command -v qrencode &> /dev/null; then
        qrencode -t ansiutf8 "$url"
    else
        echo "qrencodeがインストールされていません。"
        echo "インストール: brew install qrencode"
        echo "または、以下のURLを手動で入力してください:"
        echo "$url"
    fi
    echo ""
}

echo "🔗 カルサク電子カルテ - QRコード生成"
echo "=================================="

# 本番環境URL
PROD_URL="https://karusaku-emr.netlify.app"
BACKUP_URL="https://karusaku-emr.vercel.app"
API_URL="https://karusaku-emr.onrender.com"

# QRコード生成
generate_qr "$PROD_URL" "本番環境（メイン）"
generate_qr "$BACKUP_URL" "バックアップ環境"
generate_qr "$API_URL/api/health" "APIヘルスチェック"

echo "📋 アクセス方法:"
echo "1. QRコードをスマートフォンで読み取り"
echo "2. ブラウザでURLを直接入力"
echo "3. ブックマークに保存"
echo ""

echo "🎯 推奨設定:"
echo "• スマートフォンのホーム画面に追加"
echo "• ブックマークバーに保存"
echo "• オフライン対応（PWA）"
echo ""

log_success "QRコード生成完了！"
