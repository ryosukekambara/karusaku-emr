-- マイグレーション: patients テーブルに is_hidden カラム追加
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_patients_is_hidden ON patients(is_hidden);
