import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TreatmentRecord from './TreatmentRecord';

interface Patient {
  id: number;
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
  emergency_contact: string;
  created_at: string;
}

interface MedicalRecord {
  id: number;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  doctor_name: string;
  created_at: string;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 顧客情報を取得
      const patientResponse = await fetch(`/api/patients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!patientResponse.ok) {
        throw new Error('顧客情報の取得に失敗しました');
      }

      const patientData = await patientResponse.json();
      setPatient(patientData);

      // 診療記録を取得
      const recordsResponse = await fetch(`/api/patients/${id}/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!recordsResponse.ok) {
        throw new Error('診療記録の取得に失敗しました');
      }

      const recordsData = await recordsResponse.json();
      setMedicalRecords(recordsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">顧客データを読み込み中...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container">
        <div className="alert alert-error">
          {error || '顧客が見つかりません'}
        </div>
        <button onClick={() => navigate('/patients')} className="btn">
                      顧客一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>顧客詳細: {patient.name}</h1>
          <div>
            <button onClick={() => navigate('/patients')} className="btn btn-secondary">
              戻る
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">基本情報</h3>
            </div>
            <div>
              <p><strong>顧客ID:</strong> {patient.id}</p>
              <p><strong>氏名:</strong> {patient.name}</p>
              <p><strong>生年月日:</strong> {formatDate(patient.date_of_birth)}</p>
              <p><strong>性別:</strong> {patient.gender}</p>
              <p><strong>電話番号:</strong> {patient.phone || '未登録'}</p>
              <p><strong>住所:</strong> {patient.address || '未登録'}</p>
              <p><strong>緊急連絡先:</strong> {patient.emergency_contact || '未登録'}</p>
              <p><strong>登録日:</strong> {formatDate(patient.created_at)}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">施術記録</h3>
            </div>
            <TreatmentRecord patientId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
