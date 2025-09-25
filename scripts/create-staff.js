#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { pool } = require('../server/database');
require('dotenv').config();

async function createStaffUsers() {
  try {
    console.log('👥 スタッフアカウント作成を開始します...');
    
    // スタッフ情報
    const staffData = [
      {
        username: 'doctor1',
        password: 'doctor123',
        name: '田中 医師',
        role: 'staff',
      },
      {
        username: 'nurse1',
        password: 'nurse123',
        name: '佐藤 看護師',
        role: 'staff'
      },
      {
        username: 'reception1',
        password: 'reception123',
        name: '山田 受付',
        role: 'staff'
      }
    ];
    
    for (const staff of staffData) {
      // 既存チェック
      const [existing] = await pool.execute(
        'SELECT * FROM staff WHERE username = ?',
        [staff.username]
      );
      
      if (existing.length > 0) {
        console.log(`⚠️  ${staff.username} は既に存在します`);
        continue;
      }
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(staff.password, 10);
      
      // スタッフアカウントを作成
      await pool.execute(
        `INSERT INTO staff (username, password, name, role, department, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [staff.username, hashedPassword, staff.name, staff.role, '医療部']
      );
      
      console.log(`✅ ${staff.name} (${staff.role}) アカウントを作成しました`);
    }
    
    console.log('');
    console.log('📋 作成されたスタッフアカウント:');
    console.log('   医師: doctor1 / doctor123');
    console.log('   看護師: nurse1 / nurse123');
    console.log('   受付: reception1 / reception123');
    console.log('');
    console.log('🌐 ログインURL: https://karusaku-emr-aeza.onrender.com');
    
  } catch (error) {
    console.error('❌ スタッフアカウント作成エラー:', error);
  } finally {
    process.exit(0);
  }
}

// スクリプト実行
createStaffUsers();
