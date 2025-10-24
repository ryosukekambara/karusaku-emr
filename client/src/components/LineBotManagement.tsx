import React, { useState, useEffect } from 'react';
import config from '../config/api';
import { BarChart3, FileText, CheckCircle, XCircle, Activity } from 'lucide-react';
import './LineBotManagement.css';

interface AbsenceReport {
  staffId: string;
  staffName: string;
  absenceData: {
    reason: string;
    date: string;
    time: string;
  };
  timestamp: string;
  status: string;
}

interface SubstituteRequest {
  staffId: string;
  staffName: string;
  status: 'accepted' | 'declined' | 'pending';
  timestamp: string;
}

interface LineBotStats {
  totalAbsenceReports: number;
  totalSubstituteRequests: number;
  acceptedSubstitutes: number;
  declinedSubstitutes: number;
}

const LineBotManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'requests' | 'test'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // データ管理
  const [stats, setStats] = useState<LineBotStats>({
    totalAbsenceReports: 0,
    totalSubstituteRequests: 0,
    acceptedSubstitutes: 0,
    declinedSubstitutes: 0
  });
  
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [substituteRequests, setSubstituteRequests] = useState<SubstituteRequest[]>([]);
  
  // テスト用データ
  const [testData, setTestData] = useState({
    staffId: 'U1234567890',
    message: '今日体調不良で欠勤します'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 統計データ取得
      const statsResponse = await fetch('${config.baseURL}/api/line-bot/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // 欠勤報告取得
      const reportsResponse = await fetch('${config.baseURL}/api/line-bot/absence-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // 代替出勤依頼取得
      const requestsResponse = await fetch('${config.baseURL}/api/line-bot/substitute-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
      
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setAbsenceReports(reportsData);
      }
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setSubstituteRequests(requestsData);
      }
      
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAbsenceReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/line-bot/test/absence-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        setSuccess('テスト欠勤報告が送信されました');
        // データを再取得
        setTimeout(() => {
          fetchData();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'テスト送信に失敗しました');
      }
    } catch (error) {
      console.error('テスト送信エラー:', error);
      setError('テスト送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { text: string; class: string } } = {
      'reported': { text: '報告済み', class: 'status-reported' },
      'processing': { text: '処理中', class: 'status-processing' },
      'completed': { text: '完了', class: 'status-completed' },
      'accepted': { text: '受諾', class: 'status-accepted' },
      'declined': { text: '拒否', class: 'status-declined' },
      'pending': { text: '待機中', class: 'status-pending' }
    };
    
    const config = statusConfig[status] || { text: status, class: 'status-default' };
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  return (
    <div className="line-bot-management">
      <div className="header">
        <h2>🤖 LINE Bot自動化管理</h2>
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={16} /> ダッシュボード
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={16} /> 欠勤報告
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            🔄 代替出勤
          </button>
          <button 
            className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            🧪 テスト
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'dashboard' && (
        <div className="dashboard-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><FileText size={24} /></div>
              <div className="stat-content">
                <h3>欠勤報告</h3>
                <p className="stat-number">{stats.totalAbsenceReports}</p>
                <p className="stat-label">件</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <h3>代替出勤依頼</h3>
                <p className="stat-number">{stats.totalSubstituteRequests}</p>
                <p className="stat-label">件</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon"><CheckCircle size={24} /></div>
              <div className="stat-content">
                <h3>受諾数</h3>
                <p className="stat-number">{stats.acceptedSubstitutes}</p>
                <p className="stat-label">件</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon"><XCircle size={24} /></div>
              <div className="stat-content">
                <h3>拒否数</h3>
                <p className="stat-number">{stats.declinedSubstitutes}</p>
                <p className="stat-label">件</p>
              </div>
            </div>
          </div>

          <div className="recent-activity">
            <h3>最近の活動</h3>
            <div className="activity-list">
              {absenceReports.slice(0, 5).map((report, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon"><Activity size={16} /></div>
                  <div className="activity-content">
                    <p><strong>{report.staffName}</strong> が欠勤報告</p>
                    <p className="activity-time">{formatDateTime(report.timestamp)}</p>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="reports-container">
          <div className="section-header">
            <h3>欠勤報告一覧</h3>
            <button className="btn btn-primary" onClick={fetchData}>
              更新
            </button>
          </div>
          
          {absenceReports.length === 0 ? (
            <div className="no-data">欠勤報告はありません</div>
          ) : (
            <div className="table-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>スタッフ名</th>
                    <th>欠勤日</th>
                    <th>時間</th>
                    <th>理由</th>
                    <th>報告時刻</th>
                    <th>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {absenceReports.map((report, index) => (
                    <tr key={index}>
                      <td>{report.staffName}</td>
                      <td>{report.absenceData.date}</td>
                      <td>{report.absenceData.time}</td>
                      <td>{report.absenceData.reason}</td>
                      <td>{formatDateTime(report.timestamp)}</td>
                      <td>{getStatusBadge(report.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="requests-container">
          <div className="section-header">
            <h3>代替出勤依頼一覧</h3>
            <button className="btn btn-primary" onClick={fetchData}>
              更新
            </button>
          </div>
          
          {substituteRequests.length === 0 ? (
            <div className="no-data">代替出勤依頼はありません</div>
          ) : (
            <div className="table-container">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>スタッフ名</th>
                    <th>ステータス</th>
                    <th>回答時刻</th>
                  </tr>
                </thead>
                <tbody>
                  {substituteRequests.map((request, index) => (
                    <tr key={index}>
                      <td>{request.staffName}</td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{formatDateTime(request.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'test' && (
        <div className="test-container">
          <h3>🧪 LINE Botテスト</h3>
          <p className="section-description">
            LINE Botの動作をテストできます。欠勤報告のシミュレーションを実行してください。
          </p>
          
          <div className="test-form">
            <div className="form-group">
              <label htmlFor="staff-id">スタッフID</label>
              <input
                type="text"
                id="staff-id"
                value={testData.staffId}
                onChange={(e) => setTestData({ ...testData, staffId: e.target.value })}
                placeholder="U1234567890"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="test-message">テストメッセージ</label>
              <textarea
                id="test-message"
                value={testData.message}
                onChange={(e) => setTestData({ ...testData, message: e.target.value })}
                rows={3}
                placeholder="今日体調不良で欠勤します"
              />
            </div>
            
            <div className="test-actions">
              <button 
                className="btn btn-primary"
                onClick={handleTestAbsenceReport}
                disabled={loading}
              >
                {loading ? '送信中...' : 'テスト送信'}
              </button>
            </div>
          </div>
          
          <div className="test-examples">
            <h4>テストメッセージ例</h4>
            <div className="example-messages">
              <button 
                className="example-btn"
                onClick={() => setTestData({ ...testData, message: '今日体調不良で欠勤します' })}
              >
                体調不良で欠勤
              </button>
              <button 
                className="example-btn"
                onClick={() => setTestData({ ...testData, message: '風邪で明日休みます' })}
              >
                風邪で休み
              </button>
              <button 
                className="example-btn"
                onClick={() => setTestData({ ...testData, message: '代わりに出勤します' })}
              >
                代替出勤受諾
              </button>
              <button 
                className="example-btn"
                onClick={() => setTestData({ ...testData, message: '代わりに出勤できません' })}
              >
                代替出勤拒否
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineBotManagement;


