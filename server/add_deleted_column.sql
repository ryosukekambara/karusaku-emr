
-- patients テーブルに論理削除カラム追加

ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- インデックス追加（パフォーマンス向上）

CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON patients(deleted_at);

-- 既存の患者取得クエリを修正するため、削除されていない患者のみ取得

-- （アプリ側で WHERE deleted_at IS NULL を追加する必要あり）

