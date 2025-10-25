import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Calendar, Phone, Mail, MapPin, AlertCircle, FileText, Edit, Trash2 } from 'lucide-react';
// import config from '../config/api';

interface Patient {
  id: number;
  name: string;
  kana: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  medical_history: string;
  allergies: string;
  created_at: string;
}

interface MedicalRecord {
  id: number;
  treatment_date: string;
  symptoms: string;
  diagnosis: string;
  treatment_content: string;
  staff_name: string;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
const API_URL = "https://karusaku-emr-backend.onrender.com";
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);

      const patientResponse = await fetch(`${API_URL}/api/patients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!patientResponse.ok) {
        throw new Error('患者情報の取得に失敗しました');
      }

      const patientData = await patientResponse.json();
      setPatient(patientData);

      const recordsResponse = await fetch(`${API_URL}/api/patients/${id}/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setMedicalRecords(recordsData);
      }

    } catch (err) {
      console.error('Error fetching patient:', err);
      setError('患者情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('この患者を削除してもよろしいですか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('患者の削除に失敗しました');
      }

      alert('患者が削除されました');
      navigate('/patients');
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('患者の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error || '患者が見つかりません'}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← 患者一覧に戻る
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{patient.name}</h1>
            <p className="text-gray-600">{patient.kana}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/patients/${id}/edit`}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Edit size={16} />
              この患者を編集
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <Trash2 size={16} />
              削除
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">生年月日</p>
              <p className="font-semibold">{patient.birth_date}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">性別</p>
              <p className="font-semibold">{patient.gender}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">電話番号</p>
              <p className="font-semibold">{patient.phone || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">メールアドレス</p>
              <p className="font-semibold">{patient.email || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <MapPin className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">住所</p>
              <p className="font-semibold">{patient.address || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <AlertCircle className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">緊急連絡先</p>
              <p className="font-semibold">{patient.emergency_contact || '-'}</p>
            </div>
          </div>
        </div>

        {(patient.medical_history || patient.allergies) && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">医療情報</h3>
            {patient.medical_history && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">既往歴</p>
                <p className="mt-1">{patient.medical_history}</p>
              </div>
            )}
            {patient.allergies && (
              <div>
                <p className="text-sm text-gray-600">アレルギー</p>
                <p className="mt-1 text-red-600">{patient.allergies}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} />
            カルテ履歴
          </h2>
          <Link
            to={`/patients/${id}/records/add`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            新規カルテ作成
          </Link>
        </div>

        {medicalRecords.length === 0 ? (
          <p className="text-gray-600">カルテ履歴はありません</p>
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{record.treatment_date}</p>
                    <p className="text-sm text-gray-600">担当: {record.staff_name}</p>
                  </div>
                  <Link
                    to={`/records/${record.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    詳細を見る →
                  </Link>
                </div>
                <div className="text-sm">
                  <p className="mb-1"><span className="font-semibold">症状:</span> {record.symptoms}</p>
                  <p className="mb-1"><span className="font-semibold">診断:</span> {record.diagnosis}</p>
                  <p><span className="font-semibold">処置:</span> {record.treatment_content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetail;
