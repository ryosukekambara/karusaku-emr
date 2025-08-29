import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

// コンポーネントのインポート
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import AddPatient from './components/AddPatient';
import PatientDetail from './components/PatientDetail';
import MedicalRecordList from './components/MedicalRecordList';
import AddMedicalRecord from './components/AddMedicalRecord';
import EditMedicalRecord from './components/EditMedicalRecord';
import AddAppointment from './components/AddAppointment';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ReceiptManagement from './components/ReceiptManagement';
import BackupManagement from './components/BackupManagement';
import TreatmentRecord from './components/TreatmentRecord';
import MenuManagement from './components/MenuManagement';
import TherapistList from './components/TherapistList';
import AddTherapist from './components/AddTherapist';
import EditTherapist from './components/EditTherapist';
import ClinicManagement from './components/ClinicManagement';

// セキュリティ機能のインポート
import { sessionManager, rateLimiter, securityAudit } from './utils/security';

// ユーザー型定義
interface User {
  username: string;
  name: string;
  role: 'master' | 'staff';
  department: string;
}

// サイドバーアイテム型定義
interface SidebarItem {
  label: string;
  path: string;
  icon: string;
  role: 'master' | 'staff' | 'all';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // セキュリティチェック
  useEffect(() => {
    const checkSecurity = () => {
      // セッション有効性チェック
      if (user && !sessionManager.isSessionValid()) {
        setSecurityAlert('セッションが期限切れです。再度ログインしてください。');
        handleLogout();
        return;
      }

      // 自動ログアウトチェック
      if (user && sessionManager.shouldAutoLogout()) {
        setSecurityAlert('長時間の操作がないため、自動ログアウトしました。');
        handleLogout();
        return;
      }

      // セッション更新
      if (user) {
        sessionManager.refreshSession();
      }
    };

    // 定期的なセキュリティチェック
    const securityInterval = setInterval(checkSecurity, 60000); // 1分ごと

    return () => clearInterval(securityInterval);
  }, [user]);

  // 初期化時のセキュリティチェック
  useEffect(() => {
    const initializeApp = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          
          // セキュリティ監査
          if (!securityAudit.checkSensitiveData(parsedUser)) {
            console.warn('Security audit: Sensitive data detected in user data');
            handleLogout();
            return;
          }

          setUser(parsedUser);
          sessionManager.refreshSession();
        }
      } catch (error) {
        console.error('Security error during initialization:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // ログイン処理
  const handleLogin = async (username: string, password: string) => {
    // 入力値のサニタイズ
    const sanitizedUsername = username.trim();
    const sanitizedPassword = password.trim();

    // オフライン認証（APIリクエストなし）
    if ((sanitizedUsername === 'staff0' && sanitizedPassword === 'staff0') ||
        (sanitizedUsername === 'staff1' && sanitizedPassword === 'staff1')) {
      
      // ユーザー情報を設定
      const userData: User = {
        username: sanitizedUsername,
        name: sanitizedUsername === 'staff0' ? 'マスター' : 'スタッフ',
        role: sanitizedUsername === 'staff0' ? 'master' : 'staff',
        department: sanitizedUsername === 'staff0' ? '管理部' : '施術部'
      };

      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setSecurityAlert(null);
      return true;
    } else {
      setSecurityAlert('ユーザー名またはパスワードが正しくありません');
      return false;
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSecurityAlert(null);
  };

  // セキュリティアラートをクリア
  const clearSecurityAlert = () => {
    setSecurityAlert(null);
  };

  // サイドバーアイテム
  const sidebarItems: SidebarItem[] = [
    { label: 'ダッシュボード', path: '/dashboard', icon: '📊', role: 'all' },
    { label: '顧客管理', path: '/patients', icon: '👥', role: 'all' },
    { label: '新規顧客登録', path: '/patients/add', icon: '➕', role: 'all' },
    { label: '顧客記録', path: '/medical-records', icon: '📋', role: 'all' },
    { label: '予約管理', path: '/appointments/add', icon: '📅', role: 'all' },
    { label: '施術メニュー管理', path: '/menu-management', icon: '🍽️', role: 'master' },
    { label: '施術者管理', path: '/therapists', icon: '👨‍⚕️', role: 'master' },
    { label: 'レセプト管理', path: '/receipts', icon: '💰', role: 'master' },
    { label: 'バックアップ管理', path: '/backup', icon: '💾', role: 'master' },
    { label: 'レポート', path: '/reports', icon: '📈', role: 'master' },
    { label: '設定', path: '/settings', icon: '⚙️', role: 'master' },
  ];

  // サイドバーコンポーネント
  const Sidebar = ({ user }: { user: User }) => (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>カルサク</h2>
        <p>電子カルテシステム</p>
      </div>
      <nav className="sidebar-nav">
        {sidebarItems
          .filter(item => item.role === 'all' || item.role === user.role)
          .map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="sidebar-item"
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <span>{user.name}</span>
          <span className="user-role">{user.role === 'master' ? 'マスター' : 'スタッフ'}</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          ログアウト
        </button>
      </div>
    </div>
  );

  // メインレイアウト
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="app-layout">
      {user && <Sidebar user={user} />}
      <main className="main-content">
        {securityAlert && (
          <div className="security-alert">
            <span>{securityAlert}</span>
            <button onClick={clearSecurityAlert}>×</button>
          </div>
        )}
        {children}
      </main>
    </div>
  );

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} securityAlert={securityAlert} />
              )
            }
          />
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {user && (
            <>
              <Route
                path="/dashboard"
                element={
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                }
              />
              <Route
                path="/patients"
                element={
                  <MainLayout>
                    <PatientList />
                  </MainLayout>
                }
              />
              <Route
                path="/patients/add"
                element={
                  <MainLayout>
                    <AddPatient />
                  </MainLayout>
                }
              />
              <Route
                path="/patients/:id"
                element={
                  <MainLayout>
                    <PatientDetail />
                  </MainLayout>
                }
              />
              <Route
                path="/patients/:id/records/add"
                element={
                  <MainLayout>
                    <AddMedicalRecord />
                  </MainLayout>
                }
              />
              <Route
                path="/medical-records/:id/edit"
                element={
                  <MainLayout>
                    <EditMedicalRecord />
                  </MainLayout>
                }
              />
              <Route
                path="/patients/:id/treatment"
                element={
                  <MainLayout>
                    <TreatmentRecord />
                  </MainLayout>
                }
              />
              <Route
                path="/medical-records"
                element={
                  <MainLayout>
                    <MedicalRecordList />
                  </MainLayout>
                }
              />
              <Route
                path="/appointments/add"
                element={
                  <MainLayout>
                    <AddAppointment />
                  </MainLayout>
                }
              />
              <Route
                path="/menu-management"
                element={
                  <MainLayout>
                    <MenuManagement />
                  </MainLayout>
                }
              />
              <Route
                path="/therapists"
                element={
                  <MainLayout>
                    <TherapistList />
                  </MainLayout>
                }
              />
              <Route
                path="/therapists/add"
                element={
                  <MainLayout>
                    <AddTherapist />
                  </MainLayout>
                }
              />
              <Route
                path="/therapists/edit/:id"
                element={
                  <MainLayout>
                    <EditTherapist />
                  </MainLayout>
                }
              />
              <Route
                path="/receipts"
                element={
                  <MainLayout>
                    <ReceiptManagement />
                  </MainLayout>
                }
              />
              <Route
                path="/backup"
                element={
                  <MainLayout>
                    <BackupManagement />
                  </MainLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                }
              />
              <Route
                path="/clinic"
                element={
                  <MainLayout>
                    <ClinicManagement />
                  </MainLayout>
                }
              />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
