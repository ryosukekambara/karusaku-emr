import React from 'react';

// セキュリティ設定
export const SECURITY_CONFIG = {
  // パスワードポリシー
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SPECIAL_CHARS: false,
  
  // セッション設定
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分
  REFRESH_TOKEN_INTERVAL: 5 * 60 * 1000, // 5分
  
  // レート制限
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15分
  
  // CSRF保護
  CSRF_TOKEN_HEADER: 'X-CSRF-Token',
  
  // コンテンツセキュリティポリシー
  CSP_NONCE_LENGTH: 32,
};

// セキュリティユーティリティクラス
export class SecurityUtils {
  // パスワード強度チェック
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // 長さチェック
    if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`パスワードは${SECURITY_CONFIG.PASSWORD_MIN_LENGTH}文字以上である必要があります。`);
    } else {
      score += 1;
    }

    // 大文字チェック
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('パスワードには大文字を含める必要があります。');
    } else if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // 小文字チェック
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('パスワードには小文字を含める必要があります。');
    } else if (/[a-z]/.test(password)) {
      score += 1;
    }

    // 数字チェック
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('パスワードには数字を含める必要があります。');
    } else if (/\d/.test(password)) {
      score += 1;
    }

    // 特殊文字チェック
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('パスワードには特殊文字を含める必要があります。');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(score, 5),
    };
  }

  // パスワード強度の視覚的表示
  static getPasswordStrengthLabel(score: number): {
    label: string;
    color: string;
    width: string;
  } {
    switch (score) {
      case 0:
      case 1:
        return { label: '非常に弱い', color: '#ff4444', width: '20%' };
      case 2:
        return { label: '弱い', color: '#ff8800', width: '40%' };
      case 3:
        return { label: '普通', color: '#ffbb33', width: '60%' };
      case 4:
        return { label: '強い', color: '#00C851', width: '80%' };
      case 5:
        return { label: '非常に強い', color: '#007E33', width: '100%' };
      default:
        return { label: '不明', color: '#cccccc', width: '0%' };
    }
  }

  // 入力値のサニタイズ
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // HTMLタグの除去
      .replace(/javascript:/gi, '') // JavaScriptプロトコルの除去
      .replace(/on\w+=/gi, '') // イベントハンドラーの除去
      .trim();
  }

  // HTMLエスケープ
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // URLエンコード
  static encodeUrl(url: string): string {
    return encodeURIComponent(url);
  }

  // ランダムな文字列生成
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // セキュアなトークン生成
  static generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // ハッシュ生成（簡易版）
  static async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// セッション管理クラス
export class SessionManager {
  private static instance: SessionManager;
  private sessionTimeout: number = SECURITY_CONFIG.SESSION_TIMEOUT;
  private refreshInterval: number = SECURITY_CONFIG.REFRESH_TOKEN_INTERVAL;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();

  private constructor() {
    this.initializeActivityTracking();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // アクティビティ追跡の初期化
  private initializeActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, true);
    });

    // 定期的にセッション状態をチェック
    setInterval(() => {
      this.checkSessionTimeout();
    }, 60000); // 1分ごと
  }

  // 最後のアクティビティを更新
  private updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  // セッションタイムアウトチェック
  private checkSessionTimeout(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;

    if (timeSinceLastActivity > this.sessionTimeout) {
      this.logout();
    } else if (timeSinceLastActivity > this.refreshInterval) {
      this.refreshToken();
    }
  }

  // トークンの更新
  private async refreshToken(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { token: newToken } = await response.json();
        localStorage.setItem('token', newToken);
        this.updateLastActivity();
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  // ログアウト処理
  private logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  // セッション設定の更新
  updateSessionConfig(timeout: number, refreshInterval: number): void {
    this.sessionTimeout = timeout;
    this.refreshInterval = refreshInterval;
  }
}

// レート制限管理クラス
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  // ログイン試行を記録
  recordLoginAttempt(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // ロックアウト期間をチェック
    if (now - attempt.lastAttempt < SECURITY_CONFIG.LOCKOUT_DURATION) {
      if (attempt.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        return false; // ロックアウト中
      }
    } else {
      // ロックアウト期間が過ぎている場合はリセット
      attempt.count = 0;
    }

    attempt.count++;
    attempt.lastAttempt = now;
    return true;
  }

  // ロックアウト状態をチェック
  isLockedOut(identifier: string): boolean {
    const attempt = this.attempts.get(identifier);
    if (!attempt) {
      return false;
    }

    const now = Date.now();
    return attempt.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS &&
           now - attempt.lastAttempt < SECURITY_CONFIG.LOCKOUT_DURATION;
  }

  // 残りロックアウト時間を取得
  getRemainingLockoutTime(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) {
      return 0;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    const remainingTime = SECURITY_CONFIG.LOCKOUT_DURATION - timeSinceLastAttempt;

    return Math.max(0, remainingTime);
  }

  // 試行回数をリセット
  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// CSRF保護クラス
export class CSRFProtection {
  private static token: string | null = null;

  // CSRFトークンを生成
  static generateToken(): string {
    this.token = SecurityUtils.generateSecureToken();
    return this.token;
  }

  // CSRFトークンを取得
  static getToken(): string | null {
    return this.token;
  }

  // CSRFトークンを検証
  static validateToken(token: string): boolean {
    return this.token === token;
  }

  // リクエストヘッダーにCSRFトークンを追加
  static addCSRFToken(headers: Headers): void {
    if (this.token) {
      headers.append(SECURITY_CONFIG.CSRF_TOKEN_HEADER, this.token);
    }
  }
}

// コンテンツセキュリティポリシー管理
export class CSPManager {
  // CSP nonceを生成
  static generateNonce(): string {
    return SecurityUtils.generateRandomString(SECURITY_CONFIG.CSP_NONCE_LENGTH);
  }

  // CSPヘッダーを設定
  static setCSPHeaders(): void {
    const nonce = this.generateNonce();
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + nonce + "'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    // メタタグでCSPを設定
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
  }
}

// セキュリティ監査クラス
export class SecurityAudit {
  private static auditLog: Array<{
    timestamp: Date;
    event: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  // セキュリティイベントを記録
  static logEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'low'): void {
    this.auditLog.push({
      timestamp: new Date(),
      event,
      details,
      severity,
    });

    // 重要なイベントはコンソールに出力
    if (severity === 'high' || severity === 'critical') {
      console.warn(`Security Event [${severity.toUpperCase()}]:`, event, details);
    }
  }

  // 監査ログを取得
  static getAuditLog(): Array<{
    timestamp: Date;
    event: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    return [...this.auditLog];
  }

  // 監査ログをクリア
  static clearAuditLog(): void {
    this.auditLog = [];
  }

  // セキュリティレポートを生成
  static generateSecurityReport(): {
    totalEvents: number;
    eventsBySeverity: { [key: string]: number };
    recentEvents: Array<{
      timestamp: Date;
      event: string;
      details: any;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  } {
    const eventsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    this.auditLog.forEach(log => {
      eventsBySeverity[log.severity]++;
    });

    const recentEvents = this.auditLog
      .slice(-10) // 最新10件
      .reverse();

    return {
      totalEvents: this.auditLog.length,
      eventsBySeverity,
      recentEvents,
    };
  }
}

// セキュリティフック
export const useSecurity = () => {
  const sessionManager = SessionManager.getInstance();
  const rateLimiter = new RateLimiter();

  const validatePassword = React.useCallback((password: string) => {
    return SecurityUtils.validatePassword(password);
  }, []);

  const sanitizeInput = React.useCallback((input: string) => {
    return SecurityUtils.sanitizeInput(input);
  }, []);

  const recordLoginAttempt = React.useCallback((identifier: string) => {
    return rateLimiter.recordLoginAttempt(identifier);
  }, [rateLimiter]);

  const isLockedOut = React.useCallback((identifier: string) => {
    return rateLimiter.isLockedOut(identifier);
  }, [rateLimiter]);

  const logSecurityEvent = React.useCallback((
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    SecurityAudit.logEvent(event, details, severity);
  }, []);

  return {
    validatePassword,
    sanitizeInput,
    recordLoginAttempt,
    isLockedOut,
    logSecurityEvent,
  };
};

// セキュリティ初期化
export const initializeSecurity = (): void => {
  // CSPヘッダーを設定
  CSPManager.setCSPHeaders();

  // セッション管理を開始
  SessionManager.getInstance();

  // セキュリティ監査を開始
  SecurityAudit.logEvent('Security initialized', {}, 'low');

  // 開発環境での警告
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security features are active in development mode');
  }
};
