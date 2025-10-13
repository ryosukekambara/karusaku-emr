const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool, initializeDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// データベース初期化
(async () => {
  try {
    await initializeDatabase();
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
})();

// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'アクセストークンが必要です' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
};

// APIルート
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 認証ルート
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM staff WHERE username = ?',
      [username]
    );

    if (rows.length === 0 || !await bcrypt.compare(password, rows[0].password)) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

// 患者管理API
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM patients ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

// 患者の最大ID取得
app.get('/api/patients/max-id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT MAX(id) as max_id FROM patients');
    res.json({ maxId: rows[0].max_id || 0 });
  } catch (error) {
    console.error('Error getting max ID:', error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { id, name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies } = req.body;

  try {
    let result;
    if (id) {
      // ID指定あり
      [result] = await pool.execute(
        `INSERT INTO patients (id, name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies]
      );
      res.json({ id, message: '患者が正常に登録されました' });
    } else {
      // ID自動採番
      [result] = await pool.execute(
        `INSERT INTO patients (name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies]
      );
      res.json({ id: result.insertId, message: '患者が正常に登録されました' });
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'そのIDは既に使用されています' });
    } else {
      console.error('Database error:', error);
      res.status(500).json({ error: 'データベースエラー' });
    }
  }
});

// 施術記録API
app.get('/api/medical-records', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT mr.*, p.name as patient_name, s.name as staff_name
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.id
      JOIN staff s ON mr.staff_id = s.id
      ORDER BY mr.treatment_date DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

app.post('/api/medical-records', authenticateToken, async (req, res) => {
  const { patient_id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO medical_records (patient_id, staff_id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, req.user.id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes]
    );
    res.json({ id: result.insertId, message: '施術記録が正常に登録されました' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

// 予約管理API
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, p.name as patient_name, s.name as staff_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN staff s ON a.staff_id = s.id
      ORDER BY a.appointment_date ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patient_id, appointment_date, treatment_type, notes } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_id, staff_id, appointment_date, treatment_type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, req.user.id, appointment_date, treatment_type, notes]
    );
    res.json({ id: result.insertId, message: '予約が正常に登録されました' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

// ダッシュボード統計API
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    // 総患者数
    const [totalPatients] = await pool.execute('SELECT COUNT(*) as count FROM patients');
    stats.totalPatients = totalPatients[0].count;

    // 今月の新規患者数
    const [monthlyNewPatients] = await pool.execute(`
      SELECT COUNT(*) as count FROM patients 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
    stats.monthlyNewPatients = monthlyNewPatients[0].count;

    // 今日の予約数
    const [todayAppointments] = await pool.execute(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE date(appointment_date) = date('now')
    `);
    stats.todayAppointments = todayAppointments[0].count;

    res.json(stats);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'データベースエラー' });
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: 'APIエンドポイントが見つかりません' });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`APIサーバーがポート ${PORT} で起動しました`);
  console.log(`ローカルアクセス: http://localhost:${PORT}`);
  console.log(`ネットワークアクセス: http://192.168.1.100:${PORT}`);
});

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('\nサーバーをシャットダウンしています...');
  try {
    await pool.end();
    console.log('データベース接続を閉じました');
  } catch (err) {
    console.error('データベースクローズエラー:', err.message);
  }
  process.exit(0);
});
