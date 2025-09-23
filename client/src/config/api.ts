// API設定
const getApiBaseUrl = () => {
  // 本番環境では環境変数を使用
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'http://192.0.0.2:5000';
  }
  
  // 開発環境では現在のホストを使用
  const hostname = window.location.hostname;
  
  // ローカルホストの場合
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // ネットワーク経由の場合
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();

// API エンドポイント
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
  },
  PATIENTS: {
    LIST: `${API_BASE_URL}/api/patients`,
    CREATE: `${API_BASE_URL}/api/patients`,
  },
  MEDICAL_RECORDS: {
    LIST: `${API_BASE_URL}/api/medical-records`,
    CREATE: `${API_BASE_URL}/api/medical-records`,
  },
  APPOINTMENTS: {
    LIST: `${API_BASE_URL}/api/appointments`,
    CREATE: `${API_BASE_URL}/api/appointments`,
  },
  DASHBOARD: {
    STATS: `${API_BASE_URL}/api/dashboard/stats`,
  },
};

// 認証ヘッダーを取得する関数
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};
