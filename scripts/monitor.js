#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
  constructor() {
    this.url = 'https://karusaku-emr-aeza.onrender.com';
    this.logFile = path.join(__dirname, '../logs/monitor.log');
    this.ensureLogDirectory();
  }
  
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }
  
  async checkAPI() {
    try {
      const startTime = Date.now();
      const response = await fetch(this.url + '/api/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ API正常 - レスポンス時間: ${responseTime}ms`);
        return { status: 'healthy', responseTime, data };
      } else {
        this.log(`❌ API異常 - ステータス: ${response.status}`);
        return { status: 'unhealthy', responseTime, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      this.log(`❌ API接続エラー: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
  
  async checkFrontend() {
    try {
      const frontendUrl = 'https://karusaku-emr-frontend.netlify.app';
      const startTime = Date.now();
      const response = await fetch(frontendUrl);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        this.log(`✅ フロントエンド正常 - レスポンス時間: ${responseTime}ms`);
        return { status: 'healthy', responseTime };
      } else {
        this.log(`❌ フロントエンド異常 - ステータス: ${response.status}`);
        return { status: 'unhealthy', responseTime, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      this.log(`❌ フロントエンド接続エラー: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
  
  async runCheck() {
    this.log('🔍 システム監視開始');
    
    const apiResult = await this.checkAPI();
    const frontendResult = await this.checkFrontend();
    
    // 総合評価
    const allHealthy = apiResult.status === 'healthy' && frontendResult.status === 'healthy';
    
    if (allHealthy) {
      this.log('🎉 システム全体: 正常稼働中');
    } else {
      this.log('⚠️  システム全体: 問題あり');
    }
    
    this.log('📊 監視完了');
    this.log('---');
    
    return {
      timestamp: new Date().toISOString(),
      api: apiResult,
      frontend: frontendResult,
      overall: allHealthy ? 'healthy' : 'unhealthy'
    };
  }
}

// スクリプト実行
async function main() {
  const monitor = new SystemMonitor();
  await monitor.runCheck();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SystemMonitor;
