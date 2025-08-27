import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AddPatient from './components/AddPatient';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import AddMedicalRecord from './components/AddMedicalRecord';
import EditMedicalRecord from './components/EditMedicalRecord';
import TreatmentRecord from './components/TreatmentRecord';
import MenuManagement from './components/MenuManagement';
import AddTherapist from './components/AddTherapist';
import TherapistList from './components/TherapistList';
import EditTherapist from './components/EditTherapist';
import MedicalRecordList from './components/MedicalRecordList';
import MedicalRecordDetail from './components/MedicalRecordDetail';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Account from './components/Account';
import AppointmentList from './components/AppointmentList';
import AddAppointment from './components/AddAppointment';
import ClinicManagement from './components/ClinicManagement';
import ReceiptManagement from './components/ReceiptManagement';
import BackupManagement from './components/BackupManagement';
import Login from './components/Login';
import { initializeSecurity } from './utils/security';
import { startPerformanceMonitoring } from './utils/performance';
// import { initializeErrorHandler } from './utils/errorHandler';
import { initializeSecurityAudit } from './utils/securityAudit';
import './App.css';

interface User {
  id: number;
  username: string;
  role: string;
}

// サイドバーメニューコンポーネント
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose, user }) => {
  const location = useLocation();
  const userRole = user?.role || 'user';
  
  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'ダッシュボード',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
      )
    },
    { 
      path: '/patients', 
              label: '顧客管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      )
    },
    { 
      path: '/patients/add', 
      label: '新規顧客登録',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      )
    },
    { 
      path: '/medical-records', 
      label: '顧客記録',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      )
    },
    { 
      path: '/therapists', 
      label: '施術者管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      )
    },
    { 
      path: '/therapists/add', 
      label: '新規施術者登録',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
    },
    { 
      path: '/menu-management', 
      label: '施術メニュー管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
        </svg>
      )
    },
    { 
      path: '/appointments', 
      label: '予約管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
      )
    },
    { 
      path: '/clinic', 
      label: '店舗・治療院管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    },
    { 
      path: '/receipts', 
      label: 'レセプト管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
      )
    },
    { 
      path: '/backup', 
      label: 'バックアップ管理',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
        </svg>
      )
    },
    { 
      path: '/reports', 
      label: 'レポート',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
      )
    },
    { 
      path: '/settings', 
      label: '設定',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      )
    },
    { 
      path: '/account', 
      label: 'アカウント情報',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      )
    },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-menu">
        {menuItems.map((item) => {
          // マスター権限のみアクセス可能な機能
          const isMasterOnly = item.path === '/settings' || item.path === '/receipts' || item.path === '/backup';
          const isDisabled = isMasterOnly && userRole !== 'master';
          
          return (
            <Link
              key={item.path}
              to={isDisabled ? '#' : item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={isDisabled ? (e) => {
                e.preventDefault();
                alert('この機能はマスター権限でのみ利用できます。');
              } : onClose}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
              {isDisabled && <span className="premium-lock">🔒</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// メインレイアウトコンポーネント
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // セキュリティ、パフォーマンス監視、エラーハンドラー、セキュリティ監査を初期化
    initializeSecurity();
    startPerformanceMonitoring();
    // initializeErrorHandler();
    initializeSecurityAudit();
    
    // ログイン状態の確認
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch (error) {
        // 不正なデータの場合はクリア
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setIsInitialized(true);
  }, []);

  const handleLogin = (userData: any, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
              <button 
                className="mobile-nav-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
              <div className="nav-brand">
                <div className="logo-container">
                  <div className="logo-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="logo-text">
                    <span className="brand-name">カルサク</span>
                    <span className="brand-subtitle">電子カルテ</span>
                  </div>
                </div>
              </div>
              <div className="nav-user">
                <span>ようこそ、{user?.username}さん</span>
                <button onClick={handleLogout} className="logout-btn">ログアウト</button>
              </div>
            </nav>
            
            <div className="main-layout">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
              <div className="main-content">
                <Routes>
                <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
                <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
                <Route path="/patients" element={user ? <PatientList /> : <Navigate to="/login" replace />} />
                <Route path="/patients/add" element={user ? <AddPatient /> : <Navigate to="/login" replace />} />
                <Route path="/patients/:id" element={user ? <PatientDetail /> : <Navigate to="/login" replace />} />
                <Route path="/patients/:id/records/add" element={user ? <AddMedicalRecord /> : <Navigate to="/login" replace />} />
                <Route path="/patients/:id/treatment" element={user ? <TreatmentRecord /> : <Navigate to="/login" replace />} />
                <Route path="/menu-management" element={user ? <MenuManagement /> : <Navigate to="/login" replace />} />
                <Route path="/medical-records" element={user ? <MedicalRecordList /> : <Navigate to="/login" replace />} />
                <Route path="/medical-records/:id" element={user ? <MedicalRecordDetail /> : <Navigate to="/login" replace />} />
                <Route path="/medical-records/:id/edit" element={user ? <EditMedicalRecord /> : <Navigate to="/login" replace />} />
                <Route path="/therapists" element={user ? <TherapistList /> : <Navigate to="/login" replace />} />
                <Route path="/therapists/add" element={user ? <AddTherapist /> : <Navigate to="/login" replace />} />
                <Route path="/therapists/edit/:id" element={user ? <EditTherapist /> : <Navigate to="/login" replace />} />
                <Route path="/appointments" element={user ? <AppointmentList /> : <Navigate to="/login" replace />} />
                <Route path="/appointments/add" element={user ? <AddAppointment /> : <Navigate to="/login" replace />} />
                <Route path="/clinic" element={user ? <ClinicManagement /> : <Navigate to="/login" replace />} />
                <Route path="/receipts" element={user ? <ReceiptManagement /> : <Navigate to="/login" replace />} />
                <Route path="/backup" element={user ? <BackupManagement /> : <Navigate to="/login" replace />} />
                <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" replace />} />
                <Route path="/settings" element={user && user.role === 'master' ? <Settings /> : <Navigate to="/login" replace />} />
                <Route path="/account" element={user ? <Account /> : <Navigate to="/login" replace />} />
                </Routes>
              </div>
            </div>
        </div>
      </Router>
  );
}

export default App;
