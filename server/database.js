const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL接続プール
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('PostgreSQLデータベースに接続しました');
});

pool.on('error', (err) => {
  console.error('データベース接続エラー:', err);
});

// MySQL2互換のexecuteメソッドを追加
pool.execute = function(query, params = []) {
  // MySQL の ? を PostgreSQL の $1, $2... に変換
  let index = 0;
  const pgQuery = query.replace(/\?/g, () => `$${++index}`);
  
  return pool.query(pgQuery, params).then(result => {
    return [result.rows, result.fields];
  });
};

// データベース初期化
// データベース初期化
async function initializeDatabase() {
  try {
    // 古いテーブルを削除
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS patients CASCADE');
    
    // usersテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // patientsテーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        kana VARCHAR(255),
        birth_date DATE,
        gender VARCHAR(50),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        emergency_contact VARCHAR(255),
        medical_history TEXT,
        allergies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 初期ユーザーを作成
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (username, password, name, role, department)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', hashedPassword, '管理者', 'master', '管理部']);

    console.log('データベース初期化完了');
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    throw error;
  }
}

module.exports = { pool, initializeDatabase };