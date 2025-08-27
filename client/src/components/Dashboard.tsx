import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

interface MonthlyStats {
  month: string;
  total_patients: number;
  new_patients: number;
  existing_patients: number;
}

interface TodayStats {
  total_patients: number;
  new_patients: number;
  existing_patients: number;
}

interface TherapistStats {
  id: number;
  name: string;
  specialty: string;
  total_patients: number;
  total_records: number;
  new_patients: number;
  repeat_rate: number;
}

const Dashboard: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyStats[]>([]);
  const [therapistStats, setTherapistStats] = useState<TherapistStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 並列でデータ取得
      const [patientsResponse, todayResponse, trendResponse, therapistResponse] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/statistics/today', { headers }),
        fetch('/api/statistics/monthly-trend', { headers }),
        fetch('/api/statistics/therapists', { headers })
      ]);

      const [patientsData, todayData, trendData, therapistData] = await Promise.all([
        patientsResponse.json(),
        todayResponse.json(),
        trendResponse.json(),
        therapistResponse.json()
      ]);

      setPatients(patientsData);
      setTodayStats(todayData);
      setMonthlyTrend(trendData);
      setTherapistStats(therapistData);

      // 当月統計取得
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
      setSelectedMonth(currentMonth);
      
      const monthlyResponse = await fetch(`/api/statistics/monthly?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`, { headers });
      const monthlyData = await monthlyResponse.json();
      setMonthlyStats(monthlyData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadCSV = useCallback(() => {
    const headers = ['ID', '氏名', '生年月日', '性別', '電話番号', '住所', '緊急連絡先', '登録日'];
    const csvContent = [
      headers.join(','),
      ...patients.map(patient => [
        patient.id,
        patient.name,
        patient.date_of_birth,
        patient.gender,
        patient.phone,
        patient.address,
        patient.emergency_contact,
        patient.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `顧客データ_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [patients]);

  const downloadMonthlyCSV = useCallback(() => {
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-');
    
    const filteredPatients = patients.filter(patient => {
      const patientDate = new Date(patient.created_at);
      return patientDate.getMonth() + 1 === parseInt(selectedMonthNum) && patientDate.getFullYear() === parseInt(selectedYear);
    });

    const headers = ['ID', '氏名', '生年月日', '性別', '電話番号', '住所', '緊急連絡先', '登録日'];
    const csvContent = [
      headers.join(','),
      ...filteredPatients.map(patient => [
        patient.id,
        patient.name,
        patient.date_of_birth,
        patient.gender,
        patient.phone,
        patient.address,
        patient.emergency_contact,
        patient.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `顧客データ_${selectedYear}年${selectedMonthNum}月.csv`;
    link.click();
  }, [patients, selectedMonth]);

  const getMonthLabel = useCallback((monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${month}月`;
  }, []);

  const getMaxValue = useCallback((data: MonthlyStats[]) => {
    return Math.max(...data.map(item => item.total_patients), 1);
  }, []);

  // メモ化された計算値
  const maxValue = useMemo(() => getMaxValue(monthlyTrend), [monthlyTrend, getMaxValue]);
  const monthlyPatients = useMemo(() => {
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-');
    return patients.filter(patient => {
      const patientDate = new Date(patient.created_at);
      return patientDate.getMonth() + 1 === parseInt(selectedMonthNum) && patientDate.getFullYear() === parseInt(selectedYear);
    });
  }, [patients, selectedMonth]);

  if (loading) {
    return <div className="loading">データを読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="dashboard-actions">
          <div className="month-selector">
            <label>月選択:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-select"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const value = `${year}-${month}`;
                const label = `${year}年${month}月`;
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <button onClick={downloadCSV} className="btn btn-secondary">
            📥 全顧客データCSV
          </button>
          <button onClick={downloadMonthlyCSV} className="btn btn-secondary">
            📥 選択月顧客データCSV
          </button>
        </div>
      </div>

      {/* デバッグ情報を削除 */}

      {/* 統計サマリー */}
      <div className="stats-summary">
        <div className="stat-card">
                      <h3>本日の顧客登録数</h3>
          <div className="stat-number">{todayStats?.total_patients || 0}名</div>
          <div className="stat-breakdown">
            <span className="new-patients">新規: {todayStats?.new_patients || 0}名</span>
            <span className="existing-patients">既存: {todayStats?.existing_patients || 0}名</span>
          </div>
        </div>
        <div className="stat-card">
                      <h3>今月の顧客登録数</h3>
          <div className="stat-number">{monthlyStats?.total_patients || 0}名</div>
          <div className="stat-breakdown">
            <span className="new-patients">新規: {monthlyStats?.new_patients || 0}名</span>
            <span className="existing-patients">既存: {monthlyStats?.existing_patients || 0}名</span>
          </div>
        </div>
        <div className="stat-card">
                      <h3>総顧客数</h3>
          <div className="stat-number">{patients.length}名</div>
        </div>
        <div className="stat-card">
          <h3>登録施術者数</h3>
          <div className="stat-number">{therapistStats.length}名</div>
        </div>
      </div>

              {/* 月別顧客登録数グラフ */}
        <div className="chart-section">
          <h2>月別顧客登録数推移</h2>
        {monthlyTrend.length > 0 ? (
          <div className="chart-container">
            <div className="chart">
              {monthlyTrend.map((item, index) => {
                const maxValue = getMaxValue(monthlyTrend);
                const newHeight = (item.new_patients / maxValue) * 100;
                const existingHeight = (item.existing_patients / maxValue) * 100;
                
                return (
                  <div key={index} className="chart-bar-container">
                    <div className="chart-bars">
                      <div 
                        className="chart-bar new-patients-bar" 
                        style={{ height: `${newHeight}%` }}
                        title={`新規: ${item.new_patients}名`}
                      >
                        <span className="chart-value">{item.new_patients}</span>
                      </div>
                      <div 
                        className="chart-bar existing-patients-bar" 
                        style={{ height: `${existingHeight}%` }}
                        title={`既存: ${item.existing_patients}名`}
                      >
                        <span className="chart-value">{item.existing_patients}</span>
                      </div>
                    </div>
                    <div className="chart-label">{getMonthLabel(item.month)}</div>
                  </div>
                );
              })}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color new-patients-color"></span>
                <span>新規顧客</span>
              </div>
              <div className="legend-item">
                <span className="legend-color existing-patients-color"></span>
                <span>既存顧客</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>月別データがありません</p>
          </div>
        )}
      </div>

      {/* 施術者別統計円グラフ */}
      <div className="chart-section">
                  <h2>施術者別顧客数</h2>
        {therapistStats.length > 0 ? (
          <div className="therapist-stats">
            <div className="therapist-list">
              {therapistStats.map((therapist, index) => {
                const totalPatients = therapistStats.reduce((sum, t) => sum + t.total_patients, 0);
                const percentage = totalPatients > 0 ? (therapist.total_patients / totalPatients) * 100 : 0;
                
                return (
                  <div key={therapist.id} className="therapist-card">
                    <div className="therapist-info">
                      <h3>{therapist.name}</h3>
                      <p className="specialty">{therapist.specialty}</p>
                      <div className="therapist-stats-details">
                        <div className="stat-item">
                          <span className="stat-label">担当顧客数:</span>
                          <span className="stat-value">{therapist.total_patients}名</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">今月のカルテ数:</span>
                          <span className="stat-value">{therapist.total_records}件</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">新規顧客数:</span>
                          <span className="stat-value">{therapist.new_patients}名</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">リピート率:</span>
                          <span className="stat-value">{therapist.repeat_rate}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="therapist-chart">
                      <div 
                        className="pie-chart" 
                        style={{
                          background: `conic-gradient(
                            var(--primary-color) 0deg ${percentage * 3.6}deg,
                            #f0f0f0 ${percentage * 3.6}deg 360deg
                          )`
                        }}
                      >
                        <div className="pie-center">
                          <span className="percentage">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>施術者データがありません</p>
          </div>
        )}
      </div>

      {/* クイックアクセス */}
      <div className="quick-access">
        <h2>クイックアクセス</h2>
        <div className="quick-access-grid">
          <Link to="/patients" className="quick-access-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h3>顧客管理</h3>
            <p>顧客の登録・管理</p>
          </Link>
          <Link to="/patients/add" className="quick-access-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <h3>新規顧客登録</h3>
            <p>新しい顧客を登録</p>
          </Link>
          <Link to="/therapists" className="quick-access-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
              </svg>
            </div>
            <h3>施術者管理</h3>
            <p>施術者の登録・管理</p>
          </Link>
          <Link to="/therapists/add" className="quick-access-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3>新規施術者登録</h3>
            <p>新しい施術者を登録</p>
          </Link>
          <Link to="/appointments" className="quick-access-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <h3>予約管理</h3>
            <p>予約の確認・管理</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
