import React, { useState, useEffect } from 'react';
import config from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';

interface TreatmentRecordData {
  id: number;
  patient_id: number;
  date: string;
  time: string;
  therapist: string;
  menu: string;
  memo: string;
  photos: string[];
  created_at: string;
}

interface Patient {
  id: number;
  name: string;
  date_of_birth: string;
  gender: string;
}

interface TreatmentRecordProps {
  patientId?: string;
}

const TreatmentRecord: React.FC<TreatmentRecordProps> = ({ patientId }) => {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = patientId || urlId;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<TreatmentRecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('treatment');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    therapist: '',
    menu: '',
    memo: '',
    photos: [] as File[]
  });

  useEffect(() => {
    fetchPatientData();
    fetchTreatmentRecords();
  }, [id]);

  const fetchPatientData = async () => {
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
    } catch (error) {
      console.error('顧客データの取得に失敗しました:', error);
    }
  };

  const fetchTreatmentRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/patients/${id}/treatment-records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const recordsData = await response.json();
        setRecords(recordsData);
      }
    } catch (error) {
      console.error('施術記録の取得に失敗しました:', error);
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('date', formData.date);
      formDataToSend.append('time', formData.time);
      formDataToSend.append('therapist', formData.therapist);
      formDataToSend.append('menu', formData.menu);
      formDataToSend.append('memo', formData.memo);
      
      formData.photos.forEach(photo => {
        formDataToSend.append('photos', photo);
      });

      const response = await fetch(`${config.baseURL}/api/patients/${id}/treatment-records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        alert('施術記録を保存しました');
        fetchTreatmentRecords();
        setFormData({
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          therapist: '',
          menu: '',
          memo: '',
          photos: []
        });
      }
    } catch (error) {
      console.error('施術記録の保存に失敗しました:', error);
      alert('施術記録の保存に失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="container">
      <div className="patient-header">
        <h2>ID {patient?.id} {patient?.name}</h2>
        <p>{patient?.date_of_birth} {patient?.gender}</p>
      </div>

      {/* タブナビゲーション */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'treatment' ? 'active' : ''}`}
          onClick={() => setActiveTab('treatment')}
        >
          施術録
        </button>
        <button
          className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
          onClick={() => setActiveTab('customer')}
        >
          顧客情報
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          予約履歴
        </button>
        <button
          className={`tab-btn ${activeTab === 'questionnaire' ? 'active' : ''}`}
          onClick={() => setActiveTab('questionnaire')}
        >
          問診票
        </button>
        <button
          className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          写真
        </button>
        <button
          className={`tab-btn ${activeTab === 'body-map' ? 'active' : ''}`}
          onClick={() => setActiveTab('body-map')}
        >
          図
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {activeTab === 'treatment' && (
          <div className="treatment-record">
            <div className="record-form">
              <h3>施術記録</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>日付:</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>時間:</label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>担当者:</label>
                    <select
                      name="therapist"
                      value={formData.therapist}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">担当者を選択してください</option>
                      <option value="田中太郎">田中太郎</option>
                      <option value="佐藤花子">佐藤花子</option>
                      <option value="山田次郎">山田次郎</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>メニュー:</label>
                    <select
                      name="menu"
                      value={formData.menu}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">メニューを選択してください</option>
                      <option value="鍼治療">鍼治療</option>
                      <option value="灸治療">灸治療</option>
                      <option value="マッサージ">マッサージ</option>
                      <option value="整体">整体</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>カルテ:</label>
                  <textarea
                    name="memo"
                    value={formData.memo}
                    onChange={handleInputChange}
                    placeholder="メモ (こちらの情報はユーザー側には表示されません)"
                    rows={4}
                    className="form-control"
                  />
                  <div className="template-buttons">
                    <button type="button" className="btn btn-sm btn-secondary">
                      定型文の挿入
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>写真:</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="form-control"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    +
                  </button>
                  <button type="button" className="btn btn-secondary">
                    前回分をコピー
                  </button>
                </div>
              </form>
            </div>

            <div className="record-list">
              <h3>施術記録一覧</h3>
              {records.map(record => (
                <div key={record.id} className="record-item">
                  <div className="record-header">
                    <span className="record-date">
                      {new Date(record.date).toLocaleDateString('ja-JP')} {record.time}
                    </span>
                    <span className="record-therapist">担当者: {record.therapist}</span>
                    <span className="record-menu">メニュー: {record.menu}</span>
                  </div>
                  <div className="record-content">
                    <p>{record.memo}</p>
                    {record.photos.length > 0 && (
                      <div className="record-photos">
                        {record.photos.map((photo: string, index: number) => (
                          <img key={index} src={photo} alt={`写真${index + 1}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'questionnaire' && (
          <div className="questionnaire">
            <h3>問診票</h3>
            <div className="upload-section">
              <label htmlFor="questionnaire-upload" className="upload-btn">
                <input
                  id="questionnaire-upload"
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  style={{ display: 'none' }}
                />
                📄 問診票をアップロード
              </label>
              <p>PDF・写真でアップロードできます</p>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="photos">
            <h3>写真</h3>
            <div className="upload-section">
              <label htmlFor="photo-upload" className="upload-btn">
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
                📷 写真をアップロード
              </label>
            </div>
          </div>
        )}

        {activeTab === 'body-map' && (
          <div className="body-map">
            <h3>人体図</h3>
            <div className="body-map-container">
              <div className="body-model">
                {/* 人体モデルのSVGまたは画像 */}
                <svg width="300" height="400" viewBox="0 0 300 400">
                  {/* 人体の輪郭 */}
                  <ellipse cx="150" cy="50" rx="30" ry="40" fill="none" stroke="#333" strokeWidth="2"/>
                  <rect x="120" y="90" width="60" height="120" fill="none" stroke="#333" strokeWidth="2"/>
                  <ellipse cx="150" cy="250" rx="40" ry="60" fill="none" stroke="#333" strokeWidth="2"/>
                  {/* 四肢 */}
                  <line x1="120" y1="120" x2="80" y2="180" stroke="#333" strokeWidth="2"/>
                  <line x1="180" y1="120" x2="220" y2="180" stroke="#333" strokeWidth="2"/>
                  <line x1="120" y1="200" x2="80" y2="280" stroke="#333" strokeWidth="2"/>
                  <line x1="180" y1="200" x2="220" y2="280" stroke="#333" strokeWidth="2"/>
                </svg>
              </div>
              <div className="map-controls">
                <button className="btn btn-sm btn-primary">丸を描く</button>
                <button className="btn btn-sm btn-secondary">消去</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentRecord;
