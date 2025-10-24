import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './BackupManagement.css';

interface BackupPlan {
  maxBackups: number;
  retentionDays: number;
  autoBackup: boolean;
  googleDriveSync: boolean;
  emailBackup: boolean;
  price: number;
}

interface BackupPlans {
  free: BackupPlan;
  starter: BackupPlan;
  pro: BackupPlan;
  enterprise: BackupPlan;
}

interface BackupUsage {
  current: number;
  limit: number;
  totalSize: string;
  retentionDays: number;
}

interface BackupFeatures {
  autoBackup: boolean;
  googleDriveSync: boolean;
  emailBackup: boolean;
}

const BackupManagement: React.FC = () => {
  const [plans, setPlans] = useState<BackupPlans | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [usage, setUsage] = useState<BackupUsage | null>(null);
  const [features, setFeatures] = useState<BackupFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleDriveEmail, setGoogleDriveEmail] = useState('');
  const [backupEmail, setBackupEmail] = useState('');
  const [emailFrequency, setEmailFrequency] = useState('monthly');

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [plansResponse, usageResponse] = await Promise.all([
        fetch(`${config.baseURL}/api/backup/plans`, { headers }),
        fetch(`${config.baseURL}/api/backup/usage/demo-clinic`, { headers })
      ]);

      const plansData = await plansResponse.json();
      const usageData = await usageResponse.json();

      setPlans(plansData.plans);
      setCurrentPlan(plansData.currentPlan);
      setUsage(usageData.usage);
      setFeatures(usageData.features);
    } catch (error) {
      console.error('バックアップデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradePlan = async (plan: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/backup/upgrade-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      const data = await response.json();
      if (data.success) {
        alert(`プランがアップグレードされました: ${plan}`);
        fetchBackupData();
      }
    } catch (error) {
      console.error('プランアップグレードエラー:', error);
      alert('プランアップグレードに失敗しました');
    }
  };

  const setupGoogleDrive = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/backup/setup-google-drive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clinicId: 'demo-clinic',
          email: googleDriveEmail
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Google Drive連携が設定されました');
        setGoogleDriveEmail('');
      }
    } catch (error) {
      console.error('Google Drive設定エラー:', error);
      alert('Google Drive設定に失敗しました');
    }
  };

  const setupEmailBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/backup/setup-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clinicId: 'demo-clinic',
          email: backupEmail,
          frequency: emailFrequency
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('メールバックアップが設定されました');
        setBackupEmail('');
      }
    } catch (error) {
      console.error('メールバックアップ設定エラー:', error);
      alert('メールバックアップ設定に失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">データを読み込み中...</div>;
  }

  return (
    <div className="backup-management">
      <div className="backup-header">
        <h1>バックアップ管理</h1>
        <p>医療データの安全な保管と復元を管理します（保存期間3年対応）</p>
      </div>

      <div className="backup-overview">
        <div className="current-plan">
          <h3>現在のプラン: {currentPlan.toUpperCase()}</h3>
          {usage && (
            <div className="usage-stats">
              <div className="usage-item">
                <span>バックアップ数:</span>
                <span>{usage.current} / {usage.limit}</span>
              </div>
              <div className="usage-item">
                <span>総容量:</span>
                <span>{usage.totalSize}</span>
              </div>
              <div className="usage-item">
                <span>保持期間:</span>
                <span>{usage.retentionDays}日</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="backup-plans">
        <h3>プラン一覧</h3>
        <div className="plans-grid">
          {plans && Object.entries(plans).map(([planName, plan]) => (
            <div key={planName} className={`plan-card ${currentPlan === planName ? 'current' : ''}`}>
              <div className="plan-header">
                <h4>{planName.toUpperCase()}</h4>
                <div className="plan-price">¥{plan.price.toLocaleString()}/月</div>
              </div>
              <div className="plan-features">
                <div className="feature">
                  <span>バックアップ数:</span>
                  <span>{plan.maxBackups}個</span>
                </div>
                <div className="feature">
                  <span>保持期間:</span>
                  <span>{plan.retentionDays}日</span>
                </div>
                <div className="feature">
                  <span>自動バックアップ:</span>
                  <span>{plan.autoBackup ? '✓' : '✗'}</span>
                </div>
                <div className="feature">
                  <span>Google Drive連携:</span>
                  <span>{plan.googleDriveSync ? '✓' : '✗'}</span>
                </div>
                <div className="feature">
                  <span>メールバックアップ:</span>
                  <span>{plan.emailBackup ? '✓' : '✗'}</span>
                </div>
              </div>
              {currentPlan !== planName && (
                <button 
                  className="upgrade-btn"
                  onClick={() => upgradePlan(planName)}
                >
                  アップグレード
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="backup-settings">
        <h3>バックアップ設定</h3>
        
        {features?.googleDriveSync && (
          <div className="setting-section">
            <h4>Google Drive連携</h4>
            <div className="setting-form">
              <input
                type="email"
                placeholder="Google Drive用メールアドレス"
                value={googleDriveEmail}
                onChange={(e) => setGoogleDriveEmail(e.target.value)}
              />
              <button onClick={setupGoogleDrive}>連携設定</button>
            </div>
          </div>
        )}

        {features?.emailBackup && (
          <div className="setting-section">
            <h4>メールバックアップ</h4>
            <div className="setting-form">
              <input
                type="email"
                placeholder="バックアップ送信先メール"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
              />
              <select 
                value={emailFrequency}
                onChange={(e) => setEmailFrequency(e.target.value)}
              >
                <option value="monthly">月次</option>
                <option value="weekly">週次</option>
                <option value="daily">日次</option>
              </select>
              <button onClick={setupEmailBackup}>設定</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManagement;
