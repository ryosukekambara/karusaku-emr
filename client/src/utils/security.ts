import React from 'react';

// セキュリティ設定
export const SECURITY_CONFIG = {
  // セッションタイムアウト（分）
  SESSION_TIMEOUT: 30,
  // 最大ログイン試行回数
  MAX_LOGIN_ATTEMPTS: 5,
  // ロックアウト時間（分）
  LOCKOUT_DURATION: 15,
  // パスワード最小長
  MIN_PASSWORD_LENGTH: 8,
  // 自動ログアウト（分）
  AUTO_LOGOUT: 60
};

// セッション管理
export class SessionManager {
  private static instance: SessionManager;
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private sessionStartTime: number = Date.now();

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // ログイン試行を記録
  recordLoginAttempt(username: string): boolean {
    const now = Date.now();
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
    
    // ロックアウト時間を過ぎている場合はリセット
    if (now - attempts.lastAttempt > SECURITY_CONFIG.LOCKOUT_DURATION * 60 * 1000) {
      attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    this.loginAttempts.set(username, attempts);
    
    return attempts.count < SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
  }

  // ログイン成功時にリセット
  resetLoginAttempts(username: string): void {
    this.loginAttempts.delete(username);
  }

  // セッションが有効かチェック
  isSessionValid(): boolean {
    const elapsed = Date.now() - this.sessionStartTime;
    return elapsed < SECURITY_CONFIG.SESSION_TIMEOUT * 60 * 1000;
  }

  // セッションを更新
  refreshSession(): void {
    this.sessionStartTime = Date.now();
  }

  // 自動ログアウトチェック
  shouldAutoLogout(): boolean {
    const elapsed = Date.now() - this.sessionStartTime;
    return elapsed > SECURITY_CONFIG.AUTO_LOGOUT * 60 * 1000;
  }
}

// パスワード検証
export const validatePassword = (password: string): boolean => {
  return password.length >= SECURITY_CONFIG.MIN_PASSWORD_LENGTH;
};

// 入力値のサニタイズ
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTMLタグを除去
    .replace(/javascript:/gi, '') // JavaScriptプロトコルを除去
    .trim();
};

// CSRFトークン生成
export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// レート制限
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests = 100; // 1分間に最大100リクエスト
  private windowMs = 60 * 1000; // 1分

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    
    // 古いリクエストを削除
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    return true;
  }
}

// セキュリティ監査
export const securityAudit = {
  // 機密情報のチェック
  checkSensitiveData: (data: any): boolean => {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /credential/i
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return !sensitivePatterns.some(pattern => pattern.test(dataString));
  },

  // ログ出力のサニタイズ
  sanitizeLog: (message: string): string => {
    return message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***');
  }
};

// セッション管理のインスタンス
export const sessionManager = SessionManager.getInstance();
export const rateLimiter = new RateLimiter();
