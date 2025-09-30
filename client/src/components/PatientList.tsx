import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import config from '../config';

interface Patient {
  id: number;
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
  emergency_contact: string;
  is_new_patient: boolean;
  created_at: string;
}

const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'existing'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      
      // 拠点別データファイル名を取得
      const dataFileName = config.getDataFile('customer_data');
      console.log('Loading data from:', dataFileName, 'for clinic:', config.clinicId);
      
      // 将来的にAPIから読み込む場合の準備
      // const response = await fetch(`/api/patients?clinic=${config.clinicId}`);
      
      const mockPatients = [
        {
          "id": 1,
          "name": "田中太郎",
          "kana": "タナカタロウ",
          "date_of_birth": "1980-01-15",
          "gender": "男性",
          "phone": "090-1234-5678",
          "email": "tanaka@example.com",
          "address": "東京都渋谷区1-1-1",
          "emergency_contact": "田中花子",
          "emergency_phone": "090-8765-4321",
          "insurance_type": "国民健康保険",
          "insurance_card_number": "1234567890",
          "insurance_holder": "田中太郎",
          "primary_diagnosis": "腰痛",
          "is_new_patient": true,
          "created_at": "2024-08-29T10:00:00Z",
          "updated_at": "2024-08-29T10:00:00Z"
        },
        {
          "id": 2,
          "name": "佐藤花子",
          "kana": "サトウハナコ",
          "date_of_birth": "1985-05-20",
          "gender": "女性",
          "phone": "080-9876-5432",
          "email": "sato@example.com",
          "address": "東京都新宿区2-2-2",
          "emergency_contact": "佐藤次郎",
          "emergency_phone": "080-1111-2222",
          "insurance_type": "社会保険",
          "insurance_card_number": "0987654321",
          "insurance_holder": "佐藤花子",
          "primary_diagnosis": "肩こり",
          "is_new_patient": false,
          "created_at": "2024-08-28T15:30:00Z",
          "updated_at": "2024-08-29T09:15:00Z"
        }
      ];

      setPatients(mockPatients);
    } catch (error) {
      console.error('顧客データの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePatientType = (patientId: number, currentType: boolean) => {
    const newType = !currentType;
    setPatients(prev => prev.map(patient => 
      patient.id === patientId 
        ? { ...patient, is_new_patient: newType }
        : patient
    ));
  };

  const filteredPatients = patients
    .filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.phone.includes(searchTerm) ||
                           patient.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'new' && patient.is_new_patient) ||
                           (filterType === 'existing' && !patient.is_new_patient);
      
      let matchesDate = true;
      if (startDate || endDate) {
        const patientDate = new Date(patient.created_at);
        if (startDate) {
          const start = new Date(startDate);
          matchesDate = matchesDate && patientDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59);
          matchesDate = matchesDate && patientDate <= end;
        }
      }
      
      return matchesSearch && matchesFilter && matchesDate;
    })
    .sort((a, b) => a.id - b.id);

  const handleCSVDownload = () => {
    const csvContent = [
      ['ID', '受付', '名前', '電話番号', '生年月日', 'フォロー担当', '最終来店日'],
      ...filteredPatients.map(patient => [
        patient.id,
        patient.is_new_patient ? '新規' : '既存',
        patient.name,
        patient.phone,
        patient.date_of_birth,
        patient.gender || '未設定',
        new Date(patient.created_at).toLocaleDateString('ja-JP')
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `顧客一覧_${config.clinicId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      
      const patients = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, ''));
        return {
          name: values[2] || '',
          phone: values[3] || '',
          date_of_birth: values[4] || '',
          gender: values[5] || '',
          is_new_patient: values[1] === '新規'
        };
      });

      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ patients, clinicId: config.clinicId }),
      });

      if (response.ok) {
        alert('CSVインポートが完了しました');
        fetchPatients();
      } else {
        alert('CSVインポートに失敗しました');
      }
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      alert('CSVインポートに失敗しました');
    }

    event.target.value = '';
  };

  if (loading) {
    return <div className="loading">顧客データを読み込み中...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
      <h1>顧客管理 - {config.clinicName}</h1>
        <Link to="/patients/add" className="btn btn-primary">
          + 新規顧客登録
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="search-filter-section">
        <div className="search-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="名前・ID、電話番号で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="date-filter">
            <div className="date-input-group">
              <label>最終来店日:</label>
              <input
                type="date"
                className="form-control"
                placeholder="開始日"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span>〜</span>
              <input
                type="date"
                className="form-control"
                placeholder="終了日"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="action-buttons">
          <button onClick={handleCSVDownload} className="btn btn-secondary">
            <Download size={16} />
            CSVダウンロード
          </button>
          <label htmlFor="csv-upload" className="btn btn-secondary">
            <Upload size={16} />
            CSVインポート
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            全顧客 ({patients.length})
          </button>
          <button
            className={`filter-btn ${filterType === 'new' ? 'active' : ''}`}
            onClick={() => setFilterType('new')}
          >
            新規顧客 ({patients.filter(p => p.is_new_patient).length})
          </button>
          <button
            className={`filter-btn ${filterType === 'existing' ? 'active' : ''}`}
            onClick={() => setFilterType('existing')}
          >
            既存顧客 ({patients.filter(p => !p.is_new_patient).length})
          </button>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="empty-state">
          <h3>顧客が登録されていません</h3>
          <p>最初の顧客を登録してください。</p>
          <Link to="/patients/add" className="btn btn-primary">
            顧客を登録する
          </Link>
        </div>
      ) : (
        <div className="table-container patient-list">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>ID</th>
                <th style={{ textAlign: 'center' }}>受付</th>
                <th style={{ textAlign: 'center' }}>名前</th>
                <th style={{ textAlign: 'center' }}>電話番号</th>
                <th style={{ textAlign: 'center' }}>生年月日</th>
                <th style={{ textAlign: 'center' }}>フォロー担当</th>
                <th style={{ textAlign: 'center' }}>最終来店日</th>
                <th style={{ textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr key={patient.id}>
                  <td style={{ textAlign: 'center' }}>{patient.id}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <span
                        onClick={() => togglePatientType(patient.id, patient.is_new_patient)}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) (tooltip as HTMLElement).style.visibility = 'visible';
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) (tooltip as HTMLElement).style.visibility = 'hidden';
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: patient.is_new_patient ? '#10b981' : '#6b7280',
                          color: 'white',
                          fontSize: '0.875rem',
                          display: 'inline-block'
                        }}
                      >
                        {patient.is_new_patient ? '新規' : '既存'}
                        <span 
                          className="tooltip"
                          style={{
                            visibility: 'hidden',
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#374151',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            marginBottom: '0.25rem',
                            zIndex: 10
                          }}
                        >
                          クリックで{patient.is_new_patient ? '既存' : '新規'}顧客に変更
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link to={`/patients/${patient.id}`} className="patient-link">
                      {patient.name}
                    </Link>
                  </td>
                  <td style={{ textAlign: 'center' }}>{patient.phone}</td>
                  <td style={{ textAlign: 'center' }}>{patient.date_of_birth}</td>
                  <td style={{ textAlign: 'center' }}>{patient.gender || '未設定'}</td>
                  <td style={{ textAlign: 'center' }}>{new Date(patient.created_at).toLocaleDateString('ja-JP')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <Link to={`/patients/${patient.id}`} className="btn btn-sm btn-secondary">
                        詳細
                      </Link>
                      <Link to={`/patients/${patient.id}/records/add`} className="btn btn-sm btn-primary">
                        記録追加
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PatientList;