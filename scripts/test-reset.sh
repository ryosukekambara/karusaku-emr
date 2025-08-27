#!/bin/bash

# テスト用リセットスクリプト
echo "⚠️  テスト用リセットを開始します..."

# 確認メッセージ
read -p "本当にデータベースをリセットしますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ リセットをキャンセルしました"
    exit 1
fi

# 現在のデータベースをバックアップ
if [ -f "medical_records.db" ]; then
    mkdir -p backups
    RESET_BACKUP="backups/medical_records_reset_$(date +%Y%m%d_%H%M%S).db"
    cp medical_records.db "$RESET_BACKUP"
    echo "💾 リセット前のデータベースをバックアップ: $RESET_BACKUP"
fi

# データベースファイルを削除
rm -f medical_records.db
echo "🗑️  データベースファイルを削除しました"

# サーバーを再起動して新しいデータベースを作成
echo "🔄 サーバーを再起動して新しいデータベースを作成します..."
pkill -f "node server.js" 2>/dev/null
sleep 2

# 新しいデータベースでサーバーを起動
npm start &
echo "✅ リセット完了。新しいデータベースでサーバーが起動しました"

