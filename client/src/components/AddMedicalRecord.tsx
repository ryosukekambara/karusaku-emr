import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import config from '../config';

interface Therapist {
  id: number;
  name: string;
  specialty: string;
}

interface Patient {
  id: number;
  name: string;
  date_of_birth: string;
  gender: string;
}

interface LastRecord {
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  therapist_name: string;
}

const AddMedicalRecord: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    therapist_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });

  useEffect(() => {
    fetchPatientInfo();
    fetchTherapists();
  }, [id]);

  const fetchPatientInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/patients/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const patientData = await response.json();
        setPatient(patientData);
      }

      // 前回の診療記録を取得
      const lastRecordResponse = await fetch(`${config.baseURL}/api/patients/${id}/last-record`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (lastRecordResponse.ok) {
        const lastRecordData = await lastRecordResponse.json();
        if (lastRecordData.id) {
          setLastRecord(lastRecordData);
        }
      }
    } catch (error) {
      console.error('顧客情報の取得に失敗しました:', error);
      setError('顧客情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/therapists`, {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const copyLastRecord = () => {
    if (lastRecord) {
      setFormData(prev => ({
        ...prev,
        symptoms: lastRecord.symptoms || '',
        diagnosis: lastRecord.diagnosis || '',
        treatment: lastRecord.treatment || '',
        prescription: lastRecord.prescription || '',
        notes: lastRecord.notes || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/patients/${id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate(`/patients/${id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '診療記録の作成に失敗しました');
      }
    } catch (error) {
      console.error('診療記録の作成に失敗しました:', error);
      setError('診療記録の作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!patient) {
    return <div className="error">顧客が見つかりません</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>診療記録追加</h2>
                      <p>顧客: {patient.name} ({patient.gender}, {patient.date_of_birth})</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="therapist_id">施術者 *</label>
            <select
              id="therapist_id"
              name="therapist_id"
              value={formData.therapist_id}
              onChange={handleInputChange}
              required
              className="form-control"
            >
              <option value="">施術者を選択してください</option>
              {therapists.map(therapist => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name} ({therapist.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="visit_date">診療日 *</label>
            <input
              type="date"
              id="visit_date"
              name="visit_date"
              value={formData.visit_date}
              onChange={handleInputChange}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="symptoms">症状</label>
            <textarea
              id="symptoms"
              name="symptoms"
              value={formData.symptoms}
              onChange={handleInputChange}
              rows={3}
              className="form-control"
                              placeholder="顧客の症状を記入してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="diagnosis">診断</label>
            <textarea
              id="diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleInputChange}
              rows={3}
              className="form-control"
              placeholder="診断内容を記入してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="treatment">治療</label>
            <textarea
              id="treatment"
              name="treatment"
              value={formData.treatment}
              onChange={handleInputChange}
              rows={3}
              className="form-control"
              placeholder="治療内容を記入してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prescription">処方</label>
            <textarea
              id="prescription"
              name="prescription"
              value={formData.prescription}
              onChange={handleInputChange}
              rows={2}
              className="form-control"
              placeholder="処方内容を記入してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">備考</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="form-control"
              placeholder="その他の注意事項や備考を記入してください"
            />
          </div>

          {/* 前回記録コピー機能 */}
          {lastRecord && (
            <div className="last-record-section">
              <div className="last-record-info">
                <h4>前回の診療記録</h4>
                <p>施術者: {lastRecord.therapist_name}</p>
                <div className="last-record-preview">
                  <div className="preview-item">
                    <strong>症状:</strong> {lastRecord.symptoms || '記録なし'}
                  </div>
                  <div className="preview-item">
                    <strong>診断:</strong> {lastRecord.diagnosis || '記録なし'}
                  </div>
                  <div className="preview-item">
                    <strong>治療:</strong> {lastRecord.treatment || '記録なし'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={copyLastRecord}
                className="btn btn-secondary copy-last-record-btn"
              >
                <FileText size={16} /> 前回分をコピー
              </button>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? '保存中...' : '診療記録を保存'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/patients/${id}`)}
              className="btn btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicalRecord;
