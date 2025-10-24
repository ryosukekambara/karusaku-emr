import React, { useState, useEffect } from 'react';
import config from '../config/api';

interface Menu {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  created_at: string;
}

const MenuManagement: React.FC = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: ''
  });

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/menus', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const menusData = await response.json();
        setMenus(menusData);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'メニューの取得に失敗しました');
      }
    } catch (error) {
      console.error('メニューの取得に失敗しました:', error);
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
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          duration: parseInt(formData.duration)
        }),
      });

      if (response.ok) {
        alert('メニューを登録しました');
        setShowForm(false);
        setFormData({
          name: '',
          description: '',
          price: '',
          duration: '',
          category: ''
        });
        fetchMenus();
      }
    } catch (error) {
      console.error('メニューの登録に失敗しました:', error);
      alert('メニューの登録に失敗しました');
    }
  };

  const handleDelete = async (menuId: number) => {
    if (!window.confirm('このメニューを削除しますか？')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/menus/${menuId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('メニューを削除しました');
        fetchMenus();
      }
    } catch (error) {
      console.error('メニューの削除に失敗しました:', error);
      alert('メニューの削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">メニューデータを読み込み中...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>施術メニュー管理</h1>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
        >
          {showForm ? 'キャンセル' : '+ メニュー登録'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3>新規メニュー登録</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">メニュー名 *</label>
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
                <label htmlFor="category">カテゴリ</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="">選択してください</option>
                  <option value="鍼治療">鍼治療</option>
                  <option value="灸治療">灸治療</option>
                  <option value="マッサージ">マッサージ</option>
                  <option value="整体">整体</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">料金 (円)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label htmlFor="duration">所要時間 (分)</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">説明</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="form-control"
                placeholder="メニューの詳細説明を入力してください"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                メニューを登録
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="menu-list">
        <h3>登録済みメニュー</h3>
        {menus.length === 0 ? (
          <div className="empty-state">
            <p>登録されたメニューがありません</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>メニュー名</th>
                  <th>カテゴリ</th>
                  <th>料金</th>
                  <th>所要時間</th>
                  <th>説明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {menus.map(menu => (
                  <tr key={menu.id}>
                    <td>{menu.name}</td>
                    <td>{menu.category}</td>
                    <td>{menu.price}円</td>
                    <td>{menu.duration}分</td>
                    <td>{menu.description}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="btn btn-sm btn-danger"
                      >
                        削除
                      </button>
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

export default MenuManagement;

