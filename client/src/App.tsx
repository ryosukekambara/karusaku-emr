import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { API_ENDPOINTS, apiConfig } from './config/api';
import { Menu, LogOut } from 'lucide-react';
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
import { sessionManager } from './utils/security';

const API_BASE_URL = apiConfig.baseURL;

interface User {
  username: string;
  name: string;
  role: 'master' | 'staff';
  department: string;
}

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (sidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger-menu')) {
        setSidebarOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const checkSecurity = () => {
      if (user && !sessionManager.isSessionValid()) {
        setSecurityAlert('セッションが期限切れです。再度ログインしてください。');
        handleLogout();
        return;
      }

      if (user && sessionManager.shouldAutoLogout()) {
        setSecurityAlert('長時間の操作がないため、自動ログアウトしました。');
        handleLogout();
        return;
      }

      if (user) {
        sessionManager.refreshSession();
      }
    };

    const securityInterval = setInterval(checkSecurity, 60000);
    return () => clearInterval(securityInterval);
  }, [user]);

  useEffect(() => {
    const initializeApp = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initializeApp();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSecurityAlert(`サーバーに接続できません。エラー: ${errorMessage}`);
      return false;
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setSecurityAlert(null);
      setSidebarOpen(false);
      window.location.replace('/login');
    } catch (error) {
      window.location.href = '/';
    }
  };

  const clearSecurityAlert = () => {
    setSecurityAlert(null);
  };

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

  const Sidebar = ({ user }: { user: User }) => {
    const ProSidebar = require('react-pro-sidebar').Sidebar;
    const Menu = require('react-pro-sidebar').Menu;
    const MenuItem = require('react-pro-sidebar').MenuItem;
    
    return (
      <>
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 999
            }}
          />
        )}
        
        <ProSidebar
          className="sidebar"
          toggled={sidebarOpen}
          onToggle={setSidebarOpen}
          breakPoint="md"
          backgroundColor="#fff"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            zIndex: 1000
          }}
        >
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h2>カルサク</h2>
            <p>電子カルテシステム</p>
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ 
            height: 'calc(100vh - 180px)', 
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <Menu>
              {sidebarItems
                .filter(item => item.role === 'all' || item.role === user.role)
                .map((item, index) => (
                  <MenuItem
                    key={index}
                    onClick={() => {
                      window.location.href = item.path;
                      setSidebarOpen(false);
                    }}
                    style={{ cursor: 'pointer', padding: '15px 20px' }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
            </Menu>
          </div>
          
          <div 
            className="sidebar-logout-area"
            style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            borderTop: '1px solid #eee',
            backgroundColor: '#fff'
          }}>
            <div style={{ marginBottom: '5px', fontSize: '14px' }}>{user.name}</div>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
              {user.role === 'master' ? 'マスター' : 'スタッフ'}
            </div>
            <button 
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '14px'
              }}
            >
              ログアウト
            </button>
          </div>
        </ProSidebar>
      </>
    );
  };

  const MainLayout = ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="app-layout">
        <div className="app-header" style={{ zIndex: 1001 }}>
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
        
        {user && <Sidebar user={user} />}
        
        <main style={{
          marginLeft: '0',
          marginTop: '60px',
          minHeight: 'calc(100vh - 60px)',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          position: 'relative',
          zIndex: 1
        }}>
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
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} securityAlert={securityAlert} />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          {user && (
            <>
              <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/patients" element={<MainLayout><PatientList /></MainLayout>} />
              <Route path="/patients/add" element={<MainLayout><AddPatient /></MainLayout>} />
              <Route path="/patients/:id" element={<MainLayout><PatientDetail /></MainLayout>} />
              <Route path="/patients/:id/records/add" element={<MainLayout><AddMedicalRecord /></MainLayout>} />
              <Route path="/medical-records/:id/edit" element={<MainLayout><EditMedicalRecord /></MainLayout>} />
              <Route path="/patients/:id/treatment" element={<MainLayout><TreatmentRecord /></MainLayout>} />
              <Route path="/medical-records" element={<MainLayout><MedicalRecordList /></MainLayout>} />
              <Route path="/appointments" element={<MainLayout><AddAppointment /></MainLayout>} />
              <Route path="/appointments/add" element={<MainLayout><AddAppointment /></MainLayout>} />
              <Route path="/menu-management" element={<MainLayout><MenuManagement /></MainLayout>} />
              <Route path="/therapists" element={<MainLayout><TherapistList /></MainLayout>} />
              <Route path="/therapists/add" element={<MainLayout><AddTherapist /></MainLayout>} />
              <Route path="/therapists/edit/:id" element={<MainLayout><EditTherapist /></MainLayout>} />
              <Route path="/employees" element={<MainLayout><EmployeeManagement /></MainLayout>} />
              <Route path="/wage-calculation" element={<MainLayout><WageCalculation /></MainLayout>} />
              <Route path="/message-editor" element={<MainLayout><MessageTemplateEditor /></MainLayout>} />
              <Route path="/line-bot" element={<MainLayout><LineBotManagement /></MainLayout>} />
              <Route path="/receipts" element={<MainLayout><ReceiptManagement /></MainLayout>} />
              <Route path="/backup" element={<MainLayout><BackupManagement /></MainLayout>} />
              <Route path="/workflow" element={<MainLayout><WorkflowManagement /></MainLayout>} />
              <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
              <Route path="/settings" element={<MainLayout><SettingsComponent /></MainLayout>} />
              <Route path="/clinic" element={<MainLayout><ClinicManagement /></MainLayout>} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
