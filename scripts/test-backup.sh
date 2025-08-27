#!/bin/bash

# テスト用バックアップスクリプト
echo "🔄 テスト用バックアップを開始します..."

# バックアップディレクトリ作成
mkdir -p backups

# タイムスタンプ付きバックアップ
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/medical_records_backup_${TIMESTAMP}.db"

# データベースファイルの存在確認
if [ -f "medical_records.db" ]; then
    cp medical_records.db "$BACKUP_FILE"
    echo "✅ バックアップ完了: $BACKUP_FILE"
    
    # バックアップファイルサイズ表示
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 バックアップサイズ: $SIZE"
    
    # 最新5つのバックアップを表示
    echo "📋 最新のバックアップ:"
    ls -la backups/medical_records_backup_*.db | tail -5
else
    echo "❌ データベースファイルが見つかりません"
    exit 1
fi
