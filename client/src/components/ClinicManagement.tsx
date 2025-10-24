import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './ClinicManagement.css';

interface ClinicInfo {
  id: number;
  name: string;
  name_kana: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  business_hours: string;
  description: string;
  logo_url?: string;
  google_my_business_connected: boolean;
  created_at: string;
  updated_at: string;
}

const ClinicManagement: React.FC = () => {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({
    id: 1,
    name: 'カルサク治療院',
    name_kana: 'カルサクチリョウイン',
    category: '治療院',
    email: 'info@karusaku-clinic.com',
    phone: '03-1234-5678',
    address: '東京都渋谷区○○○ 1-2-3',
    business_hours: '平日 9:00-18:00\n土曜 9:00-17:00\n日祝 休診',
            description: '顧客様一人ひとりに寄り添った治療を提供する治療院です。',
    logo_url: '',
    google_my_business_connected: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchClinicInfo();
  }, []);

  const fetchClinicInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/clinic/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClinicInfo(data);
      } else {
        // デフォルトデータを使用
        console.log('店舗情報をデフォルトで読み込みました');
      }
    } catch (error) {
      console.error('店舗情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClinicInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/clinic/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(clinicInfo),
      });

      if (response.ok) {
        setSuccess('店舗情報が正常に更新されました');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '店舗情報の更新に失敗しました');
      }
    } catch (error) {
      console.error('店舗情報の更新に失敗しました:', error);
      setError('店舗情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 実際の実装ではファイルアップロードAPIを呼び出す
      const reader = new FileReader();
      reader.onload = (e) => {
        setClinicInfo(prev => ({
          ...prev,
          logo_url: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleMyBusinessConnect = () => {
    // Googleマイビジネス連携の実装（今回はスキップ）
    setSuccess('Googleマイビジネス連携機能は現在開発中です');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading) {
    return (
      <div className="clinic-management-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>店舗情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-management-container">
      <div className="clinic-header">
        <h1>店舗・治療院管理</h1>
        <div className="clinic-status">
          <span className={`status-badge ${clinicInfo.google_my_business_connected ? 'connected' : 'disconnected'}`}>
            {clinicInfo.google_my_business_connected ? 'Google連携済み' : 'Google未連携'}
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="clinic-tabs">
        <button
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          基本情報
        </button>
        <button
          className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          連絡先
        </button>
        <button
          className={`tab ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          営業情報
        </button>
        <button
          className={`tab ${activeTab === 'integration' ? 'active' : ''}`}
          onClick={() => setActiveTab('integration')}
        >
          外部連携
        </button>
      </div>

      <div className="clinic-content">
        <form onSubmit={handleSubmit} className="clinic-form">
          {activeTab === 'basic' && (
            <div className="tab-section">
              <h3>基本情報</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>店舗カテゴリ *</label>
                  <select
                    name="category"
                    value={clinicInfo.category}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="治療院">治療院</option>
                    <option value="整骨院">整骨院</option>
                    <option value="鍼灸院">鍼灸院</option>
                    <option value="マッサージ">マッサージ</option>
                    <option value="整体院">整体院</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>店舗・治療院名 *</label>
                  <input
                    type="text"
                    name="name"
                    value={clinicInfo.name}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>店舗・治療院名（カナ）</label>
                  <input
                    type="text"
                    name="name_kana"
                    value={clinicInfo.name_kana}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>店舗ロゴ</label>
                  <div className="logo-upload">
                    {clinicInfo.logo_url && (
                      <img src={clinicInfo.logo_url} alt="店舗ロゴ" className="logo-preview" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="file-input"
                    />
                    <button type="button" className="upload-btn">
                      ロゴをアップロード
                    </button>
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>店舗説明</label>
                  <textarea
                    name="description"
                    value={clinicInfo.description}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={4}
                    placeholder="店舗の特徴や治療方針などを記載してください"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="tab-section">
              <h3>連絡先情報</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>代表メールアドレス *</label>
                  <input
                    type="email"
                    name="email"
                    value={clinicInfo.email}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>電話番号 *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={clinicInfo.phone}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>住所 *</label>
                  <input
                    type="text"
                    name="address"
                    value={clinicInfo.address}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="tab-section">
              <h3>営業情報</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>営業時間</label>
                  <textarea
                    name="business_hours"
                    value={clinicInfo.business_hours}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={6}
                    placeholder="例：&#10;平日 9:00-18:00&#10;土曜 9:00-17:00&#10;日祝 休診"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integration' && (
            <div className="tab-section">
              <h3>外部連携</h3>
              <div className="integration-section">
                <div className="integration-card">
                  <div className="integration-header">
                    <div className="integration-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="integration-info">
                      <h4>Googleマイビジネス</h4>
                      <p>Google検索やマップでの表示を管理</p>
                    </div>
                    <div className="integration-status">
                      <span className={`status-badge ${clinicInfo.google_my_business_connected ? 'connected' : 'disconnected'}`}>
                        {clinicInfo.google_my_business_connected ? '連携済み' : '未連携'}
                      </span>
                    </div>
                  </div>
                  <div className="integration-actions">
                    <button
                      type="button"
                      onClick={handleGoogleMyBusinessConnect}
                      className={`connect-btn ${clinicInfo.google_my_business_connected ? 'disconnect' : 'connect'}`}
                    >
                      {clinicInfo.google_my_business_connected ? '連携解除' : 'Googleマイビジネスと連携'}
                    </button>
                  </div>
                </div>
                
                <div className="integration-note">
                  <h5>連携のメリット</h5>
                  <ul>
                    <li>Google検索での表示改善</li>
                    <li>Googleマップでの正確な位置表示</li>
                    <li>顧客様からの口コミ・評価の管理</li>
                    <li>営業時間や連絡先の自動同期</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? '保存中...' : '店舗情報を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClinicManagement;


