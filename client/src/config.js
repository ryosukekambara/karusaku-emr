const config = {
    clinicId: process.env.REACT_APP_CLINIC_ID || "clinic001",
    apiBaseUrl: "https://karusaku-emr-backend.onrender.com",
    baseURL: "https://karusaku-emr-backend.onrender.com",
    clinicName: process.env.REACT_APP_CLINIC_NAME || "メインクリニック",
    
    getDataFile: function(filename) {
      return `${filename}_${this.clinicId}.json`;
    },
    
    clinicSettings: {
      clinic001: { name: "メインクリニック", color: "#10b981" },
      clinic002: { name: "○○分院", color: "#3b82f6" }
    }
  }
  
  export default config;
