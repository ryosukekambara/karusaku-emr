#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { pool } = require('../server/database');
require('dotenv').config();

async function createAdminUser() {
  try {
    console.log('🔧 管理者アカウント作成を開始します...');
    
    // 管理者情報
    const adminData = {
      username: 'admin',
      password: 'admin123',
      name: 'システム管理者',
      role: 'admin',
      email: 'admin@karusaku.com'
    };
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // 既存の管理者をチェック
    const [existing] = await pool.execute(
      'SELECT * FROM staff WHERE username = ? OR role = ?',
      [adminData.username, 'admin']
    );
    
    if (existing.length > 0) {
      console.log('⚠️  管理者アカウントは既に存在します');
      console.log('既存の管理者:', existing[0].username);
      return;
    }
    
    // 管理者アカウントを作成
    await pool.execute(
      `INSERT INTO staff (username, password, name, role, email, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [adminData.username, hashedPassword, adminData.name, adminData.role, adminData.email]
    );
    
    console.log('✅ 管理者アカウントが正常に作成されました');
    console.log('📋 ログイン情報:');
    console.log(`   ユーザー名: ${adminData.username}`);
    console.log(`   パスワード: ${adminData.password}`);
    console.log(`   ロール: ${adminData.role}`);
    console.log('');
    console.log('🌐 ログインURL: https://karusaku-emr-aeza.onrender.com');
    
  } catch (error) {
    console.error('❌ 管理者アカウント作成エラー:', error);
  } finally {
    process.exit(0);
  }
}

// スクリプト実行
createAdminUser();
