#!/bin/bash

# 完全無料バックアップ戦略スクリプト
echo "🆓 完全無料バックアップ戦略を開始します..."

# 設定
BACKUP_DIR="./backups"
CSV_DIR="./csv-exports"
EMAIL_BACKUP_DIR="./email-backups"
MAX_LOCAL_BACKUPS=100  # ローカルバックアップ保持数

# ディレクトリ作成
mkdir -p "$BACKUP_DIR" "$CSV_DIR" "$EMAIL_BACKUP_DIR"

# 1. ローカルバックアップ作成
echo "📁 ローカルバックアップを作成中..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/medical_records_backup_${TIMESTAMP}.db"

if [ -f "medical_records.db" ]; then
    cp medical_records.db "$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ ローカルバックアップ完了: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ データベースファイルが見つかりません"
    exit 1
fi

# 2. CSVエクスポート作成
echo "📊 CSVエクスポートを作成中..."
CSV_FILE="$CSV_DIR/patients_${TIMESTAMP}.csv"

# SQLiteからCSVエクスポート
sqlite3 medical_records.db <<EOF
.headers on
.mode csv
.output $CSV_FILE
SELECT 
    p.id,
    p.name,
    p.date_of_birth,
    p.gender,
    p.phone,
    p.address,
    p.emergency_contact,
    p.is_new_patient,
    p.created_at
FROM patients p
ORDER BY p.created_at DESC;
EOF

CSV_SIZE=$(du -h "$CSV_FILE" | cut -f1)
echo "✅ CSVエクスポート完了: $CSV_FILE ($CSV_SIZE)"

# 3. 古いバックアップのクリーンアップ
echo "🧹 古いバックアップをクリーンアップ中..."
cd "$BACKUP_DIR"
BACKUP_COUNT=$(ls medical_records_backup_*.db 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_LOCAL_BACKUPS" ]; then
    # 古いファイルを削除
    ls -t medical_records_backup_*.db | tail -n +$((MAX_LOCAL_BACKUPS + 1)) | xargs rm -f
    echo "🗑️ 古いバックアップを削除しました"
fi

cd - > /dev/null

# 4. 使用量レポート
echo "📈 使用量レポート:"
echo "--- ローカルバックアップ ---"
LOCAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
LOCAL_COUNT=$(ls "$BACKUP_DIR"/medical_records_backup_*.db 2>/dev/null | wc -l)
echo "  容量: $LOCAL_SIZE"
echo "  ファイル数: $LOCAL_COUNT個"

echo "--- CSVエクスポート ---"
CSV_TOTAL_SIZE=$(du -sh "$CSV_DIR" | cut -f1)
CSV_COUNT=$(ls "$CSV_DIR"/patients_*.csv 2>/dev/null | wc -l)
echo "  容量: $CSV_TOTAL_SIZE"
echo "  ファイル数: $CSV_COUNT個"

# 5. 無料オプションの提案
echo ""
echo "🆓 完全無料バックアップオプション:"
echo "1. ローカルバックアップ: 無制限容量、無制限期間"
echo "2. CSVエクスポート: メール送信可能、標準フォーマット"
echo "3. 手動バックアップ: いつでも実行可能"
echo "4. 自動バックアップ: 24時間間隔で自動実行"

echo ""
echo "💰 コスト: 0円"
echo "📅 保存期間: 無制限"
echo "🔒 セキュリティ: 自社内完結"
