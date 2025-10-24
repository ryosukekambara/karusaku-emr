import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './Reports.css';

interface MonthlyStats {
  month: string;
  new_patients: number;
  existing_patients: number;
  total_patients: number;
  revenue?: number;
  appointments?: number;
}

interface TherapistStats {
  id: number;
  name: string;
  specialty: string;
  total_patients: number;
  total_records: number;
  new_patients: number;
  repeat_rate: number;
  average_session_duration?: number;
  patient_satisfaction?: number;
}

interface PatientStats {
  total_patients: number;
  new_patients: number;
  existing_patients: number;
  average_age: number;
  gender_distribution: {
    male: number;
    female: number;
    other: number;
  };
  age_distribution?: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '61+': number;
  };
  top_conditions?: Array<{
    condition: string;
    count: number;
  }>;
}

interface AppointmentStats {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  average_duration: number;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
}

const Reports: React.FC = () => {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [therapistStats, setTherapistStats] = useState<TherapistStats[]>([]);
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null);
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('6'); // 6ヶ月
  const [selectedReport, setSelectedReport] = useState('overview'); // overview, patients, therapists, appointments
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 月別統計
      const monthlyResponse = await fetch(`${config.baseURL}/api/statistics/monthly-trend?months=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // 施術者別統計
      const therapistResponse = await fetch('${config.baseURL}/api/statistics/therapists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // 顧客統計
      const patientResponse = await fetch('${config.baseURL}/api/statistics/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // 予約統計
      const appointmentResponse = await fetch('${config.baseURL}/api/statistics/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (monthlyResponse.ok && therapistResponse.ok && patientResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        const therapistData = await therapistResponse.json();
        const patientData = await patientResponse.json();
        const appointmentData = appointmentResponse.ok ? await appointmentResponse.json() : null;

        setMonthlyStats(monthlyData);
        setTherapistStats(therapistData);
        setPatientStats(patientData);
        setAppointmentStats(appointmentData);
        setError('');
      } else {
        setError('レポートデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('レポートデータの取得に失敗しました:', error);
      setError('レポートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async (type: string, customDateRange?: boolean) => {
    try {
      const token = localStorage.getItem('token');
      let url = `/api/reports/${type}`;
      
      if (customDateRange) {
        url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError('CSVファイルのダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('CSVファイルのダウンロードに失敗しました:', error);
      setError('CSVファイルのダウンロードに失敗しました');
    }
  };

  const generatePDF = async (type: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/reports/${type}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError('PDFファイルの生成に失敗しました');
      }
    } catch (error) {
      console.error('PDFファイルの生成に失敗しました:', error);
      setError('PDFファイルの生成に失敗しました');
    }
  };

  const calculateGrowthRate = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>レポートを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchReportData} className="retry-btn">再試行</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>レポート・分析</h1>
        <div className="report-controls">
          <div className="period-selector">
            <label>期間:</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="3">3ヶ月</option>
              <option value="6">6ヶ月</option>
              <option value="12">12ヶ月</option>
              <option value="custom">カスタム</option>
            </select>
          </div>
          {selectedPeriod === 'custom' && (
            <div className="date-range">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              />
              <span>〜</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              />
            </div>
          )}
        </div>
      </div>

      <div className="report-tabs">
        <button
          className={`tab ${selectedReport === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedReport('overview')}
        >
          概要
        </button>
        <button
          className={`tab ${selectedReport === 'patients' ? 'active' : ''}`}
          onClick={() => setSelectedReport('patients')}
        >
          顧客分析
        </button>
        <button
          className={`tab ${selectedReport === 'therapists' ? 'active' : ''}`}
          onClick={() => setSelectedReport('therapists')}
        >
          施術者分析
        </button>
        <button
          className={`tab ${selectedReport === 'appointments' ? 'active' : ''}`}
          onClick={() => setSelectedReport('appointments')}
        >
          予約分析
        </button>
      </div>

      <div className="report-content">
        {selectedReport === 'overview' && (
          <div className="overview-report">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>総顧客数</h3>
                <div className="stat-value">{patientStats?.total_patients || 0}</div>
                <div className="stat-change positive">
                  +{patientStats?.new_patients || 0} (新規)
                </div>
              </div>
              <div className="stat-card">
                <h3>総予約数</h3>
                <div className="stat-value">{appointmentStats?.total_appointments || 0}</div>
                <div className="stat-change positive">
                  完了率: {appointmentStats ? Math.round((appointmentStats.completed_appointments / appointmentStats.total_appointments) * 100) : 0}%
                </div>
              </div>
              <div className="stat-card">
                <h3>施術者数</h3>
                <div className="stat-value">{therapistStats.length}</div>
                <div className="stat-change">
                  平均顧客数: {therapistStats.length > 0 ? Math.round(therapistStats.reduce((sum, t) => sum + t.total_patients, 0) / therapistStats.length) : 0}
                </div>
              </div>
              <div className="stat-card">
                <h3>月間成長率</h3>
                <div className="stat-value">
                  {monthlyStats.length >= 2 ? 
                    `${calculateGrowthRate(monthlyStats[monthlyStats.length - 1].total_patients, monthlyStats[monthlyStats.length - 2].total_patients).toFixed(1)}%` : 
                    'N/A'
                  }
                </div>
                <div className="stat-change">
                  前月比
                </div>
              </div>
            </div>

            <div className="chart-section">
              <h3>月別顧客数推移</h3>
              <div className="chart">
                <div className="chart-bars">
                  {monthlyStats.map((stat, index) => (
                    <div key={index} className="chart-bar-container">
                      <div className="chart-bar" style={{ height: `${(stat.total_patients / Math.max(...monthlyStats.map(s => s.total_patients))) * 200}px` }}>
                        <div className="bar-tooltip">
                          <div>新規: {stat.new_patients}</div>
                          <div>既存: {stat.existing_patients}</div>
                          <div>合計: {stat.total_patients}</div>
                        </div>
                      </div>
                      <div className="chart-label">{stat.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="export-section">
              <h3>レポートエクスポート</h3>
              <div className="export-buttons">
                <button onClick={() => downloadCSV('overview')} className="export-btn">
                  CSV ダウンロード
                </button>
                <button onClick={() => generatePDF('overview')} className="export-btn">
                  PDF 生成
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'patients' && (
          <div className="patients-report">
            <div className="patient-stats">
              <div className="stat-row">
                <div className="stat-item">
                  <h4>年齢分布</h4>
                  <div className="age-distribution">
                    {patientStats?.age_distribution && Object.entries(patientStats.age_distribution).map(([range, count]) => (
                      <div key={range} className="age-group">
                        <span>{range}</span>
                        <div className="age-bar" style={{ width: `${(count / (patientStats?.total_patients || 1)) * 100}%` }}></div>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="stat-item">
                  <h4>性別分布</h4>
                  <div className="gender-distribution">
                    <div className="gender-item">
                      <span>男性</span>
                      <span>{patientStats?.gender_distribution.male || 0}</span>
                    </div>
                    <div className="gender-item">
                      <span>女性</span>
                      <span>{patientStats?.gender_distribution.female || 0}</span>
                    </div>
                    <div className="gender-item">
                      <span>その他</span>
                      <span>{patientStats?.gender_distribution.other || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="export-section">
              <h3>顧客データエクスポート</h3>
              <div className="export-buttons">
                <button onClick={() => downloadCSV('patients')} className="export-btn">
                  全顧客データ CSV
                </button>
                <button onClick={() => downloadCSV('patients', true)} className="export-btn">
                  期間指定 CSV
                </button>
                <button onClick={() => generatePDF('patients')} className="export-btn">
                  顧客レポート PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'therapists' && (
          <div className="therapists-report">
            <div className="therapist-stats">
              {therapistStats.map(therapist => (
                <div key={therapist.id} className="therapist-card">
                  <h4>{therapist.name}</h4>
                  <div className="therapist-metrics">
                    <div className="metric">
                      <span>総顧客数</span>
                      <span>{therapist.total_patients}</span>
                    </div>
                    <div className="metric">
                      <span>リピート率</span>
                      <span>{therapist.repeat_rate.toFixed(1)}%</span>
                    </div>
                    <div className="metric">
                      <span>平均診療時間</span>
                      <span>{therapist.average_session_duration || 'N/A'}分</span>
                    </div>
                    <div className="metric">
                      <span>顧客満足度</span>
                      <span>{therapist.patient_satisfaction || 'N/A'}/5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="export-section">
              <h3>施術者データエクスポート</h3>
              <div className="export-buttons">
                <button onClick={() => downloadCSV('therapists')} className="export-btn">
                  施術者データ CSV
                </button>
                <button onClick={() => generatePDF('therapists')} className="export-btn">
                  施術者レポート PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'appointments' && (
          <div className="appointments-report">
            <div className="appointment-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>総予約数</h3>
                  <div className="stat-value">{appointmentStats?.total_appointments || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>完了予約</h3>
                  <div className="stat-value">{appointmentStats?.completed_appointments || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>キャンセル</h3>
                  <div className="stat-value">{appointmentStats?.cancelled_appointments || 0}</div>
                </div>
                <div className="stat-card">
                  <h3>無断欠席</h3>
                  <div className="stat-value">{appointmentStats?.no_show_appointments || 0}</div>
                </div>
              </div>
            </div>

            <div className="export-section">
              <h3>予約データエクスポート</h3>
              <div className="export-buttons">
                <button onClick={() => downloadCSV('appointments')} className="export-btn">
                  予約データ CSV
                </button>
                <button onClick={() => downloadCSV('appointments', true)} className="export-btn">
                  期間指定 CSV
                </button>
                <button onClick={() => generatePDF('appointments')} className="export-btn">
                  予約レポート PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
