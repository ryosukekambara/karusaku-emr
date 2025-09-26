#!/usr/bin/env node

const https = require('https');

class IntegrationTester {
  constructor() {
    this.baseUrl = 'https://karusaku-emr-aeza.onrender.com';
    this.testResults = [];
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  async testAPI() {
    this.log('🔍 API統合テスト開始');
    
    const tests = [
      {
        name: 'ヘルスチェック',
        url: '/api/health',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: '認証テスト（無効な認証）',
        url: '/api/auth/login',
        method: 'POST',
        body: { username: 'invalid', password: 'invalid' },
        expectedStatus: 401
      },
      {
        name: '患者API（認証なし）',
        url: '/api/patients',
        method: 'GET',
        expectedStatus: 401
      }
    ];
    
    for (const test of tests) {
      try {
        const startTime = Date.now();
        
        const options = {
          method: test.method,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        if (test.body) {
          options.body = JSON.stringify(test.body);
        }
        
        const response = await fetch(this.baseUrl + test.url, options);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result = {
          name: test.name,
          status: response.status,
          expectedStatus: test.expectedStatus,
          responseTime,
          success: response.status === test.expectedStatus
        };
        
        this.testResults.push(result);
        
        if (result.success) {
          this.log(`✅ ${test.name}: 成功 (${response.status}) - ${responseTime}ms`);
        } else {
          this.log(`❌ ${test.name}: 失敗 (期待: ${test.expectedStatus}, 実際: ${response.status})`);
        }
        
      } catch (error) {
        this.log(`❌ ${test.name}: エラー - ${error.message}`);
        this.testResults.push({
          name: test.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  async testFrontend() {
    this.log('🌐 フロントエンド統合テスト開始');
    
    try {
      const startTime = Date.now();
      const frontendUrl = 'https://karusaku-emr-frontend.netlify.app';
      const response = await fetch(frontendUrl);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        this.log(`✅ フロントエンド: 成功 (${response.status}) - ${responseTime}ms`);
        this.log(`📄 Content-Type: ${contentType}`);
        this.log(`🌐 URL: ${frontendUrl}`);
        
        this.testResults.push({
          name: 'フロントエンド',
          status: response.status,
          responseTime,
          success: true
        });
      } else {
        this.log(`❌ フロントエンド: 失敗 (${response.status})`);
        this.testResults.push({
          name: 'フロントエンド',
          status: response.status,
          success: false
        });
      }
    } catch (error) {
      this.log(`❌ フロントエンド: エラー - ${error.message}`);
      this.testResults.push({
        name: 'フロントエンド',
        success: false,
        error: error.message
      });
    }
  }
  
  async testAuthentication() {
    this.log('🔐 認証システム統合テスト開始');
    
    const authTests = [
      {
        name: '管理者ログイン',
        username: 'admin',
        password: 'admin123'
      },
      {
        name: '医師ログイン',
        username: 'doctor1',
        password: 'doctor123'
      }
    ];
    
    for (const test of authTests) {
      try {
        const response = await fetch(this.baseUrl + '/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: test.username,
            password: test.password
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.log(`✅ ${test.name}: 成功 - トークン取得`);
          
          this.testResults.push({
            name: test.name,
            success: true,
            hasToken: !!data.token
          });
        } else {
          this.log(`❌ ${test.name}: 失敗 (${response.status})`);
          this.testResults.push({
            name: test.name,
            success: false,
            status: response.status
          });
        }
      } catch (error) {
        this.log(`❌ ${test.name}: エラー - ${error.message}`);
        this.testResults.push({
          name: test.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  generateReport() {
    this.log('📊 統合テスト結果レポート');
    this.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    this.log(`総テスト数: ${totalTests}`);
    this.log(`成功: ${passedTests}`);
    this.log(`失敗: ${failedTests}`);
    this.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    this.log('');
    
    if (failedTests === 0) {
      this.log('🎉 すべてのテストが成功しました！');
      this.log('✅ システムは本番環境で利用可能です');
    } else {
      this.log('⚠️  一部のテストが失敗しました');
      this.log('🔧 失敗したテストを確認してください');
    }
    
    this.log('='.repeat(50));
  }
  
  async runAllTests() {
    this.log('🚀 統合テスト開始');
    this.log(`対象URL: ${this.baseUrl}`);
    this.log('');
    
    await this.testAPI();
    this.log('');
    
    await this.testFrontend();
    this.log('');
    
    await this.testAuthentication();
    this.log('');
    
    this.generateReport();
  }
}

// スクリプト実行
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;
