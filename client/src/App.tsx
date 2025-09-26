import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { API_ENDPOINTS, getAuthHeaders } from './config/api';
import { 
  BarChart3, 
  Users, 
  UserPlus, 
  FileText, 
  Calendar, 
  Stethoscope, 
  UserCheck, 
  Receipt, 
  UserCog, 
  Calculator, 
  MessageSquare, 
  Bot, 
  HardDrive, 
  Workflow, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';

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
import SettingsComponent from './components/Settings';
import ReceiptManagement from './components/ReceiptManagement';
import BackupManagement from './components/BackupManagement';
import TreatmentRecord from './components/TreatmentRecord';
import MenuManagement from './components/MenuManagement';
import TherapistList from './components/TherapistList';
import AddTherapist from './components/AddTherapist';
import EditTherapist from './components/EditTherapist';
import ClinicManagement from './components/ClinicManagement';
import EmployeeManagement from './components/EmployeeManagement';
import WageCalculation from './components/WageCalculation';
import WorkflowManagement from './components/WorkflowManagement';
import MessageTemplateEditor from './components/MessageTemplateEditor';
import LineBotManagement from './components/LineBotManagement';

// セキュリティ機能のインポート
import { sessionManager } from './utils/security';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        // ローカルストレージからユーザー情報を取得
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setUser(user);
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
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department
        };

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setSecurityAlert(null);
        return true;
      } else {
        const errorData = await response.json();
        setSecurityAlert(errorData.error || 'ログインに失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setSecurityAlert('サーバーに接続できません。ネットワークを確認してください。');
      return false;
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSecurityAlert(null);
    // ログアウト後にページをリロードしてログイン画面に戻る
    window.location.reload();
  };

  // セキュリティアラートをクリア
  const clearSecurityAlert = () => {
    setSecurityAlert(null);
  };

  // サイドバーアイテム
  const sidebarItems: SidebarItem[] = [
    { label: 'ダッシュボード', path: '/dashboard', icon: 'BarChart3', role: 'all' },
    { label: '顧客管理', path: '/patients', icon: 'Users', role: 'all' },
    { label: '新規顧客登録', path: '/patients/add', icon: 'UserPlus', role: 'all' },
    { label: '顧客記録', path: '/medical-records', icon: 'FileText', role: 'all' },
    { label: '予約管理', path: '/appointments', icon: 'Calendar', role: 'all' },
    { label: '施術メニュー管理', path: '/menu-management', icon: 'Stethoscope', role: 'master' },
    { label: '施術者管理', path: '/therapists', icon: 'UserCheck', role: 'master' },
    { label: 'レセプト管理', path: '/receipts', icon: 'Receipt', role: 'master' },
    { label: '従業員管理', path: '/employees', icon: 'UserCog', role: 'master' },
    { label: '給与計算', path: '/wage-calculation', icon: 'Calculator', role: 'master' },
    { label: 'メッセージ編集', path: '/message-editor', icon: 'MessageSquare', role: 'master' },
    { label: 'LINE Bot管理', path: '/line-bot', icon: 'Bot', role: 'master' },
    { label: 'バックアップ管理', path: '/backup', icon: 'HardDrive', role: 'master' },
    { label: 'ワークフロー管理', path: '/workflow', icon: 'Workflow', role: 'master' },
    { label: 'レポート', path: '/reports', icon: 'TrendingUp', role: 'master' },
    { label: '設定', path: '/settings', icon: 'Settings', role: 'master' },
  ];

  // サイドバーコンポーネント
  const Sidebar = ({ user }: { user: User }) => {
    // 条件付きレンダリングで完全に瞬時表示・非表示
    if (!sidebarOpen) {
      return null;
    }

    return (
      <>
        <div 
          className="sidebar"
          style={{
            position: 'fixed',
            left: '0',
            top: '0',
            width: '280px',
            height: '100vh',
            backgroundColor: 'white',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={() => setSidebarOpen(false)}
        >
            <div className="sidebar-header">
              <h2>カルサク</h2>
              <p>電子カルテシステム</p>
              <button 
                className="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="sidebar-nav">
              {sidebarItems
            .filter(item => item.role === 'all' || item.role === user.role)
            .map((item, index) => {
              const getIcon = (iconName: string) => {
                switch (iconName) {
                  case 'BarChart3': return <BarChart3 size={20} />;
                  case 'Users': return <Users size={20} />;
                  case 'UserPlus': return <UserPlus size={20} />;
                  case 'FileText': return <FileText size={20} />;
                  case 'Calendar': return <Calendar size={20} />;
                  case 'Stethoscope': return <Stethoscope size={20} />;
                  case 'UserCheck': return <UserCheck size={20} />;
                  case 'Receipt': return <Receipt size={20} />;
                  case 'UserCog': return <UserCog size={20} />;
                  case 'Calculator': return <Calculator size={20} />;
                  case 'MessageSquare': return <MessageSquare size={20} />;
                  case 'Bot': return <Bot size={20} />;
                  case 'HardDrive': return <HardDrive size={20} />;
                  case 'Workflow': return <Workflow size={20} />;
                  case 'TrendingUp': return <TrendingUp size={20} />;
                  case 'Settings': return <Settings size={20} />;
                  default: return null;
                }
              };

              return (
                <Link
                  key={index}
                  to={item.path}
                  className="sidebar-item"
                >
                  <span className="sidebar-icon">
                    {getIcon(item.icon)}
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              );
            })}
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
      </>
    );
  };

  // メインレイアウト
  const MainLayout = ({ children }: { children: React.ReactNode }) => {
    // メインコンテンツのスタイルをJavaScriptで直接制御（固定位置）
    const mainContentStyle = {
      marginLeft: '0',
      marginTop: '60px', // ヘッダーの高さ分だけ下げる
      transition: 'none',
      minHeight: 'calc(100vh - 60px)',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      width: '100%',
      maxWidth: 'none',
      position: 'relative' as const,
      zIndex: 1
    };

    return (
      <div className="app-layout">
        {/* ヘッダー */}
        <div className="app-header">
          <button 
            className="hamburger-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>
          
          <div className="header-user-info">
            <span className="user-name">{user?.name}</span>
            <button onClick={handleLogout} className="header-logout-btn">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {user && (
          <Sidebar user={user} />
        )}
        
        <main style={mainContentStyle}>
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
  };

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
                path="/appointments"
                element={
                  <MainLayout>
                    <AddAppointment />
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
                path="/employees"
                element={
                  <MainLayout>
                    <EmployeeManagement />
                  </MainLayout>
                }
              />
              <Route
                path="/wage-calculation"
                element={
                  <MainLayout>
                    <WageCalculation />
                  </MainLayout>
                }
              />
              <Route
                path="/message-editor"
                element={
                  <MainLayout>
                    <MessageTemplateEditor />
                  </MainLayout>
                }
              />
              <Route
                path="/line-bot"
                element={
                  <MainLayout>
                    <LineBotManagement />
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
                path="/workflow"
                element={
                  <MainLayout>
                    <WorkflowManagement />
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
                    <SettingsComponent />
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
