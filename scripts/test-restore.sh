#!/bin/bash

# テスト用復元スクリプト
echo "🔄 テスト用復元を開始します..."

# バックアップディレクトリの存在確認
if [ ! -d "backups" ]; then
    echo "❌ バックアップディレクトリが見つかりません"
    exit 1
fi

# 最新のバックアップファイルを取得
LATEST_BACKUP=$(ls -t backups/medical_records_backup_*.db 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ バックアップファイルが見つかりません"
    exit 1
fi

echo "📋 復元するバックアップ: $LATEST_BACKUP"

# 現在のデータベースをバックアップ
if [ -f "medical_records.db" ]; then
    CURRENT_BACKUP="backups/medical_records_current_$(date +%Y%m%d_%H%M%S).db"
    cp medical_records.db "$CURRENT_BACKUP"
    echo "💾 現在のデータベースをバックアップ: $CURRENT_BACKUP"
fi

# 復元実行
cp "$LATEST_BACKUP" medical_records.db
echo "✅ 復元完了: $LATEST_BACKUP"

# 復元後のファイルサイズ表示
SIZE=$(du -h medical_records.db | cut -f1)
echo "📊 復元後のサイズ: $SIZE"

