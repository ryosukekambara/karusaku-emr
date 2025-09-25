#!/usr/bin/env node

const { pool } = require('../server/database');
require('dotenv').config();

async function seedTestData() {
  try {
    console.log('📊 テストデータ投入を開始します...');
    
    // 患者データ
    const patients = [
      {
        name: '山田 太郎',
        kana: 'ヤマダ タロウ',
        birth_date: '1980-05-15',
        gender: 'male',
        phone: '090-1234-5678',
        address: '東京都渋谷区1-2-3',
        emergency_contact: '山田 花子 (妻) 090-8765-4321'
      },
      {
        name: '佐藤 花子',
        kana: 'サトウ ハナコ',
        birth_date: '1975-12-03',
        gender: 'female',
        phone: '080-2345-6789',
        address: '東京都新宿区4-5-6',
        emergency_contact: '佐藤 次郎 (夫) 080-7654-3210'
      },
      {
        name: '田中 一郎',
        kana: 'タナカ イチロウ',
        birth_date: '1990-08-20',
        gender: 'male',
        phone: '070-3456-7890',
        address: '東京都港区7-8-9',
        emergency_contact: '田中 美代子 (母) 070-6543-2109'
      }
    ];
    
    // 患者データを投入
    for (const patient of patients) {
      // 既存チェック
      const [existing] = await pool.execute(
        'SELECT * FROM patients WHERE name = ? AND phone = ?',
        [patient.name, patient.phone]
      );
      
      if (existing.length > 0) {
        console.log(`⚠️  ${patient.name} は既に存在します`);
        continue;
      }
      
      await pool.execute(
        `INSERT INTO patients (name, kana, birth_date, gender, phone, address, emergency_contact, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [patient.name, patient.kana, patient.birth_date, patient.gender, patient.phone, patient.address, patient.emergency_contact]
      );
      
      console.log(`✅ 患者 ${patient.name} を登録しました`);
    }
    
    // 医療記録データ
    const [patientRows] = await pool.execute('SELECT id, name FROM patients LIMIT 3');
    
    if (patientRows.length > 0) {
      // スタッフIDを取得
      const [staffRows] = await pool.execute('SELECT id FROM staff LIMIT 1');
      const staffId = staffRows.length > 0 ? staffRows[0].id : 1;
      
      const medicalRecords = [
        {
          patient_id: patientRows[0].id,
          staff_id: staffId,
          treatment_date: '2025-09-25',
          treatment_type: '診察',
          symptoms: '頭痛',
          diagnosis: '緊張性頭痛',
          treatment_content: '鎮痛剤処方',
          notes: 'ストレスが原因と思われる。十分な休息を取るよう指導。'
        },
        {
          patient_id: patientRows[1].id,
          staff_id: staffId,
          treatment_date: '2025-09-24',
          treatment_type: '診察',
          symptoms: '発熱',
          diagnosis: '風邪',
          treatment_content: '解熱剤・抗生物質処方',
          notes: '安静にして水分補給を心がけるよう指導。'
        }
      ];
      
      for (const record of medicalRecords) {
        await pool.execute(
          `INSERT INTO medical_records (patient_id, staff_id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [record.patient_id, record.staff_id, record.treatment_date, record.treatment_type, record.symptoms, record.diagnosis, record.treatment_content, record.notes]
        );
        
        console.log(`✅ ${patientRows.find(p => p.id === record.patient_id)?.name} の医療記録を登録しました`);
      }
    }
    
    console.log('');
    console.log('📋 投入されたテストデータ:');
    console.log('   患者: 3名');
    console.log('   医療記録: 2件');
    console.log('');
    console.log('🌐 確認URL: https://karusaku-emr-aeza.onrender.com');
    
  } catch (error) {
    console.error('❌ テストデータ投入エラー:', error);
  } finally {
    process.exit(0);
  }
}

// スクリプト実行
seedTestData();
