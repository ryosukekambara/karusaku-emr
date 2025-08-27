import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

interface MedicalRecord {
  id: number;
  patient_name: string;
  patient_id: number;
  therapist_name: string;
  therapist_id: number;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  created_at: string;
}

const MedicalRecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/medical-records/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecord(data);
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

  const handleDelete = async () => {
    if (!window.confirm('この医療記録を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/medical-records/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/medical-records');
      } else {
        setError('医療記録の削除に失敗しました');
      }
    } catch (error) {
      console.error('医療記録の削除に失敗しました:', error);
      setError('医療記録の削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!record) {
    return <div className="error">医療記録が見つかりません</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="header-content">
            <h2>医療記録詳細</h2>
            <div className="header-actions">
              <Link to={`/patients/${record.patient_id}/records/add`} className="btn btn-primary">
                新規記録追加
              </Link>
              <Link to={`/medical-records/${id}/edit`} className="btn btn-secondary">
                編集
              </Link>
              <button onClick={handleDelete} className="btn btn-danger">
                削除
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="record-detail">
          {/* 基本情報 */}
          <div className="detail-section">
            <h3>基本情報</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>顧客名:</label>
                <span>
                  <Link to={`/patients/${record.patient_id}`}>
                    {record.patient_name}
                  </Link>
                </span>
              </div>
              <div className="info-item">
                <label>施術者:</label>
                <span>{record.therapist_name}</span>
              </div>
              <div className="info-item">
                <label>診療日:</label>
                <span>{formatDate(record.visit_date)}</span>
              </div>
              <div className="info-item">
                <label>記録日:</label>
                <span>{formatDate(record.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 診療内容 */}
          <div className="detail-section">
            <h3>診療内容</h3>
            {record.symptoms && (
              <div className="content-item">
                <label>症状:</label>
                <div className="content-text">{record.symptoms}</div>
              </div>
            )}
            {record.diagnosis && (
              <div className="content-item">
                <label>診断:</label>
                <div className="content-text">{record.diagnosis}</div>
              </div>
            )}
            {record.treatment && (
              <div className="content-item">
                <label>治療:</label>
                <div className="content-text">{record.treatment}</div>
              </div>
            )}
            {record.prescription && (
              <div className="content-item">
                <label>処方:</label>
                <div className="content-text">{record.prescription}</div>
              </div>
            )}
            {record.notes && (
              <div className="content-item">
                <label>備考:</label>
                <div className="content-text">{record.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card-footer">
          <Link to="/medical-records" className="btn btn-secondary">
            記録一覧に戻る
          </Link>
          <Link to={`/patients/${record.patient_id}`} className="btn btn-primary">
            顧客詳細に戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordDetail;
