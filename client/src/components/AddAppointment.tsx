import React, { useState, useEffect } from 'react';
import config from '../config/api';
import { useNavigate } from 'react-router-dom';
import './AddAppointment.css';

interface Patient {
  id: number;
  name: string;
}

interface Therapist {
  id: number;
  name: string;
}

interface AppointmentForm {
  patient_id: number;
  therapist_id: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  notes: string;
}

const AddAppointment: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<AppointmentForm>({
    patient_id: 0,
    therapist_id: 0,
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchTherapists();
  }, []);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('顧客データの取得に失敗しました:', error);
    }
  };

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/therapists`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (error) {
      console.error('施術者データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
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
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}`;
      
      const response = await fetch(`${config.baseURL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          appointment_date: appointmentDateTime
        })
      });

      if (response.ok) {
        setSuccess('予約が正常に作成されました');
        setTimeout(() => {
          navigate('/appointments');
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '予約の作成に失敗しました');
      }
    } catch (error) {
      setError('予約の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="add-appointment">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="add-appointment">
      <div className="appointment-header">
        <h1>新規予約作成</h1>
        <button 
          onClick={() => navigate('/appointments')}
          className="back-btn"
        >
          戻る
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
                        <label htmlFor="patient_id">顧客 *</label>
          <select
            id="patient_id"
            name="patient_id"
            value={formData.patient_id}
            onChange={handleInputChange}
            required
          >
                            <option value="">顧客を選択してください</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="therapist_id">施術者 *</label>
          <select
            id="therapist_id"
            name="therapist_id"
            value={formData.therapist_id}
            onChange={handleInputChange}
            required
          >
            <option value="">施術者を選択してください</option>
            {therapists.map(therapist => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="appointment_date">予約日 *</label>
            <input
              type="date"
              id="appointment_date"
              name="appointment_date"
              value={formData.appointment_date}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label htmlFor="appointment_time">予約時間 *</label>
            <input
              type="time"
              id="appointment_time"
              name="appointment_time"
              value={formData.appointment_time}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="duration_minutes">診療時間 *</label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleInputChange}
            required
          >
            <option value={30}>30分</option>
            <option value={60}>60分</option>
            <option value={90}>90分</option>
            <option value={120}>120分</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">備考</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            placeholder="予約に関する備考を入力してください"
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate('/appointments')}
            className="cancel-btn"
          >
            キャンセル
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={saving}
          >
            {saving ? '作成中...' : '予約を作成'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAppointment;


