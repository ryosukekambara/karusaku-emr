// API設定
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://karusaku-emr-api.onrender.com';

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

export default apiConfig;