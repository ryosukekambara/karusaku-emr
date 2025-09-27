import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface MedicalRecord {
  id: number;
  patient_name: string;
  therapist_name: string;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  created_at: string;
}

const MedicalRecordList: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTherapist, setFilterTherapist] = useState('');
  const [therapists, setTherapists] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    fetchRecords();
    fetchTherapists();
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`${window.location.origin}/api/medical-records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        setError('医療記録の取得に失敗しました');
      }
    } catch (error) {
      console.error('医療記録の取得に失敗しました:', error);
      setError('医療記録の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`${window.location.origin}/api/therapists`, {
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

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.therapist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTherapist = filterTherapist === '' || record.therapist_name === filterTherapist;
    
    return matchesSearch && matchesTherapist;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>医療記録一覧</h2>
          <Link to="/patients" className="btn btn-primary">
            顧客一覧に戻る
          </Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* 検索・フィルター */}
        <div className="search-filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="顧客名、施術者名、症状、診断で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="filter-box">
            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="form-control"
            >
              <option value="">すべての施術者</option>
              {therapists.map(therapist => (
                <option key={therapist.id} value={therapist.name}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 記録一覧 */}
        <div className="records-list">
          {filteredRecords.length > 0 ? (
            filteredRecords.map(record => (
              <div key={record.id} className="record-card">
                <div className="record-header">
                  <div className="record-info">
                    <h3>{record.patient_name}</h3>
                    <p className="record-meta">
                      施術者: {record.therapist_name} | 
                      診療日: {formatDate(record.visit_date)} | 
                      記録日: {formatDate(record.created_at)}
                    </p>
                  </div>
                  <div className="record-actions">
                    <Link to={`/medical-records/${record.id}`} className="btn btn-sm btn-primary">
                      詳細
                    </Link>
                  </div>
                </div>
                
                <div className="record-content">
                  {record.symptoms && (
                    <div className="record-section">
                      <strong>症状:</strong> {record.symptoms}
                    </div>
                  )}
                  {record.diagnosis && (
                    <div className="record-section">
                      <strong>診断:</strong> {record.diagnosis}
                    </div>
                  )}
                  {record.treatment && (
                    <div className="record-section">
                      <strong>治療:</strong> {record.treatment}
                    </div>
                  )}
                  {record.prescription && (
                    <div className="record-section">
                      <strong>処方:</strong> {record.prescription}
                    </div>
                  )}
                  {record.notes && (
                    <div className="record-section">
                      <strong>備考:</strong> {record.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>医療記録が見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordList;

