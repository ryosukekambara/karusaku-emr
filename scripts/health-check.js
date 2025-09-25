#!/usr/bin/env node

const https = require('https');
const http = require('http');

async function healthCheck() {
  const url = 'https://karusaku-emr-aeza.onrender.com';
  
  console.log('🔍 ヘルスチェックを開始します...');
  console.log(`URL: ${url}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(url + '/api/health');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ ヘルスチェック成功');
      console.log(`📊 レスポンス時間: ${responseTime}ms`);
      console.log(`📋 ステータス: ${data.status}`);
      console.log(`⏰ タイムスタンプ: ${data.timestamp}`);
      console.log('');
      
      // パフォーマンス評価
      if (responseTime < 1000) {
        console.log('🚀 パフォーマンス: 優秀');
      } else if (responseTime < 3000) {
        console.log('⚡ パフォーマンス: 良好');
      } else {
        console.log('⚠️  パフォーマンス: 要改善');
      }
      
    } else {
      console.log('❌ ヘルスチェック失敗');
      console.log(`ステータスコード: ${response.status}`);
    }
    
  } catch (error) {
    console.log('❌ ヘルスチェックエラー:', error.message);
  }
}

// スクリプト実行
healthCheck();
