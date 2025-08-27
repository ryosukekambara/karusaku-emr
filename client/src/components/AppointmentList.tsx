import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AppointmentList.css';

interface Appointment {
  id: number;
  patient_name: string;
  therapist_name: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string;
}

const AppointmentList: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // all, today, upcoming, past

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('予約データの取得に失敗しました');
      }

      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('予約ステータスの更新に失敗しました');
      }

      // ローカルステートを更新
      setAppointments(prev => 
        prev.map(app => 
          app.id === id ? { ...app, status } : app
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const deleteAppointment = async (id: number) => {
    if (!window.confirm('この予約を削除しますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('予約の削除に失敗しました');
      }

      setAppointments(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const getFilteredAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      
      switch (filter) {
        case 'today':
          return appointmentDate.toDateString() === today.toDateString();
        case 'upcoming':
          return appointmentDate > today;
        case 'past':
          return appointmentDate < today;
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'status-scheduled';
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '予約済み';
      case 'confirmed': return '確認済み';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error) {
    return <div className="error">エラー: {error}</div>;
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="appointment-list">
      <div className="appointment-header">
        <h1>予約管理</h1>
        <Link to="/appointments/add" className="add-appointment-btn">
          新規予約作成
        </Link>
      </div>

      <div className="filter-section">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
        <button 
          className={`filter-btn ${filter === 'today' ? 'active' : ''}`}
          onClick={() => setFilter('today')}
        >
          今日
        </button>
        <button 
          className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          今後の予約
        </button>
        <button 
          className={`filter-btn ${filter === 'past' ? 'active' : ''}`}
          onClick={() => setFilter('past')}
        >
          過去の予約
        </button>
      </div>

      <div className="appointments-container">
        {filteredAppointments.length === 0 ? (
          <div className="no-appointments">
            <p>予約がありません</p>
          </div>
        ) : (
          <div className="appointments-grid">
            {filteredAppointments.map(appointment => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-header">
                  <h3>{appointment.patient_name}</h3>
                  <span className={`status ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>
                </div>
                
                <div className="appointment-details">
                  <div className="detail-item">
                    <span className="label">施術者:</span>
                    <span className="value">{appointment.therapist_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">日時:</span>
                    <span className="value">
                      {new Date(appointment.appointment_date).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">時間:</span>
                    <span className="value">{appointment.duration_minutes}分</span>
                  </div>
                  {appointment.notes && (
                    <div className="detail-item">
                      <span className="label">備考:</span>
                      <span className="value">{appointment.notes}</span>
                    </div>
                  )}
                </div>

                <div className="appointment-actions">
                  <Link 
                    to={`/appointments/${appointment.id}`}
                    className="action-btn view-btn"
                  >
                    詳細
                  </Link>
                  <Link 
                    to={`/appointments/${appointment.id}/edit`}
                    className="action-btn edit-btn"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => deleteAppointment(appointment.id)}
                    className="action-btn delete-btn"
                  >
                    削除
                  </button>
                </div>

                {appointment.status === 'scheduled' && (
                  <div className="status-actions">
                    <button
                      onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                      className="status-btn confirm-btn"
                    >
                      確認
                    </button>
                    <button
                      onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      className="status-btn cancel-btn"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentList;


