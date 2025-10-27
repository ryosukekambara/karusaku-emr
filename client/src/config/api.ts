// API設定
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://karusaku-emr-backend.onrender.com';

export const apiConfig = {
  baseURL: API_BASE_URL,
  apiBaseUrl: API_BASE_URL,  // ← これが必須！
  clinicId: process.env.REACT_APP_CLINIC_ID || "clinic001",
  clinicName: process.env.REACT_APP_CLINIC_NAME || "メインクリニック",
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

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

console.log('=== [config/api.ts] Loading ===');
console.log('[config/api.ts] API_BASE_URL:', API_BASE_URL);
console.log('[config/api.ts] apiConfig.baseURL:', apiConfig.baseURL);
console.log('[config/api.ts] apiConfig.apiBaseUrl:', apiConfig.apiBaseUrl);
console.log('===================================');

export default apiConfig;