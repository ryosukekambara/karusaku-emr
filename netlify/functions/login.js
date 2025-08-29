exports.handler = async (event, context) => {
  // CORSヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTリクエストの処理
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { username, password } = body;

      // ハードコードされたユーザー認証
      const users = {
        'staff0': { password: 'staff0', role: 'master', name: 'マスター', department: '管理部' },
        'staff1': { password: 'staff1', role: 'staff', name: 'スタッフ', department: '施術部' }
      };

      const user = users[username];

      if (user && user.password === password) {
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: 'mock-jwt-token',
            user: {
              username,
              name: user.name,
              role: user.role,
              department: user.department
            }
          })
        };
      } else {
        return {
          statusCode: 401,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'ユーザー名またはパスワードが正しくありません'
          })
        };
      }
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'リクエストの形式が正しくありません'
        })
      };
    }
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
