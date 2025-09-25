#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class AlertMonitor {
  constructor() {
    this.baseUrl = 'https://karusaku-emr-aeza.onrender.com';
    this.alertLogFile = path.join(__dirname, '../logs/alerts.log');
    this.ensureLogDirectory();
    this.alertThresholds = {
      responseTime: 5000, // 5秒
      errorRate: 10, // 10%
      consecutiveFailures: 3 // 3回連続失敗
    };
    this.consecutiveFailures = 0;
  }
  
  ensureLogDirectory() {
    const logDir = path.dirname(this.alertLogFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.alertLogFile, logMessage + '\n');
  }
  
  async checkSystemHealth() {
    try {
      const startTime = Date.now();
      const response = await fetch(this.baseUrl + '/api/health');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        // レスポンス時間チェック
        if (responseTime > this.alertThresholds.responseTime) {
          this.log(`⚠️ レスポンス時間が長い: ${responseTime}ms (閾値: ${this.alertThresholds.responseTime}ms)`, 'WARNING');
        }
        
        // 連続失敗カウンターをリセット
        this.consecutiveFailures = 0;
        
        this.log(`✅ システム正常: ${responseTime}ms`, 'INFO');
        
        return {
          status: 'healthy',
          responseTime: responseTime,
          data: data
        };
        
      } else {
        this.consecutiveFailures++;
        this.log(`❌ システム異常: HTTP ${response.status}`, 'ERROR');
        
        if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
          this.log(`🚨 連続失敗アラート: ${this.consecutiveFailures}回連続失敗`, 'CRITICAL');
        }
        
        return {
          status: 'unhealthy',
          responseTime: endTime - startTime,
          error: `HTTP ${response.status}`
        };
      }
      
    } catch (error) {
      this.consecutiveFailures++;
      this.log(`❌ システム接続エラー: ${error.message}`, 'ERROR');
      
      if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
        this.log(`🚨 連続失敗アラート: ${this.consecutiveFailures}回連続失敗`, 'CRITICAL');
      }
      
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  async checkAPIEndpoints() {
    this.log('🔍 APIエンドポイント監視開始');
    
    const endpoints = [
      { url: '/api/health', name: 'ヘルスチェック' },
      { url: '/api/auth/login', name: '認証API', method: 'POST', body: { username: 'admin', password: 'admin123' } }
    ];
    
    let successCount = 0;
    let totalCount = endpoints.length;
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        
        const options = {
          method: endpoint.method || 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }
        
        const response = await fetch(this.baseUrl + endpoint.url, options);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          successCount++;
          this.log(`✅ ${endpoint.name}: ${responseTime}ms`, 'INFO');
        } else {
          this.log(`❌ ${endpoint.name}: HTTP ${response.status} (${responseTime}ms)`, 'ERROR');
        }
        
      } catch (error) {
        this.log(`❌ ${endpoint.name}: エラー - ${error.message}`, 'ERROR');
      }
    }
    
    const successRate = (successCount / totalCount) * 100;
    
    if (successRate < (100 - this.alertThresholds.errorRate)) {
      this.log(`🚨 API成功率低下アラート: ${successRate.toFixed(1)}% (閾値: ${100 - this.alertThresholds.errorRate}%)`, 'WARNING');
    }
    
    this.log(`📊 API監視結果: ${successCount}/${totalCount} 成功 (${successRate.toFixed(1)}%)`, 'INFO');
    
    return {
      successCount,
      totalCount,
      successRate
    };
  }
  
  async checkDatabaseConnection() {
    this.log('🗄️ データベース接続監視');
    
    try {
      // データベース関連のAPIをテスト
      const response = await fetch(this.baseUrl + '/api/health');
      
      if (response.ok) {
        const data = await response.json();
        this.log('✅ データベース接続正常', 'INFO');
        return { status: 'healthy' };
      } else {
        this.log(`❌ データベース接続異常: HTTP ${response.status}`, 'ERROR');
        return { status: 'unhealthy', error: `HTTP ${response.status}` };
      }
      
    } catch (error) {
      this.log(`❌ データベース接続エラー: ${error.message}`, 'ERROR');
      return { status: 'error', error: error.message };
    }
  }
  
  async checkSSLExpiry() {
    this.log('🔒 SSL証明書有効期限チェック');
    
    try {
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        const command = `echo | openssl s_client -connect karusaku-emr-aeza.onrender.com:443 -servername karusaku-emr-aeza.onrender.com 2>/dev/null | openssl x509 -noout -dates`;
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            this.log(`❌ SSL証明書チェックエラー: ${error.message}`, 'ERROR');
            resolve({ status: 'error', error: error.message });
            return;
          }
          
          const lines = stdout.split('\n');
          let notAfter = null;
          
          for (const line of lines) {
            if (line.startsWith('notAfter=')) {
              notAfter = new Date(line.split('=')[1]);
              break;
            }
          }
          
          if (notAfter) {
            const now = new Date();
            const daysUntilExpiry = Math.ceil((notAfter - now) / (1000 * 60 * 60 * 24));
            
            this.log(`📅 SSL証明書有効期限: ${notAfter.toLocaleDateString('ja-JP')} (${daysUntilExpiry}日後)`, 'INFO');
            
            if (daysUntilExpiry <= 30) {
              this.log(`🚨 SSL証明書期限切れ警告: ${daysUntilExpiry}日後に期限切れ`, 'WARNING');
            }
            
            resolve({
              status: 'healthy',
              expiryDate: notAfter,
              daysUntilExpiry: daysUntilExpiry
            });
          } else {
            this.log('❌ SSL証明書情報取得失敗', 'ERROR');
            resolve({ status: 'error', error: '証明書情報取得失敗' });
          }
        });
      });
      
    } catch (error) {
      this.log(`❌ SSL証明書チェックエラー: ${error.message}`, 'ERROR');
      return { status: 'error', error: error.message };
    }
  }
  
  generateAlertSummary(results) {
    this.log('📊 監視アラートサマリー');
    this.log('='.repeat(50));
    
    const criticalAlerts = [];
    const warningAlerts = [];
    
    // システムヘルスチェック
    if (results.systemHealth.status !== 'healthy') {
      criticalAlerts.push(`システム異常: ${results.systemHealth.error || '不明なエラー'}`);
    }
    
    // API監視
    if (results.apiEndpoints.successRate < (100 - this.alertThresholds.errorRate)) {
      warningAlerts.push(`API成功率低下: ${results.apiEndpoints.successRate.toFixed(1)}%`);
    }
    
    // データベース接続
    if (results.database.status !== 'healthy') {
      criticalAlerts.push(`データベース接続異常: ${results.database.error || '不明なエラー'}`);
    }
    
    // SSL証明書
    if (results.ssl.daysUntilExpiry <= 30) {
      warningAlerts.push(`SSL証明書期限切れ警告: ${results.ssl.daysUntilExpiry}日後`);
    }
    
    // 連続失敗
    if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      criticalAlerts.push(`連続失敗: ${this.consecutiveFailures}回`);
    }
    
    // アラート表示
    if (criticalAlerts.length > 0) {
      this.log('🚨 重要アラート:', 'CRITICAL');
      criticalAlerts.forEach(alert => {
        this.log(`   - ${alert}`, 'CRITICAL');
      });
    }
    
    if (warningAlerts.length > 0) {
      this.log('⚠️ 警告アラート:', 'WARNING');
      warningAlerts.forEach(alert => {
        this.log(`   - ${alert}`, 'WARNING');
      });
    }
    
    if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
      this.log('✅ すべての監視項目が正常です', 'INFO');
    }
    
    this.log('='.repeat(50));
    
    return {
      critical: criticalAlerts.length,
      warning: warningAlerts.length,
      total: criticalAlerts.length + warningAlerts.length
    };
  }
  
  async runMonitoring() {
    this.log('🚀 システム監視開始');
    this.log(`対象URL: ${this.baseUrl}`);
    this.log('');
    
    const results = {};
    
    // システムヘルスチェック
    results.systemHealth = await this.checkSystemHealth();
    this.log('');
    
    // APIエンドポイント監視
    results.apiEndpoints = await this.checkAPIEndpoints();
    this.log('');
    
    // データベース接続監視
    results.database = await this.checkDatabaseConnection();
    this.log('');
    
    // SSL証明書監視
    results.ssl = await this.checkSSLExpiry();
    this.log('');
    
    // アラートサマリー生成
    const alertSummary = this.generateAlertSummary(results);
    
    return {
      timestamp: new Date().toISOString(),
      results: results,
      alerts: alertSummary
    };
  }
}

// コマンドライン引数の処理
async function main() {
  const monitor = new AlertMonitor();
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      await monitor.runMonitoring();
      break;
      
    case 'watch':
      console.log('⏰ 継続監視モード開始 (30秒間隔)');
      console.log('終了するには Ctrl+C を押してください');
      
      setInterval(async () => {
        console.log('\n' + '='.repeat(60));
        await monitor.runMonitoring();
      }, 30000);
      break;
      
    default:
      console.log('📋 監視アラートシステム');
      console.log('');
      console.log('使用法:');
      console.log('  node alert-monitor.js check  - 一回監視実行');
      console.log('  node alert-monitor.js watch  - 継続監視開始');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AlertMonitor;
