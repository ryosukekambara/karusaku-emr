import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface MedicalRecord {
  id: number;
  patient_id: number;
  therapist_id: number;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  created_at: string;
}

interface Therapist {
  id: number;
  name: string;
}

const EditMedicalRecord: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    therapist_id: '',
    visit_date: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });

  useEffect(() => {
    fetchRecord();
    fetchTherapists();
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
        const recordData = await response.json();
        setRecord(recordData);
        setFormData({
          therapist_id: recordData.therapist_id?.toString() || '',
          visit_date: recordData.visit_date || '',
          symptoms: recordData.symptoms || '',
          diagnosis: recordData.diagnosis || '',
          treatment: recordData.treatment || '',
          prescription: recordData.prescription || '',
          notes: recordData.notes || ''
        });
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
      const response = await fetch('https://karusaku-emr-aeza.onrender.com/api/therapists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const therapistsData = await response.json();
        setTherapists(therapistsData);
      }
    } catch (error) {
      console.error('施術者情報の取得に失敗しました:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`https://karusaku-emr-aeza.onrender.com/api/medical-records/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        navigate(`/medical-records/${id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '医療記録の更新に失敗しました');
      }
    } catch (error) {
      console.error('医療記録の更新に失敗しました:', error);
      setError('医療記録の更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error && !record) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/medical-records')} className="btn">
          医療記録一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>医療記録編集</h2>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="therapist_id">担当施術者 *</label>
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
                  {therapist.name}
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
              rows={3}
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

          <div className="form-actions">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? '更新中...' : '医療記録を更新'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/medical-records/${id}`)}
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

export default EditMedicalRecord;

