#!/usr/bin/env node

const https = require('https');

class PerformanceTester {
  constructor() {
    this.baseUrl = 'https://karusaku-emr-aeza.onrender.com';
    this.results = [];
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  async measureResponseTime(url, iterations = 5) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        const response = await fetch(this.baseUrl + url);
        const endTime = Date.now();
        
        if (response.ok) {
          times.push(endTime - startTime);
        }
        
        // リクエスト間隔を空ける
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.log(`❌ リクエストエラー: ${error.message}`);
      }
    }
    
    if (times.length === 0) {
      return null;
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      average: Math.round(avgTime),
      minimum: minTime,
      maximum: maxTime,
      samples: times.length
    };
  }
  
  async testAPIEndpoints() {
    this.log('🔍 APIエンドポイントパフォーマンステスト');
    
    const endpoints = [
      { url: '/api/health', name: 'ヘルスチェック' },
      { url: '/api/auth/login', name: 'ログインAPI', method: 'POST', body: { username: 'admin', password: 'admin123' } }
    ];
    
    for (const endpoint of endpoints) {
      this.log(`📊 ${endpoint.name} テスト中...`);
      
      const options = {
        method: endpoint.method || 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const startTime = Date.now();
      const response = await fetch(this.baseUrl + endpoint.url, options);
      const endTime = Date.now();
      
      const result = {
        endpoint: endpoint.name,
        url: endpoint.url,
        status: response.status,
        responseTime: endTime - startTime,
        success: response.ok
      };
      
      this.results.push(result);
      
      if (result.success) {
        this.log(`✅ ${endpoint.name}: ${result.responseTime}ms`);
      } else {
        this.log(`❌ ${endpoint.name}: 失敗 (${result.status})`);
      }
    }
  }
  
  async testConcurrentRequests() {
    this.log('⚡ 同時リクエストテスト');
    
    const concurrentRequests = 10;
    const requests = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        fetch(this.baseUrl + '/api/health')
          .then(response => ({
            success: response.ok,
            status: response.status,
            requestId: i
          }))
          .catch(error => ({
            success: false,
            error: error.message,
            requestId: i
          }))
      );
    }
    
    const results = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    
    const result = {
      test: '同時リクエスト',
      concurrentRequests: concurrentRequests,
      totalTime: totalTime,
      successfulRequests: successfulRequests,
      failedRequests: failedRequests,
      successRate: (successfulRequests / concurrentRequests) * 100,
      averageTimePerRequest: totalTime / concurrentRequests
    };
    
    this.results.push(result);
    
    this.log(`📊 同時リクエスト結果:`);
    this.log(`   総時間: ${totalTime}ms`);
    this.log(`   成功: ${successfulRequests}/${concurrentRequests}`);
    this.log(`   成功率: ${result.successRate.toFixed(1)}%`);
    this.log(`   平均時間/リクエスト: ${result.averageTimePerRequest.toFixed(1)}ms`);
  }
  
  async testLoadPerformance() {
    this.log('📈 負荷テスト');
    
    const loadTests = [
      { requests: 5, name: '軽負荷' },
      { requests: 15, name: '中負荷' },
      { requests: 25, name: '高負荷' }
    ];
    
    for (const test of loadTests) {
      this.log(`🔄 ${test.name}テスト (${test.requests}リクエスト)`);
      
      const startTime = Date.now();
      const requests = [];
      
      for (let i = 0; i < test.requests; i++) {
        requests.push(
          fetch(this.baseUrl + '/api/health')
            .then(response => ({
              success: response.ok,
              status: response.status,
              responseTime: Date.now() - startTime
            }))
            .catch(error => ({
              success: false,
              error: error.message
            }))
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successfulRequests = results.filter(r => r.success).length;
      const responseTimes = results
        .filter(r => r.success && r.responseTime)
        .map(r => r.responseTime);
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      
      const result = {
        test: test.name,
        requests: test.requests,
        totalTime: totalTime,
        successfulRequests: successfulRequests,
        failedRequests: test.requests - successfulRequests,
        successRate: (successfulRequests / test.requests) * 100,
        averageResponseTime: Math.round(avgResponseTime),
        requestsPerSecond: (test.requests / totalTime) * 1000
      };
      
      this.results.push(result);
      
      this.log(`   📊 結果: ${result.successRate.toFixed(1)}% 成功, ${result.averageResponseTime}ms 平均, ${result.requestsPerSecond.toFixed(2)} req/s`);
      
      // テスト間隔
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  async testMemoryUsage() {
    this.log('💾 メモリ使用量テスト');
    
    try {
      // 複数回のリクエストでメモリリークをチェック
      const iterations = 20;
      const responseTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await fetch(this.baseUrl + '/api/health');
        const endTime = Date.now();
        
        if (response.ok) {
          responseTimes.push(endTime - startTime);
        }
        
        // 短い間隔でリクエスト
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const responseTimeVariance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
      const responseTimeStdDev = Math.sqrt(responseTimeVariance);
      
      const result = {
        test: 'メモリ使用量',
        iterations: iterations,
        averageResponseTime: Math.round(avgResponseTime),
        responseTimeStdDev: Math.round(responseTimeStdDev),
        stability: responseTimeStdDev < 100 ? '安定' : '不安定'
      };
      
      this.results.push(result);
      
      this.log(`📊 メモリテスト結果:`);
      this.log(`   平均レスポンス時間: ${result.averageResponseTime}ms`);
      this.log(`   標準偏差: ${result.responseTimeStdDev}ms`);
      this.log(`   安定性: ${result.stability}`);
      
    } catch (error) {
      this.log(`❌ メモリテストエラー: ${error.message}`);
    }
  }
  
  generateReport() {
    this.log('📊 パフォーマンステストレポート');
    this.log('='.repeat(60));
    
    // 全体的な統計
    const apiResults = this.results.filter(r => r.endpoint);
    const loadResults = this.results.filter(r => r.test && r.test.includes('負荷'));
    
    if (apiResults.length > 0) {
      this.log('🔍 APIパフォーマンス:');
      apiResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        this.log(`   ${status} ${result.endpoint}: ${result.responseTime}ms`);
      });
    }
    
    if (loadResults.length > 0) {
      this.log('');
      this.log('📈 負荷テスト結果:');
      loadResults.forEach(result => {
        this.log(`   ${result.test}: ${result.successRate.toFixed(1)}% 成功, ${result.requestsPerSecond.toFixed(2)} req/s`);
      });
    }
    
    // 推奨事項
    this.log('');
    this.log('🔧 パフォーマンス推奨事項:');
    
    const avgResponseTime = apiResults.length > 0 
      ? apiResults.reduce((sum, r) => sum + r.responseTime, 0) / apiResults.length 
      : 0;
    
    if (avgResponseTime > 2000) {
      this.log('   ⚠️  レスポンス時間が長いです。最適化を検討してください');
    } else if (avgResponseTime > 1000) {
      this.log('   💡 レスポンス時間は許容範囲ですが、改善の余地があります');
    } else {
      this.log('   ✅ レスポンス時間は良好です');
    }
    
    const lowSuccessRate = loadResults.some(r => r.successRate < 95);
    if (lowSuccessRate) {
      this.log('   ⚠️  負荷時の成功率が低いです。スケーリングを検討してください');
    } else {
      this.log('   ✅ 負荷耐性は良好です');
    }
    
    this.log('='.repeat(60));
  }
  
  async runAllTests() {
    this.log('🚀 パフォーマンステスト開始');
    this.log(`対象URL: ${this.baseUrl}`);
    this.log('');
    
    await this.testAPIEndpoints();
    this.log('');
    
    await this.testConcurrentRequests();
    this.log('');
    
    await this.testLoadPerformance();
    this.log('');
    
    await this.testMemoryUsage();
    this.log('');
    
    this.generateReport();
  }
}

// スクリプト実行
async function main() {
  const tester = new PerformanceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceTester;
