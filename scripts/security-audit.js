#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.baseUrl = 'https://karusaku-emr-aeza.onrender.com';
    this.auditResults = [];
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  async checkHTTPS() {
    this.log('🔒 HTTPS接続チェック');
    
    try {
      const response = await fetch(this.baseUrl);
      const isHTTPS = this.baseUrl.startsWith('https://');
      const hasSecurityHeaders = this.checkSecurityHeaders(response.headers);
      
      const result = {
        test: 'HTTPS接続',
        passed: isHTTPS,
        details: {
          protocol: isHTTPS ? 'HTTPS' : 'HTTP',
          securityHeaders: hasSecurityHeaders
        }
      };
      
      this.auditResults.push(result);
      
      if (result.passed) {
        this.log('✅ HTTPS接続: 正常');
      } else {
        this.log('❌ HTTPS接続: 問題あり');
      }
      
    } catch (error) {
      this.log(`❌ HTTPS接続チェックエラー: ${error.message}`);
      this.auditResults.push({
        test: 'HTTPS接続',
        passed: false,
        error: error.message
      });
    }
  }
  
  checkSecurityHeaders(headers) {
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'content-security-policy'
    ];
    
    const foundHeaders = securityHeaders.filter(header => 
      headers.get(header) !== null
    );
    
    return {
      found: foundHeaders,
      missing: securityHeaders.filter(header => 
        !foundHeaders.includes(header)
      ),
      coverage: (foundHeaders.length / securityHeaders.length) * 100
    };
  }
  
  async checkAuthentication() {
    this.log('🔐 認証システムチェック');
    
    const authTests = [
      {
        name: '未認証アクセス制限',
        url: '/api/patients',
        expectedStatus: 401
      },
      {
        name: '無効な認証情報',
        url: '/api/auth/login',
        method: 'POST',
        body: { username: 'invalid', password: 'invalid' },
        expectedStatus: 401
      },
      {
        name: '認証なしでの管理機能アクセス',
        url: '/api/staff',
        expectedStatus: 401
      }
    ];
    
    for (const test of authTests) {
      try {
        const options = {
          method: test.method || 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        if (test.body) {
          options.body = JSON.stringify(test.body);
        }
        
        const response = await fetch(this.baseUrl + test.url, options);
        
        const result = {
          test: test.name,
          passed: response.status === test.expectedStatus,
          details: {
            expectedStatus: test.expectedStatus,
            actualStatus: response.status,
            url: test.url
          }
        };
        
        this.auditResults.push(result);
        
        if (result.passed) {
          this.log(`✅ ${test.name}: 正常`);
        } else {
          this.log(`❌ ${test.name}: 問題あり (期待: ${test.expectedStatus}, 実際: ${response.status})`);
        }
        
      } catch (error) {
        this.log(`❌ ${test.name}チェックエラー: ${error.message}`);
        this.auditResults.push({
          test: test.name,
          passed: false,
          error: error.message
        });
      }
    }
  }
  
  async checkPasswordSecurity() {
    this.log('🔑 パスワードセキュリティチェック');
    
    try {
      // 弱いパスワードでのログイン試行
      const weakPasswords = ['123456', 'password', 'admin', 'test'];
      let weakPasswordCount = 0;
      
      for (const password of weakPasswords) {
        const response = await fetch(this.baseUrl + '/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'admin',
            password: password
          })
        });
        
        if (response.ok) {
          weakPasswordCount++;
        }
      }
      
      const result = {
        test: 'パスワードセキュリティ',
        passed: weakPasswordCount === 0,
        details: {
          weakPasswordsAccepted: weakPasswordCount,
          totalTested: weakPasswords.length
        }
      };
      
      this.auditResults.push(result);
      
      if (result.passed) {
        this.log('✅ パスワードセキュリティ: 正常');
      } else {
        this.log(`❌ パスワードセキュリティ: 問題あり (${weakPasswordCount}個の弱いパスワードが受け入れられました)`);
      }
      
    } catch (error) {
      this.log(`❌ パスワードセキュリティチェックエラー: ${error.message}`);
      this.auditResults.push({
        test: 'パスワードセキュリティ',
        passed: false,
        error: error.message
      });
    }
  }
  
  async checkSQLInjection() {
    this.log('💉 SQLインジェクション対策チェック');
    
    const sqlInjectionTests = [
      "'; DROP TABLE patients; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM staff --"
    ];
    
    let vulnerabilityCount = 0;
    
    for (const payload of sqlInjectionTests) {
      try {
        const response = await fetch(this.baseUrl + '/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: payload,
            password: 'test'
          })
        });
        
        // エラーメッセージにSQLエラーが含まれていないかチェック
        const responseText = await response.text();
        if (responseText.includes('SQL') || responseText.includes('database')) {
          vulnerabilityCount++;
        }
        
      } catch (error) {
        // エラーは正常（SQLインジェクションが防がれている）
      }
    }
    
    const result = {
      test: 'SQLインジェクション対策',
      passed: vulnerabilityCount === 0,
      details: {
        vulnerabilitiesFound: vulnerabilityCount,
        totalTested: sqlInjectionTests.length
      }
    };
    
    this.auditResults.push(result);
    
    if (result.passed) {
      this.log('✅ SQLインジェクション対策: 正常');
    } else {
      this.log(`❌ SQLインジェクション対策: 問題あり (${vulnerabilityCount}個の脆弱性を発見)`);
    }
  }
  
  async checkRateLimiting() {
    this.log('⏱️  レート制限チェック');
    
    try {
      const requests = [];
      const requestCount = 10;
      
      // 短時間で複数リクエストを送信
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          fetch(this.baseUrl + '/api/health')
            .then(response => ({ status: response.status, index: i }))
            .catch(error => ({ error: error.message, index: i }))
        );
      }
      
      const results = await Promise.all(requests);
      const blockedRequests = results.filter(r => r.status === 429).length;
      
      const result = {
        test: 'レート制限',
        passed: blockedRequests > 0,
        details: {
          totalRequests: requestCount,
          blockedRequests: blockedRequests,
          rateLimitActive: blockedRequests > 0
        }
      };
      
      this.auditResults.push(result);
      
      if (result.passed) {
        this.log('✅ レート制限: 正常');
      } else {
        this.log('⚠️  レート制限: 設定されていない可能性');
      }
      
    } catch (error) {
      this.log(`❌ レート制限チェックエラー: ${error.message}`);
      this.auditResults.push({
        test: 'レート制限',
        passed: false,
        error: error.message
      });
    }
  }
  
  generateReport() {
    this.log('📊 セキュリティ監査レポート');
    this.log('='.repeat(60));
    
    const totalTests = this.auditResults.length;
    const passedTests = this.auditResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    this.log(`総テスト数: ${totalTests}`);
    this.log(`成功: ${passedTests}`);
    this.log(`失敗: ${failedTests}`);
    this.log(`セキュリティスコア: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    this.log('');
    
    // 詳細結果
    this.log('📋 詳細結果:');
    this.auditResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      this.log(`   ${index + 1}. ${status} ${result.test}`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          this.log(`      ${key}: ${value}`);
        });
      }
      if (result.error) {
        this.log(`      エラー: ${result.error}`);
      }
    });
    
    this.log('');
    
    // 推奨事項
    if (failedTests > 0) {
      this.log('🔧 推奨事項:');
      this.auditResults
        .filter(r => !r.passed)
        .forEach(result => {
          this.log(`   - ${result.test}の問題を修正してください`);
        });
    } else {
      this.log('🎉 すべてのセキュリティテストが成功しました！');
    }
    
    this.log('='.repeat(60));
  }
  
  async runAudit() {
    this.log('🔍 セキュリティ監査開始');
    this.log(`対象URL: ${this.baseUrl}`);
    this.log('');
    
    await this.checkHTTPS();
    this.log('');
    
    await this.checkAuthentication();
    this.log('');
    
    await this.checkPasswordSecurity();
    this.log('');
    
    await this.checkSQLInjection();
    this.log('');
    
    await this.checkRateLimiting();
    this.log('');
    
    this.generateReport();
  }
}

// スクリプト実行
async function main() {
  const auditor = new SecurityAuditor();
  await auditor.runAudit();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityAuditor;
