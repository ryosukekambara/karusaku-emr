#!/bin/bash
# PostgreSQLバックアップスクリプト

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# pg_dumpでバックアップ
pg_dump $DATABASE_URL > $BACKUP_FILE

# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "postgres_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
