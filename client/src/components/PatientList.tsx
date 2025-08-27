import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        setError('顧客データの取得に失敗しました');
      }
    } catch (error) {
      console.error('顧客データの取得に失敗しました:', error);
      setError('顧客データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const togglePatientType = async (patientId: number, currentType: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const newType = !currentType; // 現在の状態を反転
      
      const response = await fetch(`/api/patients/${patientId}/mark-existing`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_new_patient: newType }),
      });

      if (response.ok) {
        // 顧客リストを更新
        setPatients(prev => prev.map(patient => 
          patient.id === patientId 
            ? { ...patient, is_new_patient: newType }
            : patient
        ));
      } else {
        alert('顧客の更新に失敗しました');
      }
    } catch (error) {
      console.error('顧客の更新に失敗しました:', error);
      alert('顧客の更新に失敗しました');
    }
  };

  const filteredPatients = patients
    .filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.phone.includes(searchTerm) ||
                           patient.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'new' && patient.is_new_patient) ||
                           (filterType === 'existing' && !patient.is_new_patient);
      
      // 日付フィルター
      let matchesDate = true;
      if (startDate || endDate) {
        const patientDate = new Date(patient.created_at);
        if (startDate) {
          const start = new Date(startDate);
          matchesDate = matchesDate && patientDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59); // 終了日の23:59:59まで
          matchesDate = matchesDate && patientDate <= end;
        }
      }
      
      return matchesSearch && matchesFilter && matchesDate;
    })
    .sort((a, b) => a.id - b.id); // IDの昇順でソート

  // CSVダウンロード機能
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
    link.setAttribute('download', `顧客一覧_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSVアップロード機能
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      
      // CSVの内容を解析して顧客データとして処理
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

      // サーバーにCSVデータを送信
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ patients }),
      });

      if (response.ok) {
        alert('CSVインポートが完了しました');
        fetchPatients(); // 顧客リストを再取得
      } else {
        alert('CSVインポートに失敗しました');
      }
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      alert('CSVインポートに失敗しました');
    }

    // ファイル入力をリセット
    event.target.value = '';
  };

  if (loading) {
    return <div className="loading">顧客データを読み込み中...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>顧客一覧</h1>
        <Link to="/patients/add" className="btn btn-primary">
          + 新規顧客登録
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 検索・フィルター */}
      <div className="search-filter-section">
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
        <div className="action-buttons">
          <button onClick={handleCSVDownload} className="btn btn-secondary">
            CSVダウンロード
          </button>
          <label htmlFor="csv-upload" className="btn btn-secondary">
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
                <th>ID</th>
                <th>受付</th>
                <th>名前</th>
                <th>電話番号</th>
                <th>生年月日</th>
                <th>フォロー担当</th>
                <th>最終来店日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr key={patient.id}>
                  <td>{patient.id}</td>
                  <td>
                    <button
                      onClick={() => togglePatientType(patient.id, patient.is_new_patient)}
                      className={`patient-type-btn ${patient.is_new_patient ? 'new' : 'existing'}`}
                      title={patient.is_new_patient ? 'クリックで既存顧客に変更' : 'クリックで新規顧客に変更'}
                    >
                      {patient.is_new_patient ? '新規' : '既存'}
                    </button>
                  </td>
                  <td>
                    <Link to={`/patients/${patient.id}`} className="patient-link">
                      {patient.name}
                    </Link>
                  </td>
                  <td>{patient.phone}</td>
                  <td>{patient.date_of_birth}</td>
                  <td>{patient.gender || '未設定'}</td>
                  <td>{new Date(patient.created_at).toLocaleDateString('ja-JP')}</td>
                  <td>
                    <div className="action-buttons">
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
