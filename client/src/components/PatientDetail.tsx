import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import config from '../config/api';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // ユーザー情報を取得
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    
    if (id) {
      fetchPatientData();
      fetchMedicalRecords();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/api/patients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // レスポンスの Content-Type をチェック
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('患者が見つかりません');
        } else if (response.status === 401) {
          navigate('/login');
        } else {
          setError(`エラー: ${response.status}`);
        }
        return;
      }

      // JSONレスポンスかチェック
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content-type:', contentType);
        setError('サーバーから不正なレスポンスが返されました');
        return;
      }

      const data = await response.json();
      setPatient(data);
    } catch (err) {
      console.error('患者情報の取得に失敗:', err);
      setError('患者情報の取得に失敗しました。サーバーに接続できません。');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/patients/${id}/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setRecords(data);
        }
      }
    } catch (err) {
      console.error('カルテ取得エラー:', err);
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary">
          患者一覧に戻る
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container">
        <div className="alert alert-error">患者情報が見つかりません</div>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary">
          患者一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>患者詳細: {patient.name}</h2>
          <div className="header-actions">
            <Link to={`/patients/${id}/edit`} className="btn btn-primary">
              編集
            </Link>
            <Link to={`/patients/${id}/records/add`} className="btn btn-success">
              カルテ作成
            </Link>
          </div>
        </div>

        <div className="patient-info">
          <div className="info-row">
            <label>患者ID:</label>
            <span>{patient.id}</span>
          </div>
          <div className="info-row">
            <label>フリガナ:</label>
            <span>{patient.kana || '-'}</span>
          </div>
          <div className="info-row">
            <label>生年月日:</label>
            <span>{patient.birth_date || '-'}</span>
          </div>
          <div className="info-row">
            <label>性別:</label>
            <span>{patient.gender || '-'}</span>
          </div>
          <div className="info-row">
            <label>電話番号:</label>
            <span>{patient.phone || '-'}</span>
          </div>
          <div className="info-row">
            <label>メールアドレス:</label>
            <span>{patient.email || '-'}</span>
          </div>
          <div className="info-row">
            <label>住所:</label>
            <span>{patient.address || '-'}</span>
          </div>
        </div>

        <div className="medical-records-section">
          <h3>カルテ一覧</h3>
          {records.length === 0 ? (
            <p>カルテがありません</p>
          ) : (
            <div className="records-list">
              {records.map((record) => (
                <div key={record.id} className="record-item">
                  <div className="record-date">
                    {new Date(record.treatment_date).toLocaleDateString('ja-JP')}
                  </div>
                  <div className="record-content">
                    <p><strong>症状:</strong> {record.symptoms}</p>
                    <p><strong>診断:</strong> {record.diagnosis}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;