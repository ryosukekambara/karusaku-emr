#!/usr/bin/env node

const https = require('https');
const tls = require('tls');

class SSLChecker {
  constructor() {
    this.baseUrl = 'https://karusaku-emr-aeza.onrender.com';
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  async checkSSL() {
    this.log('🔒 SSL証明書チェック開始');
    
    try {
      const url = new URL(this.baseUrl);
      const hostname = url.hostname;
      const port = url.port || 443;
      
      this.log(`📋 チェック対象: ${hostname}:${port}`);
      
      const options = {
        hostname: hostname,
        port: port,
        method: 'GET',
        path: '/',
        rejectUnauthorized: true
      };
      
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          const cert = res.socket.getPeerCertificate();
          
          const result = {
            valid: true,
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            fingerprint: cert.fingerprint,
            serialNumber: cert.serialNumber,
            keySize: cert.bits,
            signatureAlgorithm: cert.sigalg
          };
          
          resolve(result);
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.end();
      });
      
    } catch (error) {
      this.log(`❌ SSL証明書チェックエラー: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }
  
  async checkSecurityHeaders() {
    this.log('🛡️ セキュリティヘッダーチェック');
    
    try {
      const response = await fetch(this.baseUrl);
      const headers = response.headers;
      
      const securityHeaders = {
        'strict-transport-security': headers.get('strict-transport-security'),
        'x-content-type-options': headers.get('x-content-type-options'),
        'x-frame-options': headers.get('x-frame-options'),
        'x-xss-protection': headers.get('x-xss-protection'),
        'content-security-policy': headers.get('content-security-policy'),
        'referrer-policy': headers.get('referrer-policy')
      };
      
      const result = {
        headers: securityHeaders,
        score: 0,
        recommendations: []
      };
      
      // セキュリティヘッダーの評価
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          result.score += 1;
        } else {
          result.recommendations.push(`${header} ヘッダーが設定されていません`);
        }
      });
      
      result.score = Math.round((result.score / Object.keys(securityHeaders).length) * 100);
      
      return result;
      
    } catch (error) {
      this.log(`❌ セキュリティヘッダーチェックエラー: ${error.message}`);
      return { error: error.message };
    }
  }
  
  async checkCipherSuites() {
    this.log('🔐 暗号スイートチェック');
    
    try {
      const url = new URL(this.baseUrl);
      const hostname = url.hostname;
      const port = url.port || 443;
      
      return new Promise((resolve, reject) => {
        const socket = tls.connect(port, hostname, {
          rejectUnauthorized: false
        }, () => {
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol();
          
          const result = {
            protocol: protocol,
            cipher: cipher.name,
            version: cipher.version,
            keyLength: cipher.keyLength,
            secure: protocol === 'TLSv1.2' || protocol === 'TLSv1.3'
          };
          
          socket.end();
          resolve(result);
        });
        
        socket.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      this.log(`❌ 暗号スイートチェックエラー: ${error.message}`);
      return { error: error.message };
    }
  }
  
  async checkCertificateChain() {
    this.log('🔗 証明書チェーンチェック');
    
    try {
      const url = new URL(this.baseUrl);
      const hostname = url.hostname;
      const port = url.port || 443;
      
      return new Promise((resolve, reject) => {
        const socket = tls.connect(port, hostname, {
          rejectUnauthorized: false
        }, () => {
          const cert = socket.getPeerCertificate(true);
          const chain = [];
          
          let currentCert = cert;
          while (currentCert) {
            chain.push({
              subject: currentCert.subject,
              issuer: currentCert.issuer,
              validFrom: currentCert.valid_from,
              validTo: currentCert.valid_to,
              fingerprint: currentCert.fingerprint
            });
            currentCert = currentCert.issuerCertificate;
          }
          
          const result = {
            chainLength: chain.length,
            chain: chain,
            valid: chain.length > 1 // 中間証明書があるかチェック
          };
          
          socket.end();
          resolve(result);
        });
        
        socket.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      this.log(`❌ 証明書チェーンチェックエラー: ${error.message}`);
      return { error: error.message };
    }
  }
  
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ja-JP');
  }
  
  generateReport(sslResult, headersResult, cipherResult, chainResult) {
    this.log('📊 SSL証明書レポート');
    this.log('='.repeat(60));
    
    // SSL証明書情報
    if (sslResult.valid) {
      this.log('🔒 SSL証明書情報:');
      this.log(`   発行者: ${sslResult.issuer?.CN || 'N/A'}`);
      this.log(`   有効期間: ${this.formatDate(sslResult.validFrom)} ～ ${this.formatDate(sslResult.validTo)}`);
      this.log(`   鍵長: ${sslResult.keySize} bits`);
      this.log(`   署名アルゴリズム: ${sslResult.signatureAlgorithm}`);
      this.log(`   フィンガープリント: ${sslResult.fingerprint}`);
    } else {
      this.log('❌ SSL証明書: 無効またはエラー');
    }
    
    this.log('');
    
    // セキュリティヘッダー
    if (headersResult.score !== undefined) {
      this.log('🛡️ セキュリティヘッダー:');
      this.log(`   スコア: ${headersResult.score}%`);
      
      Object.entries(headersResult.headers).forEach(([header, value]) => {
        const status = value ? '✅' : '❌';
        this.log(`   ${status} ${header}: ${value || '未設定'}`);
      });
      
      if (headersResult.recommendations.length > 0) {
        this.log('');
        this.log('🔧 推奨事項:');
        headersResult.recommendations.forEach(rec => {
          this.log(`   - ${rec}`);
        });
      }
    }
    
    this.log('');
    
    // 暗号スイート
    if (cipherResult.protocol) {
      this.log('🔐 暗号化情報:');
      this.log(`   プロトコル: ${cipherResult.protocol}`);
      this.log(`   暗号スイート: ${cipherResult.cipher}`);
      this.log(`   鍵長: ${cipherResult.keyLength} bits`);
      this.log(`   セキュリティ: ${cipherResult.secure ? '✅ 安全' : '⚠️ 要改善'}`);
    }
    
    this.log('');
    
    // 証明書チェーン
    if (chainResult.chainLength) {
      this.log('🔗 証明書チェーン:');
      this.log(`   チェーン長: ${chainResult.chainLength}`);
      this.log(`   完全性: ${chainResult.valid ? '✅ 完全' : '⚠️ 不完全'}`);
    }
    
    this.log('');
    
    // 総合評価
    let overallScore = 0;
    let maxScore = 0;
    
    if (sslResult.valid) {
      overallScore += 25;
      maxScore += 25;
    }
    
    if (headersResult.score !== undefined) {
      overallScore += (headersResult.score / 100) * 25;
      maxScore += 25;
    }
    
    if (cipherResult.secure) {
      overallScore += 25;
      maxScore += 25;
    }
    
    if (chainResult.valid) {
      overallScore += 25;
      maxScore += 25;
    }
    
    const finalScore = Math.round((overallScore / maxScore) * 100);
    
    this.log('📊 総合SSLセキュリティスコア:');
    this.log(`   スコア: ${finalScore}%`);
    
    if (finalScore >= 90) {
      this.log('   🎉 優秀: SSL設定は非常に良好です');
    } else if (finalScore >= 70) {
      this.log('   ✅ 良好: SSL設定は良好ですが、改善の余地があります');
    } else if (finalScore >= 50) {
      this.log('   ⚠️ 要改善: SSL設定に問題があります');
    } else {
      this.log('   ❌ 危険: SSL設定に重大な問題があります');
    }
    
    this.log('='.repeat(60));
  }
  
  async runAllChecks() {
    this.log('🚀 SSL証明書総合チェック開始');
    this.log(`対象URL: ${this.baseUrl}`);
    this.log('');
    
    const sslResult = await this.checkSSL();
    this.log('');
    
    const headersResult = await this.checkSecurityHeaders();
    this.log('');
    
    const cipherResult = await this.checkCipherSuites();
    this.log('');
    
    const chainResult = await this.checkCertificateChain();
    this.log('');
    
    this.generateReport(sslResult, headersResult, cipherResult, chainResult);
  }
}

// スクリプト実行
async function main() {
  const checker = new SSLChecker();
  await checker.runAllChecks();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SSLChecker;
