import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  securityAlert?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, securityAlert }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await onLogin(username, password);
    if (!success) {
      // エラーメッセージはApp.tsxで設定されるので、ここでは設定しない
      console.log('Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="logo-text">
              <h1>カルサク</h1>
              <p>電子カルテシステム</p>
            </div>
          </div>
        </div>

        {securityAlert && (
          <div className="security-alert">
            <span>{securityAlert}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">ユーザー名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="staff0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="login-info">
          <h3>ログイン情報</h3>
          <div className="user-list">
            <div className="user-item master">
              <strong>マスター権限:</strong> staff0 / staff0
            </div>
            <div className="user-item">
              <strong>スタッフ権限:</strong> staff1 / staff1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
