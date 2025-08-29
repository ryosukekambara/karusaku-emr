exports.handler = async (event, context) => {
  // CORSヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GETリクエストの処理
  if (event.httpMethod === 'GET') {
    const dashboardData = {
      "totalPatients": 150,
      "newPatientsThisMonth": 25,
      "totalAppointments": 320,
      "totalRevenue": 2500000,
      "monthlyStats": {
        "patients": [120, 135, 142, 150],
        "revenue": [1800000, 2000000, 2200000, 2500000],
        "appointments": [280, 300, 310, 320]
      },
      "recentPatients": [
        {
          "id": 1,
          "name": "田中太郎",
          "lastVisit": "2024-08-29",
          "nextAppointment": "2024-09-05"
        },
        {
          "id": 2,
          "name": "佐藤花子",
          "lastVisit": "2024-08-28",
          "nextAppointment": "2024-09-02"
        }
      ]
    };

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dashboardData)
    };
  }

  // その他のHTTPメソッド
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      error: 'Method not allowed'
    })
  };
};
