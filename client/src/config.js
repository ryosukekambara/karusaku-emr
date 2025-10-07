const config = {
    clinicId: process.env.REACT_APP_CLINIC_ID || "clinic001",
    apiBaseUrl: process.env.REACT_APP_API_URL || "http://localhost:10000",
    clinicName: process.env.REACT_APP_CLINIC_NAME || "メインクリニック",
    
    // データファイル名
    getDataFile: (filename) => `${filename}_${config.clinicId}.json`,
    
    // 各拠点固有の設定
    clinicSettings: {
      clinic001: { name: "メインクリニック", color: "#10b981" },
      clinic002: { name: "○○分院", color: "#3b82f6" }
    }
  }
  
  export default config;