import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './EmployeeManagement.css';

interface Employee {
  id: number;
  name: string;
  position: string;
  hourly_rate: number;
  commission_rate: number;
  phone: string;
  email: string;
  status: string;
  hire_date: string;
  created_at: string;
}

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    hourly_rate: '',
    commission_rate: '',
    phone: '',
    email: '',
    hire_date: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const employeesData = await response.json();
        setEmployees(employeesData);
        setError('');
      } else {
        // デモデータ
        setEmployees([
          {
            id: 1,
            name: '田中 美咲',
            position: '美容師',
            hourly_rate: 1200,
            commission_rate: 15.0,
            phone: '090-1234-5678',
            email: 'tanaka@example.com',
            status: 'active',
            hire_date: '2024-01-15',
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            name: '佐藤 健太',
            position: '理容師',
            hourly_rate: 1100,
            commission_rate: 12.0,
            phone: '090-2345-6789',
            email: 'sato@example.com',
            status: 'active',
            hire_date: '2024-02-01',
            created_at: '2024-02-01T10:00:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('従業員データの取得に失敗しました:', error);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const response = await fetch('${config.baseURL}/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          hourly_rate: parseFloat(formData.hourly_rate),
          commission_rate: parseFloat(formData.commission_rate)
        }),
      });

      if (response.ok) {
        setSuccess('従業員が正常に登録されました');
        setFormData({
          name: '',
          position: '',
          hourly_rate: '',
          commission_rate: '',
          phone: '',
          email: '',
          hire_date: ''
        });
        setShowForm(false);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '従業員の登録に失敗しました');
      }
    } catch (error) {
      console.error('従業員の登録に失敗しました:', error);
      setError('ネットワークエラーが発生しました');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="employee-management">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="header">
        <h2>従業員管理</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'キャンセル' : '新規従業員追加'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <div className="form-container">
          <h3>新規従業員登録</h3>
          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-group">
              <label htmlFor="name">氏名 *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="position">職種</label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
              >
                <option value="">選択してください</option>
                <option value="美容師">美容師</option>
                <option value="理容師">理容師</option>
                <option value="アシスタント">アシスタント</option>
                <option value="受付">受付</option>
                <option value="マネージャー">マネージャー</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hourly_rate">時給 (円)</label>
                <input
                  type="number"
                  id="hourly_rate"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  min="0"
                  step="10"
                />
              </div>

              <div className="form-group">
                <label htmlFor="commission_rate">歩合率 (%)</label>
                <input
                  type="number"
                  id="commission_rate"
                  name="commission_rate"
                  value={formData.commission_rate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
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
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="hire_date">入社日</label>
              <input
                type="date"
                id="hire_date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                登録
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="employees-list">
        <h3>従業員一覧</h3>
        {employees.length === 0 ? (
          <div className="no-data">従業員データがありません</div>
        ) : (
          <div className="table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>氏名</th>
                  <th>職種</th>
                  <th>時給</th>
                  <th>歩合率</th>
                  <th>電話番号</th>
                  <th>入社日</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.id}</td>
                    <td>{employee.name}</td>
                    <td>{employee.position}</td>
                    <td>{formatCurrency(employee.hourly_rate)}</td>
                    <td>{employee.commission_rate}%</td>
                    <td>{employee.phone}</td>
                    <td>{employee.hire_date}</td>
                    <td>
                      <span className={`status ${employee.status}`}>
                        {employee.status === 'active' ? '在職' : '退職'}
                      </span>
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

export default EmployeeManagement;

