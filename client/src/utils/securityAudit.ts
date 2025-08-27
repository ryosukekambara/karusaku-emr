import React, { useCallback } from 'react';

// セキュリティ監査イベントの型定義
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details: any;
  severity: SecuritySeverity;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// セキュリティ監査クラス
export class SecurityAudit {
  private static instance: SecurityAudit;
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;
  private listeners: Array<(event: SecurityEvent) => void> = [];

  private constructor() {
    this.loadEvents();
  }

  static getInstance(): SecurityAudit {
    if (!SecurityAudit.instance) {
      SecurityAudit.instance = new SecurityAudit();
    }
    return SecurityAudit.instance;
  }

  // イベントを記録
  logEvent(
    type: SecurityEventType,
    details: any,
    severity: SecuritySeverity = SecuritySeverity.LOW,
    userId?: string
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      userId,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      details,
      severity
    };

    this.events.push(event);
    this.trimEvents();
    this.saveEvents();
    this.notifyListeners(event);

    // 重大なイベントの場合はコンソールに出力
    if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
      console.warn('Security Event:', event);
    }
  }

  // ログイン成功を記録
  logLoginSuccess(userId: string, details?: any): void {
    this.logEvent(
      SecurityEventType.LOGIN_SUCCESS,
      { ...details, userId },
      SecuritySeverity.LOW,
      userId
    );
  }

  // ログイン失敗を記録
  logLoginFailure(username: string, reason: string, details?: any): void {
    this.logEvent(
      SecurityEventType.LOGIN_FAILURE,
      { username, reason, ...details },
      SecuritySeverity.MEDIUM
    );
  }

  // ログアウトを記録
  logLogout(userId: string, details?: any): void {
    this.logEvent(
      SecurityEventType.LOGOUT,
      { ...details, userId },
      SecuritySeverity.LOW,
      userId
    );
  }

  // パスワード変更を記録
  logPasswordChange(userId: string, details?: any): void {
    this.logEvent(
      SecurityEventType.PASSWORD_CHANGE,
      { ...details, userId },
      SecuritySeverity.MEDIUM,
      userId
    );
  }

  // データアクセスを記録
  logDataAccess(userId: string, resource: string, action: string, details?: any): void {
    this.logEvent(
      SecurityEventType.DATA_ACCESS,
      { resource, action, ...details },
      SecuritySeverity.LOW,
      userId
    );
  }

  // データ変更を記録
  logDataModification(userId: string, resource: string, action: string, details?: any): void {
    this.logEvent(
      SecurityEventType.DATA_MODIFICATION,
      { resource, action, ...details },
      SecuritySeverity.MEDIUM,
      userId
    );
  }

  // 権限拒否を記録
  logPermissionDenied(userId: string, resource: string, action: string, details?: any): void {
    this.logEvent(
      SecurityEventType.PERMISSION_DENIED,
      { resource, action, ...details },
      SecuritySeverity.HIGH,
      userId
    );
  }

  // 不審な活動を記録
  logSuspiciousActivity(userId: string, activity: string, details?: any): void {
    this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      { activity, ...details },
      SecuritySeverity.HIGH,
      userId
    );
  }

  // セッション期限切れを記録
  logSessionExpired(userId: string, details?: any): void {
    this.logEvent(
      SecurityEventType.SESSION_EXPIRED,
      { ...details, userId },
      SecuritySeverity.MEDIUM,
      userId
    );
  }

  // レート制限超過を記録
  logRateLimitExceeded(userId: string, endpoint: string, details?: any): void {
    this.logEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      { endpoint, ...details },
      SecuritySeverity.HIGH,
      userId
    );
  }

  // イベントリスナーの追加
  addEventListener(listener: (event: SecurityEvent) => void): void {
    this.listeners.push(listener);
  }

  // イベントリスナーの削除
  removeEventListener(listener: (event: SecurityEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // リスナーに通知
  private notifyListeners(event: SecurityEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in security event listener:', error);
      }
    });
  }

  // イベントを取得
  getEvents(
    filter?: {
      type?: SecurityEventType;
      severity?: SecuritySeverity;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filter.type);
      }
      if (filter.severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === filter.severity);
      }
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === filter.userId);
      }
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(event => event.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(event => event.timestamp <= filter.endDate!);
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // 統計情報を取得
  getStatistics(): {
    totalEvents: number;
    eventsByType: { [key in SecurityEventType]: number };
    eventsBySeverity: { [key in SecuritySeverity]: number };
    recentActivity: SecurityEvent[];
  } {
    const eventsByType = Object.values(SecurityEventType).reduce((acc, type) => {
      acc[type] = this.events.filter(event => event.type === type).length;
      return acc;
    }, {} as { [key in SecurityEventType]: number });

    const eventsBySeverity = Object.values(SecuritySeverity).reduce((acc, severity) => {
      acc[severity] = this.events.filter(event => event.severity === severity).length;
      return acc;
    }, {} as { [key in SecuritySeverity]: number });

    const recentActivity = this.events
      .slice(-10)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentActivity
    };
  }

  // イベントをクリア
  clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }

  // イベントをエクスポート
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  // イベントをインポート
  importEvents(eventsJson: string): void {
    try {
      const events = JSON.parse(eventsJson) as SecurityEvent[];
      this.events = events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
      this.saveEvents();
    } catch (error) {
      console.error('Failed to import security events:', error);
    }
  }

  // プライベートメソッド
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // 実際の実装では、サーバーサイドからIPアドレスを取得する必要があります
    return 'unknown';
  }

  private trimEvents(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private saveEvents(): void {
    try {
      localStorage.setItem('security_audit_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save security events:', error);
    }
  }

  private loadEvents(): void {
    try {
      const saved = localStorage.getItem('security_audit_events');
      if (saved) {
        this.events = JSON.parse(saved).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  }
}

// セキュリティ監査フック
export function useSecurityAudit() {
  const audit = SecurityAudit.getInstance();

  const logEvent = useCallback((
    type: SecurityEventType,
    details: any,
    severity: SecuritySeverity = SecuritySeverity.LOW,
    userId?: string
  ) => {
    audit.logEvent(type, details, severity, userId);
  }, [audit]);

  const getEvents = useCallback((filter?: any) => {
    return audit.getEvents(filter);
  }, [audit]);

  const getStatistics = useCallback(() => {
    return audit.getStatistics();
  }, [audit]);

  return {
    logEvent,
    getEvents,
    getStatistics,
    SecurityEventType,
    SecuritySeverity
  };
}

// セキュリティ監査の初期化
export function initializeSecurityAudit(): void {
  const audit = SecurityAudit.getInstance();

  // 重大なイベントの監視
  audit.addEventListener((event) => {
    if (event.severity === SecuritySeverity.CRITICAL) {
      // 管理者に通知するなどの処理
      console.error('Critical security event detected:', event);
    }
  });
}
