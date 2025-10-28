// データベースマイグレーション: deleted_at カラム追加
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Running migration: add deleted_at column...');
    
    // deleted_at カラム追加
    await pool.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);
    
    // インデックス追加
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_deleted_at 
      ON patients(deleted_at);
    `);
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

module.exports = runMigration;
