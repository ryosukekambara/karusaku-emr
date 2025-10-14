// API設定
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://karusaku-emr-backend.onrender.com';
export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    health: '/api/health',
    auth: {
      login: '/api/auth/login',
    },
    patients: '/api/patients',
    medicalRecords: '/api/medical-records',
    appointments: '/api/appointments',
    dashboard: {
      stats: '/api/dashboard/stats',
    },
  },
};

// 後方互換性のためのエクスポート
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/auth/login',
  },
  PATIENTS: '/api/patients',
  MEDICAL_RECORDS: '/api/medical-records',
  APPOINTMENTS: '/api/appointments',
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
  },
};

// 認証ヘッダーを取得する関数
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

export default apiConfig;