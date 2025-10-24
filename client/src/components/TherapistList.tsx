import React, { useState, useEffect } from 'react';
import config from '../config/api';
import { Link } from 'react-router-dom';

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

const TherapistList: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch('${config.baseURL}/api/therapists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('施術者データの取得に失敗しました');
      }

      const data = await response.json();
      setTherapists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '施術者データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この施術者を削除しますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const response = await fetch(`${config.baseURL}/api/therapists/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('施術者の削除に失敗しました');
      }

      // 削除成功後、リストを再取得
      fetchTherapists();
    } catch (err) {
      setError(err instanceof Error ? err.message : '施術者の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">施術者データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>施術者管理</h1>
          <Link to="/therapists/add" className="btn btn-success">
            ＋ 新規施術者登録
          </Link>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {therapists.length === 0 ? (
          <div className="empty-state">
            <h3>施術者が登録されていません</h3>
            <p>最初の施術者を登録してください。</p>
            <Link to="/therapists/add" className="btn btn-success">
              施術者を登録する
            </Link>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>施術者ID</th>
                  <th>氏名</th>
                  <th>資格番号</th>
                  <th>専門分野</th>
                  <th>電話番号</th>
                  <th>メールアドレス</th>
                  <th>ステータス</th>
                  <th>登録日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {therapists.map((therapist) => (
                  <tr key={therapist.id}>
                    <td>{therapist.id}</td>
                    <td>{therapist.name}</td>
                    <td>{therapist.license_number || '-'}</td>
                    <td>{therapist.specialty || '-'}</td>
                    <td>{therapist.phone || '-'}</td>
                    <td>{therapist.email || '-'}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        backgroundColor: therapist.status === 'active' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                        color: therapist.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {therapist.status === 'active' ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                    <td>{formatDate(therapist.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link 
                          to={`/therapists/edit/${therapist.id}`} 
                          className="btn btn-sm btn-primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          編集
                        </Link>
                        <button 
                          onClick={() => handleDelete(therapist.id)}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistList;

