import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Therapist {
  id: number;
  name: string;
  license_number: string;
  specialty: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

const EditTherapist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    specialty: '',
    phone: '',
    email: '',
    status: 'active'
  });

  useEffect(() => {
    if (id) {
      fetchTherapist();
    }
  }, [id]);

  const fetchTherapist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`https://karusaku-emr-aeza.onrender.com/api/therapists/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const therapistData = await response.json();
        setTherapist(therapistData);
        setFormData({
          name: therapistData.name || '',
          license_number: therapistData.license_number || '',
          specialty: therapistData.specialty || '',
          phone: therapistData.phone || '',
          email: therapistData.email || '',
          status: therapistData.status || 'active'
        });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '施術者データの取得に失敗しました');
      }
    } catch (error) {
      console.error('施術者データの取得に失敗しました:', error);
      setError('ネットワークエラーが発生しました');
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
    
    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`https://karusaku-emr-aeza.onrender.com/api/therapists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('施術者情報を更新しました');
        navigate('/therapists');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '施術者情報の更新に失敗しました');
      }
    } catch (error) {
      console.error('施術者情報の更新に失敗しました:', error);
      setError('ネットワークエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">施術者データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          {error}
        </div>
        <button onClick={() => navigate('/therapists')} className="btn btn-secondary">
          施術者一覧に戻る
        </button>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          施術者が見つかりません
        </div>
        <button onClick={() => navigate('/therapists')} className="btn btn-secondary">
          施術者一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>施術者情報編集</h1>
        <button onClick={() => navigate('/therapists')} className="btn btn-secondary">
          戻る
        </button>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">氏名 *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label htmlFor="license_number">資格番号</label>
              <input
                type="text"
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="specialty">専門分野</label>
              <input
                type="text"
                id="specialty"
                name="specialty"
                value={formData.specialty}
                onChange={handleInputChange}
                className="form-control"
                placeholder="例: 整体・マッサージ"
              />
            </div>
            <div className="form-group">
              <label htmlFor="status">ステータス</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="active">アクティブ</option>
                <option value="inactive">非アクティブ</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">電話番号</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-control"
                placeholder="例: 090-1234-5678"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                placeholder="例: therapist@example.com"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              更新
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/therapists')}
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

export default EditTherapist;
