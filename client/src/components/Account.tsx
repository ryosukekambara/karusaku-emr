import React, { useState, useEffect } from 'react';
import './Account.css';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  preferences?: {
    theme: string;
    language: string;
    notifications: boolean;
    email_notifications: boolean;
  };
}

interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  login_notifications: boolean;
  device_management: boolean;
}

interface LoginHistory {
  id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  location?: string;
  status: 'success' | 'failed';
}

const Account: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // プロフィール編集用
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    department: ''
  });

  // パスワード変更用
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // セキュリティ設定用
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 30,
    login_notifications: true,
    device_management: true
  });

  // ログイン履歴
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

  const [saving, setSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    fetchUserInfo();
    fetchSecuritySettings();
    fetchLoginHistory();
  }, []);

  useEffect(() => {
    if (passwordData.new_password) {
      calculatePasswordStrength(passwordData.new_password);
    }
  }, [passwordData.new_password]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setProfileData({
          username: userData.username || '',
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone: userData.phone || '',
          department: userData.department || ''
        });
      } else {
        setError('ユーザー情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/security', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSecuritySettings(data);
      }
    } catch (error) {
      console.error('セキュリティ設定の取得に失敗しました:', error);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/login-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data);
      }
    } catch (error) {
      console.error('ログイン履歴の取得に失敗しました:', error);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: '非常に弱い', color: '#ff4444' };
      case 2:
        return { label: '弱い', color: '#ff8800' };
      case 3:
        return { label: '普通', color: '#ffbb33' };
      case 4:
        return { label: '強い', color: '#00C851' };
      case 5:
        return { label: '非常に強い', color: '#007E33' };
      default:
        return { label: '不明', color: '#cccccc' };
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        setSuccess('プロフィールが正常に更新されました');
        setTimeout(() => setSuccess(''), 3000);
        fetchUserInfo();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'プロフィールの更新に失敗しました');
      }
    } catch (error) {
      console.error('プロフィールの更新に失敗しました:', error);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (passwordStrength < 3) {
      setError('パスワードが弱すぎます。より強力なパスワードを設定してください');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        }),
      });

      if (response.ok) {
        setSuccess('パスワードが正常に変更されました');
        setTimeout(() => setSuccess(''), 3000);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setPasswordStrength(0);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'パスワードの変更に失敗しました');
      }
    } catch (error) {
      console.error('パスワードの変更に失敗しました:', error);
      setError('パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(securitySettings),
      });

      if (response.ok) {
        setSuccess('セキュリティ設定が正常に更新されました');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'セキュリティ設定の更新に失敗しました');
      }
    } catch (error) {
      console.error('セキュリティ設定の更新に失敗しました:', error);
      setError('セキュリティ設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!window.confirm('すべてのデバイスからログアウトしますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/account/logout-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSuccess('すべてのデバイスからログアウトしました');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('ログアウトの実行に失敗しました');
      }
    } catch (error) {
      console.error('ログアウトの実行に失敗しました:', error);
      setError('ログアウトの実行に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="account-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>アカウント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div className="account-header">
        <h1>アカウント管理</h1>
        <div className="user-info">
          <div className="avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="アバター" />
            ) : (
              <div className="avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-details">
            <h3>{user?.username}</h3>
            <p>{user?.email}</p>
            <span className="role-badge">{user?.role}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="account-tabs">
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          プロフィール
        </button>
        <button
          className={`tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          パスワード
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          セキュリティ
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          ログイン履歴
        </button>
      </div>

      <div className="account-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <h3>プロフィール情報</h3>
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>ユーザー名 *</label>
                  <input
                    type="text"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>メールアドレス *</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>姓</label>
                  <input
                    type="text"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>名</label>
                  <input
                    type="text"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>電話番号</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>部署</label>
                  <input
                    type="text"
                    name="department"
                    value={profileData.department}
                    onChange={handleProfileChange}
                    className="form-control"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? '保存中...' : 'プロフィールを保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="password-section">
            <h3>パスワード変更</h3>
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>現在のパスワード *</label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  required
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>新しいパスワード *</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                  className="form-control"
                />
                {passwordData.new_password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthLabel().color
                        }}
                      ></div>
                    </div>
                    <span className="strength-label">{getPasswordStrengthLabel().label}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>新しいパスワード（確認） *</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                  className="form-control"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? '変更中...' : 'パスワードを変更'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-section">
            <h3>セキュリティ設定</h3>
            <form onSubmit={handleSecuritySubmit} className="security-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>セッションタイムアウト（分）</label>
                  <input
                    type="number"
                    name="session_timeout"
                    value={securitySettings.session_timeout}
                    onChange={handleSecurityChange}
                    min="5"
                    max="480"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="two_factor_enabled"
                    checked={securitySettings.two_factor_enabled}
                    onChange={handleSecurityChange}
                  />
                  二要素認証を有効にする
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="login_notifications"
                    checked={securitySettings.login_notifications}
                    onChange={handleSecurityChange}
                  />
                  ログイン通知を有効にする
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="device_management"
                    checked={securitySettings.device_management}
                    onChange={handleSecurityChange}
                  />
                  デバイス管理を有効にする
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? '保存中...' : 'セキュリティ設定を保存'}
                </button>
                <button 
                  type="button" 
                  onClick={handleLogoutAllDevices}
                  className="logout-all-btn"
                >
                  すべてのデバイスからログアウト
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h3>ログイン履歴</h3>
            <div className="login-history">
              {loginHistory.length === 0 ? (
                <p className="no-history">ログイン履歴がありません</p>
              ) : (
                <div className="history-list">
                  {loginHistory.map(login => (
                    <div key={login.id} className={`history-item ${login.status}`}>
                      <div className="history-header">
                        <span className="history-timestamp">
                          {new Date(login.timestamp).toLocaleString('ja-JP')}
                        </span>
                        <span className={`history-status ${login.status}`}>
                          {login.status === 'success' ? '成功' : '失敗'}
                        </span>
                      </div>
                      <div className="history-details">
                        <div className="detail-item">
                          <span>IPアドレス:</span>
                          <span>{login.ip_address}</span>
                        </div>
                        <div className="detail-item">
                          <span>ブラウザ:</span>
                          <span>{login.user_agent}</span>
                        </div>
                        {login.location && (
                          <div className="detail-item">
                            <span>場所:</span>
                            <span>{login.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
