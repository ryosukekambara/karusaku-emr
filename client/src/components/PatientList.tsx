
import React, { useState, useEffect } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import config from '../config/api';

import './PatientList.css';

interface Patient {

  id: number;

  name: string;

  kana?: string;

  gender?: string;

  birth_date?: string;

  phone?: string;

  created_at?: string;

}

const PatientList: React.FC = () => {

  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);

  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {

    fetchPatients();

  }, []);

  useEffect(() => {

    filterPatients();

  }, [patients, searchTerm, showDeleted]);

  const fetchPatients = async () => {

    try {

      const token = localStorage.getItem('token');

      if (!token) {

        navigate('/login');

        return;

      }

      const response = await fetch(`${config.apiBaseUrl}/api/patients`, {

        headers: {

          'Authorization': Bearer ${token},

          'Content-Type': 'application/json'

        }

      });

      if (!response.ok) {

        if (response.status === 401) {

          navigate('/login');

          return;

        }

        throw new Error('患者リストの取得に失敗しました');

      }

      const data = await response.json();

      setPatients(data);

    } catch (error) {

      console.error('患者リスト取得エラー:', error);

      alert('患者リストの取得に失敗しました');

    } finally {

      setLoading(false);

    }

  };

  const filterPatients = () => {

    let filtered = patients;

    // 検索フィルタ

    if (searchTerm) {

      filtered = filtered.filter(patient => 

        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        patient.kana?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        patient.id?.toString().includes(searchTerm) ||

        patient.phone?.includes(searchTerm)

      );

    }

    setFilteredPatients(filtered);

  };

  const getAge = (birthDate?: string) => {

    if (!birthDate) return '-';

    const today = new Date();

    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {

      age--;

    }

    return age;

  };

  if (loading) {

    return (

      <div className="loading-container">

        <div className="spinner"></div>

        <p>読み込み中...</p>

      </div>

    );

  }

  return (

    <div className="patient-list-container">

      <div className="page-header">

        <div className="header-content">

          <h1>患者一覧</h1>

          <p className="subtitle">全 {filteredPatients.length} 件</p>

        </div>

        <Link to="/patients/add" className="btn btn-primary btn-add">

          <span className="btn-icon">+</span>

          新規患者登録

        </Link>

      </div>

      <div className="search-bar">

        <div className="search-input-wrapper">

          <span className="search-icon">🔍</span>

          <input

            type="text"

            placeholder="名前、ID、電話番号で検索..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="search-input"

          />

          {searchTerm && (

            <button 

              className="clear-search"

              onClick={() => setSearchTerm('')}

            >

              ✕

            </button>

          )}

        </div>

      </div>

      {filteredPatients.length === 0 ? (

        <div className="empty-state">

          <div className="empty-icon">👥</div>

          <h3>患者が見つかりません</h3>

          <p>検索条件を変更するか、新しい患者を登録してください</p>

        </div>

      ) : (

        <div className="patient-grid">

          {filteredPatients.map((patient) => (

            <Link 

              to={`/patients/${patient.id}`} 

              key={patient.id}

              className="patient-card"

            >

              <div className="card-header">

                <div className="patient-avatar">

                  {patient.name?.charAt(0) || '?'}

                </div>

                <div className="patient-main-info">

                  <h3 className="patient-name">{patient.name}</h3>

                  {patient.kana && (

                    <p className="patient-kana">{patient.kana}</p>

                  )}

                </div>

                <span className="patient-id">ID: {patient.id}</span>

              </div>

              

              <div className="card-body">

                <div className="info-row">

                  <span className="info-label">性別</span>

                  <span className="info-value">

                    {patient.gender === '男性' ? '👨' : patient.gender === '女性' ? '👩' : '-'} 

                    {patient.gender || '-'}

                  </span>

                </div>

                <div className="info-row">

                  <span className="info-label">年齢</span>

                  <span className="info-value">

                    {getAge(patient.birth_date)}歳

                  </span>

                </div>

                <div className="info-row">

                  <span className="info-label">電話</span>

                  <span className="info-value">{patient.phone || '-'}</span>

                </div>

              </div>

              <div className="card-footer">

                <span className="view-detail">詳細を見る →</span>

              </div>

            </Link>

          ))}

        </div>

      )}

    </div>

  );

};

export default PatientList;

