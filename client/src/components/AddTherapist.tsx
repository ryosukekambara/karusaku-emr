import React, { useState } from 'react';
import config from '../config/api';
import { useNavigate } from 'react-router-dom';

const AddTherapist: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    specialty: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/therapists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '施術者の登録に失敗しました');
      }

      // 登録成功後、施術者一覧に戻る
      navigate('/therapists');
    } catch (err) {
      setError(err instanceof Error ? err.message : '施術者の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>新規施術者登録</h1>
        <button onClick={() => navigate('/therapists')} className="btn btn-secondary">
          戻る
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">氏名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="施術者の氏名を入力してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="license_number">資格番号</label>
            <input
              type="text"
              id="license_number"
              name="license_number"
              value={formData.license_number}
              onChange={handleChange}
              disabled={loading}
              placeholder="資格番号を入力してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialty">専門分野</label>
            <select
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">選択してください</option>
              <option value="整体・マッサージ">整体・マッサージ</option>
              <option value="鍼灸">鍼灸</option>
              <option value="カイロプラクティック">カイロプラクティック</option>
              <option value="理学療法">理学療法</option>
              <option value="作業療法">作業療法</option>
              <option value="言語療法">言語療法</option>
              <option value="その他">その他</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">電話番号</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
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
              onChange={handleChange}
              disabled={loading}
              placeholder="例: therapist@example.com"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? '登録中...' : '施術者を登録'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/therapists')}
              disabled={loading}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTherapist;

