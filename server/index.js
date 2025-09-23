const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { pool, initializeDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3023', 'http://192.168.1.100:3000', 'http://192.168.1.100:3023'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの提供（フロントエンド）
app.use(express.static(path.join(__dirname, '../client/build')));

// データベース初期化
initializeDatabase();

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

// 認証ルート
app.post('/api/auth/login', (req, res) => {
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
app.get('/api/patients', authenticateToken, (req, res) => {
  db.all('SELECT * FROM patients ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }
    res.json(rows);
  });
});

app.post('/api/patients', authenticateToken, (req, res) => {
  const { name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies } = req.body;

  db.run(
    `INSERT INTO patients (name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, kana, birth_date, gender, phone, email, address, emergency_contact, medical_history, allergies],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'データベースエラー' });
      }
      res.json({ id: this.lastID, message: '患者が正常に登録されました' });
    }
  );
});

// 施術記録API
app.get('/api/medical-records', authenticateToken, (req, res) => {
  db.all(`
    SELECT mr.*, p.name as patient_name, s.name as staff_name
    FROM medical_records mr
    JOIN patients p ON mr.patient_id = p.id
    JOIN staff s ON mr.staff_id = s.id
    ORDER BY mr.treatment_date DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }
    res.json(rows);
  });
});

app.post('/api/medical-records', authenticateToken, (req, res) => {
  const { patient_id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes } = req.body;

  db.run(
    `INSERT INTO medical_records (patient_id, staff_id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, req.user.id, treatment_date, treatment_type, symptoms, diagnosis, treatment_content, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'データベースエラー' });
      }
      res.json({ id: this.lastID, message: '施術記録が正常に登録されました' });
    }
  );
});

// 予約管理API
app.get('/api/appointments', authenticateToken, (req, res) => {
  db.all(`
    SELECT a.*, p.name as patient_name, s.name as staff_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN staff s ON a.staff_id = s.id
    ORDER BY a.appointment_date ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }
    res.json(rows);
  });
});

app.post('/api/appointments', authenticateToken, (req, res) => {
  const { patient_id, appointment_date, treatment_type, notes } = req.body;

  db.run(
    `INSERT INTO appointments (patient_id, staff_id, appointment_date, treatment_type, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [patient_id, req.user.id, appointment_date, treatment_type, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'データベースエラー' });
      }
      res.json({ id: this.lastID, message: '予約が正常に登録されました' });
    }
  );
});

// ダッシュボード統計API
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const stats = {};

  // 総患者数
  db.get('SELECT COUNT(*) as count FROM patients', (err, row) => {
    if (err) return res.status(500).json({ error: 'データベースエラー' });
    stats.totalPatients = row.count;

    // 今月の新規患者数
    db.get(`
      SELECT COUNT(*) as count FROM patients 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `, (err, row) => {
      if (err) return res.status(500).json({ error: 'データベースエラー' });
      stats.monthlyNewPatients = row.count;

      // 今日の予約数
      db.get(`
        SELECT COUNT(*) as count FROM appointments 
        WHERE date(appointment_date) = date('now')
      `, (err, row) => {
        if (err) return res.status(500).json({ error: 'データベースエラー' });
        stats.todayAppointments = row.count;

        res.json(stats);
      });
    });
  });
});

// フロントエンドのルート（SPA対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
  console.log(`ローカルアクセス: http://localhost:${PORT}`);
  console.log(`ネットワークアクセス: http://192.168.1.100:${PORT}`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\nサーバーをシャットダウンしています...');
  db.close((err) => {
    if (err) {
      console.error('データベースクローズエラー:', err.message);
    } else {
      console.log('データベース接続を閉じました');
    }
    process.exit(0);
  });
});
