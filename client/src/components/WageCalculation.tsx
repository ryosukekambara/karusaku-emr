import React, { useState, useEffect } from 'react';
import config from '../config/api';
import './WageCalculation.css';

interface Employee {
  id: number;
  name: string;
  position: string;
  hourly_rate: number;
  commission_rate: number;
}

interface WageCalculation {
  employeeId: number;
  employeeName: string;
  baseSalary: number;
  treatmentCommission: number;
  productCommission: number;
  overtimePay: number;
  bonus: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  calculationDate: string;
}

interface WageHistory {
  id: number;
  employee_id: number;
  employee_name: string;
  base_salary: number;
  treatment_commission: number;
  product_commission: number;
  overtime_pay: number;
  bonus: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  calculation_date: string;
}

const WageCalculation: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'calculate' | 'history'>('calculate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wageCalculation, setWageCalculation] = useState<WageCalculation | null>(null);
  const [wageHistory, setWageHistory] = useState<WageHistory[]>([]);
  
  // 給与計算フォームデータ
  const [formData, setFormData] = useState({
    treatmentRevenue: '',
    productSales: '',
    workingDays: '',
    deductions: '',
    overtimeHours: '',
    bonus: ''
  });

  // 画像アップロード関連
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const employeesData = await response.json();
        setEmployees(employeesData);
      } else {
        // デモデータ
        setEmployees([
          {
            id: 1,
            name: '田中 美咲',
            position: '美容師',
            hourly_rate: 1200,
            commission_rate: 15.0
          },
          {
            id: 2,
            name: '佐藤 健太',
            position: '理容師',
            hourly_rate: 1100,
            commission_rate: 12.0
          }
        ]);
      }
    } catch (error) {
      console.error('従業員データの取得に失敗しました:', error);
    }
  };

  const fetchWageHistory = async (employeeId?: number) => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/wage/history';
      if (employeeId) {
        url += `?employeeId=${employeeId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const historyData = await response.json();
        setWageHistory(historyData);
      }
    } catch (error) {
      console.error('給与履歴の取得に失敗しました:', error);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setWageCalculation(null);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithOCR = async () => {
    if (!imageFile || !selectedEmployee) return;

    try {
      setOcrLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('employeeId', selectedEmployee.id.toString());

      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/ocr/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // OCR結果をフォームに反映
          setFormData(prev => ({
            ...prev,
            treatmentRevenue: result.data.treatmentRevenue.toString(),
            productSales: result.data.productSales.toString(),
            workingDays: result.data.workingDays.toString(),
            deductions: result.data.deductions.toString(),
            overtimeHours: result.data.overtimeHours.toString(),
            bonus: result.data.bonus.toString()
          }));
          setSuccess('画像解析が完了しました。データを確認してください。');
        }
      } else {
        setError('画像解析に失敗しました。手動で入力してください。');
      }
    } catch (error) {
      console.error('OCR解析エラー:', error);
      setError('画像解析に失敗しました。手動で入力してください。');
    } finally {
      setOcrLoading(false);
    }
  };

  const calculateWage = async () => {
    if (!selectedEmployee) {
      setError('従業員を選択してください');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/wage/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          treatmentRevenue: parseFloat(formData.treatmentRevenue) || 0,
          productSales: parseFloat(formData.productSales) || 0,
          workingDays: parseFloat(formData.workingDays) || 0,
          deductions: parseFloat(formData.deductions) || 0,
          overtimeHours: parseFloat(formData.overtimeHours) || 0,
          bonus: parseFloat(formData.bonus) || 0
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setWageCalculation(result.wageCalculation);
        setSuccess('給与計算が完了しました');
        fetchWageHistory(selectedEmployee.id);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '給与計算に失敗しました');
      }
    } catch (error) {
      console.error('給与計算エラー:', error);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="wage-calculation">
      <div className="header">
        <h2>給与計算システム</h2>
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'calculate' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculate')}
          >
            給与計算
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              fetchWageHistory();
            }}
          >
            給与履歴
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'calculate' && (
        <div className="calculation-container">
          {/* 従業員選択 */}
          <div className="section">
            <h3>従業員選択</h3>
            <div className="employee-selection">
              {employees.map((employee) => (
                <div 
                  key={employee.id}
                  className={`employee-card ${selectedEmployee?.id === employee.id ? 'selected' : ''}`}
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <div className="employee-info">
                    <h4>{employee.name}</h4>
                    <p>{employee.position}</p>
                    <p>時給: {formatCurrency(employee.hourly_rate)}</p>
                    <p>歩合率: {employee.commission_rate}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedEmployee && (
            <>
              {/* 画像アップロード */}
              <div className="section">
                <h3>画像アップロード（OCR解析）</h3>
                <div className="image-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="file-label">
                    画像を選択
                  </label>
                  
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="アップロード画像" />
                      <button 
                        className="btn btn-primary"
                        onClick={analyzeImageWithOCR}
                        disabled={ocrLoading}
                      >
                        {ocrLoading ? '解析中...' : 'OCR解析実行'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 給与計算フォーム */}
              <div className="section">
                <h3>給与計算データ入力</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>施術料売上 (円)</label>
                    <input
                      type="number"
                      name="treatmentRevenue"
                      value={formData.treatmentRevenue}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>物販売上 (円)</label>
                    <input
                      type="number"
                      name="productSales"
                      value={formData.productSales}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>出勤日数 (日)</label>
                    <input
                      type="number"
                      name="workingDays"
                      value={formData.workingDays}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>控除額 (円)</label>
                    <input
                      type="number"
                      name="deductions"
                      value={formData.deductions}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>残業時間 (時間)</label>
                    <input
                      type="number"
                      name="overtimeHours"
                      value={formData.overtimeHours}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>ボーナス (円)</label>
                    <input
                      type="number"
                      name="bonus"
                      value={formData.bonus}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                <button 
                  className="btn btn-primary calculate-btn"
                  onClick={calculateWage}
                  disabled={loading}
                >
                  {loading ? '計算中...' : '給与計算実行'}
                </button>
              </div>

              {/* 給与計算結果 */}
              {wageCalculation && (
                <div className="section">
                  <h3>給与計算結果</h3>
                  <div className="wage-result">
                    <div className="result-header">
                      <h4>{wageCalculation.employeeName} 様</h4>
                      <p>計算日: {formatDate(wageCalculation.calculationDate)}</p>
                    </div>
                    
                    <div className="result-details">
                      <div className="result-row">
                        <span>基本給</span>
                        <span>{formatCurrency(wageCalculation.baseSalary)}</span>
                      </div>
                      <div className="result-row">
                        <span>施術歩合</span>
                        <span>{formatCurrency(wageCalculation.treatmentCommission)}</span>
                      </div>
                      <div className="result-row">
                        <span>物販歩合</span>
                        <span>{formatCurrency(wageCalculation.productCommission)}</span>
                      </div>
                      <div className="result-row">
                        <span>残業代</span>
                        <span>{formatCurrency(wageCalculation.overtimePay)}</span>
                      </div>
                      <div className="result-row">
                        <span>ボーナス</span>
                        <span>{formatCurrency(wageCalculation.bonus)}</span>
                      </div>
                      <div className="result-row total">
                        <span>総支給額</span>
                        <span>{formatCurrency(wageCalculation.grossSalary)}</span>
                      </div>
                      <div className="result-row deduction">
                        <span>控除額</span>
                        <span>-{formatCurrency(wageCalculation.deductions)}</span>
                      </div>
                      <div className="result-row net">
                        <span>支給額</span>
                        <span>{formatCurrency(wageCalculation.netSalary)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-container">
          <h3>給与計算履歴</h3>
          {wageHistory.length === 0 ? (
            <div className="no-data">給与計算履歴がありません</div>
          ) : (
            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>従業員名</th>
                    <th>基本給</th>
                    <th>施術歩合</th>
                    <th>物販歩合</th>
                    <th>残業代</th>
                    <th>ボーナス</th>
                    <th>総支給額</th>
                    <th>控除額</th>
                    <th>支給額</th>
                    <th>計算日</th>
                  </tr>
                </thead>
                <tbody>
                  {wageHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{record.employee_name}</td>
                      <td>{formatCurrency(record.base_salary)}</td>
                      <td>{formatCurrency(record.treatment_commission)}</td>
                      <td>{formatCurrency(record.product_commission)}</td>
                      <td>{formatCurrency(record.overtime_pay)}</td>
                      <td>{formatCurrency(record.bonus)}</td>
                      <td>{formatCurrency(record.gross_salary)}</td>
                      <td>{formatCurrency(record.deductions)}</td>
                      <td className="net-salary">{formatCurrency(record.net_salary)}</td>
                      <td>{formatDate(record.calculation_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WageCalculation;

