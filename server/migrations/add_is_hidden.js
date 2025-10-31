// データベースマイグレーション: is_hidden カラム追加
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Running migration: add is_hidden column...');
    
    // is_hidden カラム追加
    await pool.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
    `);
    
    // インデックス追加
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_is_hidden 
      ON patients(is_hidden);
    `);
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

module.exports = runMigration;
