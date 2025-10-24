import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './Settings.css';

interface SystemSettings {
  clinic_name: string;
  clinic_postal_code: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  default_therapist_id: number;
  auto_backup: boolean;
  backup_frequency: string;
  data_retention_days: number;
  notification_enabled: boolean;
  email_notifications: boolean;
  // セキュリティ設定
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
  };
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  // 表示設定
  theme: string;
  language: string;
  date_format: string;
  time_format: string;
  // 通知設定
  appointment_reminders: boolean;
  reminder_hours: number;
  sms_notifications: boolean;
  // データ設定
  auto_archive: boolean;
  archive_after_days: number;
  export_format: string;
}

interface Therapist {
  id: number;
  name: string;
  specialty: string;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  event_type: string;
  description: string;
  severity: string;
  user_id?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    clinic_name: '',
    clinic_postal_code: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    default_therapist_id: 0,
    auto_backup: true,
    backup_frequency: 'daily',
    data_retention_days: 365,
    notification_enabled: true,
    email_notifications: false,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: false
    },
    session_timeout: 30,
    max_login_attempts: 5,
    lockout_duration: 15,
    theme: 'light',
    language: 'ja',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    appointment_reminders: true,
    reminder_hours: 24,
    sms_notifications: false,
    auto_archive: false,
    archive_after_days: 730,
    export_format: 'csv'
  });
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
    fetchTherapists();
    fetchSecurityLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      // ローカルストレージから設定を読み込み
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        const data = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
      setError('設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/therapists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (error) {
      console.error('施術者情報の取得に失敗しました:', error);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/settings/security-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSecurityLogs(data);
      }
    } catch (error) {
      console.error('セキュリティログの取得に失敗しました:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof SystemSettings] as any),
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // 郵便番号から住所を自動取得
    if (name === 'clinic_postal_code' && value.length === 7) {
      fetchAddressFromPostalCode(value);
    }
  };

  const fetchAddressFromPostalCode = async (postalCode: string) => {
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
      const data = await response.json();
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        const fullAddress = `${result.address1}${result.address2}${result.address3}`;
        setSettings(prev => ({
          ...prev,
          clinic_address: fullAddress
        }));
      }
    } catch (error) {
      console.error('住所取得エラー:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // ローカルストレージに設定を保存
      localStorage.setItem('systemSettings', JSON.stringify(settings));
      setSuccess('設定が正常に保存されました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      // ローカルストレージから設定を取得してダウンロード
      const settingsData = localStorage.getItem('systemSettings');
      if (settingsData) {
        const blob = new Blob([settingsData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karusaku-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccess('バックアップが完了しました');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('バックアップする設定がありません');
      }
    } catch (error) {
      console.error('バックアップの開始に失敗しました:', error);
      setError('バックアップの開始に失敗しました');
    }
  };

  const handleRestore = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settingsData = JSON.parse(e.target?.result as string);
          localStorage.setItem('systemSettings', JSON.stringify(settingsData));
          setSettings(prev => ({ ...prev, ...settingsData }));
          setSuccess('復元が完了しました');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          console.error('復元に失敗しました:', error);
          setError('復元に失敗しました');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('復元に失敗しました:', error);
      setError('復元に失敗しました');
    }
  };

  const handleExportSettings = async () => {
    try {
      // ローカルストレージから設定を取得してダウンロード
      const settingsData = localStorage.getItem('systemSettings');
      if (settingsData) {
        const blob = new Blob([settingsData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karusaku-settings-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSuccess('設定のエクスポートが完了しました');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('エクスポートする設定がありません');
      }
    } catch (error) {
      console.error('設定のエクスポートに失敗しました:', error);
      setError('設定のエクスポートに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>システム設定</h1>
        <div className="header-actions">
          <button onClick={handleBackup} className="action-btn">
            バックアップ作成
          </button>
          <button onClick={handleExportSettings} className="action-btn">
            設定エクスポート
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          基本設定
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          セキュリティ
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          通知設定
        </button>
        <button
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          データ管理
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          セキュリティログ
        </button>
      </div>

      <form onSubmit={handleSubmit} className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <div className="section-card">
              <h3>クリニック情報</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>クリニック名 *</label>
                  <input
                    type="text"
                    name="clinic_name"
                    value={settings.clinic_name}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>郵便番号</label>
                  <input
                    type="text"
                    name="clinic_postal_code"
                    value={settings.clinic_postal_code || ''}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="例: 1234567"
                    maxLength={7}
                    pattern="[0-9]{7}"
                  />
                  <small className="form-help">7桁の数字を入力すると住所が自動で入力されます</small>
                </div>
                <div className="form-group">
                  <label>住所</label>
                  <input
                    type="text"
                    name="clinic_address"
                    value={settings.clinic_address}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="住所を入力してください"
                  />
                </div>
                <div className="form-group">
                  <label>電話番号</label>
                  <input
                    type="tel"
                    name="clinic_phone"
                    value={settings.clinic_phone}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>メールアドレス</label>
                  <input
                    type="email"
                    name="clinic_email"
                    value={settings.clinic_email}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3>表示設定</h3>
              <div className="form-grid">
                <div className="form-group">
                <label>テーマ</label>
                <select
                  name="theme"
                  value={settings.theme}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="light">ライト</option>
                  <option value="dark">ダーク</option>
                  <option value="auto">自動</option>
                </select>
              </div>
              <div className="form-group">
                <label>言語</label>
                <select
                  name="language"
                  value={settings.language}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-group">
                <label>日付形式</label>
                <select
                  name="date_format"
                  value={settings.date_format}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
              <div className="form-group">
                <label>時刻形式</label>
                <select
                  name="time_format"
                  value={settings.time_format}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="24h">24時間</option>
                  <option value="12h">12時間</option>
                </select>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="settings-section">
            <div className="section-card">
              <h3>パスワードポリシー</h3>
              <div className="form-grid">
                <div className="form-group">
                <label>最小文字数</label>
                <input
                  type="number"
                  name="password_policy.min_length"
                  value={settings.password_policy.min_length}
                  onChange={handleInputChange}
                  min="6"
                  max="20"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>セッションタイムアウト（分）</label>
                <input
                  type="number"
                  name="session_timeout"
                  value={settings.session_timeout}
                  onChange={handleInputChange}
                  min="5"
                  max="480"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>最大ログイン試行回数</label>
                <input
                  type="number"
                  name="max_login_attempts"
                  value={settings.max_login_attempts}
                  onChange={handleInputChange}
                  min="3"
                  max="10"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>ロックアウト時間（分）</label>
                <input
                  type="number"
                  name="lockout_duration"
                  value={settings.lockout_duration}
                  onChange={handleInputChange}
                  min="5"
                  max="60"
                  className="form-control"
                />
              </div>
              </div>

              <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="password_policy.require_uppercase"
                  checked={settings.password_policy.require_uppercase}
                  onChange={handleInputChange}
                />
                大文字を含む
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="password_policy.require_lowercase"
                  checked={settings.password_policy.require_lowercase}
                  onChange={handleInputChange}
                />
                小文字を含む
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="password_policy.require_numbers"
                  checked={settings.password_policy.require_numbers}
                  onChange={handleInputChange}
                />
                数字を含む
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="password_policy.require_special_chars"
                  checked={settings.password_policy.require_special_chars}
                  onChange={handleInputChange}
                />
                特殊文字を含む
              </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <div className="section-card">
              <h3>通知設定</h3>
              <div className="form-grid">
                <div className="form-group">
                <label>予約リマインダー</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="appointment_reminders"
                    checked={settings.appointment_reminders}
                    onChange={handleInputChange}
                  />
                  <span>予約のリマインダーを有効にする</span>
                </div>
              </div>
              <div className="form-group">
                <label>リマインダー時間（時間前）</label>
                <input
                  type="number"
                  name="reminder_hours"
                  value={settings.reminder_hours}
                  onChange={handleInputChange}
                  min="1"
                  max="72"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>メール通知</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={settings.email_notifications}
                    onChange={handleInputChange}
                  />
                  <span>メール通知を有効にする</span>
                </div>
              </div>
              <div className="form-group">
                <label>SMS通知</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="sms_notifications"
                    checked={settings.sms_notifications}
                    onChange={handleInputChange}
                  />
                  <span>SMS通知を有効にする</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="settings-section">
            <div className="section-card">
              <h3>データ管理</h3>
              <div className="form-grid">
                <div className="form-group">
                <label>自動バックアップ</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="auto_backup"
                    checked={settings.auto_backup}
                    onChange={handleInputChange}
                  />
                  <span>自動バックアップを有効にする</span>
                </div>
              </div>
              <div className="form-group">
                <label>バックアップ頻度</label>
                <select
                  name="backup_frequency"
                  value={settings.backup_frequency}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>
              <div className="form-group">
                <label>データ保持期間（日）</label>
                <input
                  type="number"
                  name="data_retention_days"
                  value={settings.data_retention_days}
                  onChange={handleInputChange}
                  min="30"
                  max="3650"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>自動アーカイブ</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="auto_archive"
                    checked={settings.auto_archive}
                    onChange={handleInputChange}
                  />
                  <span>古いデータを自動アーカイブする</span>
                </div>
              </div>
              <div className="form-group">
                <label>アーカイブ期間（日）</label>
                <input
                  type="number"
                  name="archive_after_days"
                  value={settings.archive_after_days}
                  onChange={handleInputChange}
                  min="365"
                  max="3650"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>エクスポート形式</label>
                <select
                  name="export_format"
                  value={settings.export_format}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                </select>
              </div>
            </div>

            <div className="backup-section">
              <h4>手動バックアップ・復元</h4>
              <div className="backup-actions">
                <button type="button" onClick={handleBackup} className="backup-btn">
                  バックアップ作成
                </button>
                <div className="restore-section">
                  <input
                    type="file"
                    accept=".json,.zip"
                    onChange={(e) => e.target.files?.[0] && handleRestore(e.target.files[0])}
                    id="restore-file"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="restore-file" className="restore-btn">
                    復元ファイル選択
                  </label>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="settings-section">
            <div className="section-card">
              <h3>セキュリティログ</h3>
              <div className="security-logs">
              {securityLogs.length === 0 ? (
                <p className="no-logs">セキュリティログがありません</p>
              ) : (
                <div className="logs-list">
                  {securityLogs.map(log => (
                    <div key={log.id} className={`log-item ${log.severity}`}>
                      <div className="log-header">
                        <span className="log-timestamp">{new Date(log.timestamp).toLocaleString('ja-JP')}</span>
                        <span className={`log-severity ${log.severity}`}>{log.severity}</span>
                      </div>
                      <div className="log-event">{log.event_type}</div>
                      <div className="log-description">{log.description}</div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
