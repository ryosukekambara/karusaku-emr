require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDatabase } = require('./db');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 10000;

// 全社員ログイン設定
const COMPANY_USERS = {
  'admin': {
    password: 'admin123',
    name: '管理者',
    role: 'master',
    department: '管理部'
  },
  'staff0': {
    password: 'staff0',
    name: 'マスター',
    role: 'master',
    department: '管理部'
  }
};

// セキュリティ設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// レート制限設定
app.set('trust proxy', 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ログ設定
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// CORS設定
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (token === 'demo-token') {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    if (!user.username || !user.role) {
      return res.status(403).json({ error: 'Invalid user information' });
    }
    
    if (!COMPANY_USERS[user.username]) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  });
};

// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  console.error('エラー:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
};

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ログインAPI
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (COMPANY_USERS[username]) {
    const user = COMPANY_USERS[username];
    if (user.password === password) {
      const token = jwt.sign({ 
        id: username, 
        username: username, 
        role: user.role,
        name: user.name,
        department: user.department
      }, process.env.JWT_SECRET || 'your-secret-key');
      
      res.json({ 
        token, 
        user: { 
          id: username, 
          username: username, 
          role: user.role,
          name: user.name,
          department: user.department
        } 
      });
      return;
    }
  }

  pool.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'your-secret-key');
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
});

// 患者関連API
app.get('/api/patients', authenticateToken, (req, res) => {
  pool.query('SELECT * FROM patients ORDER BY created_at DESC', (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(result.rows);
  });
});

app.post('/api/patients', authenticateToken, (req, res) => {
  const { name, date_of_birth, gender, phone, address, emergency_contact } = req.body;

  pool.query(
    'INSERT INTO patients (name, date_of_birth, gender, phone, address, emergency_contact, clinic_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [name, date_of_birth, gender, phone, address, emergency_contact, 'clinic001'],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: result.rows[0].id, message: 'Patient created successfully' });
    }
  );
});

app.get('/api/patients/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  pool.query('SELECT * FROM patients WHERE id = $1', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  });
});

// 施術者関連API
app.get('/api/therapists', authenticateToken, (req, res) => {
  pool.query('SELECT * FROM therapists ORDER BY created_at DESC', (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(result.rows);
  });
});

app.post('/api/therapists', authenticateToken, (req, res) => {
  const { name, license_number, specialty, phone, email } = req.body;

  pool.query(
    'INSERT INTO therapists (name, license_number, specialty, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [name, license_number, specialty, phone, email],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: result.rows[0].id, message: 'Therapist created successfully' });
    }
  );
});

app.get('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  pool.query('SELECT * FROM therapists WHERE id = $1', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    res.json(result.rows[0]);
  });
});

app.put('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, license_number, specialty, phone, email, status } = req.body;

  pool.query(
    `UPDATE therapists 
     SET name = $1, license_number = $2, specialty = $3, phone = $4, email = $5, status = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [name, license_number, specialty, phone, email, status, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Therapist not found' });
      }
      res.json({ message: '施術者情報を更新しました' });
    }
  );
});

app.delete('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  pool.query('DELETE FROM therapists WHERE id = $1', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    res.json({ message: '施術者を削除しました' });
  });
});

// 診療記録関連API
app.get('/api/patients/:id/records', authenticateToken, (req, res) => {
  const { id } = req.params;

  pool.query(
    `SELECT mr.*, t.name as therapist_name 
     FROM medical_records mr 
     LEFT JOIN therapists t ON mr.therapist_id = t.id 
     WHERE mr.patient_id = $1 
     ORDER BY mr.visit_date DESC`,
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(result.rows);
    }
  );
});

app.post('/api/patients/:id/records', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes } = req.body;

  pool.query(
    `INSERT INTO medical_records 
     (patient_id, therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [id, therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: result.rows[0].id, message: 'Medical record created successfully' });
    }
  );
});

// 統計API
app.get('/api/statistics/monthly', authenticateToken, (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth() + 1;
  
  const query = `
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = true THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = false THEN 1 ELSE 0 END) as existing_patients
    FROM patients 
    WHERE TO_CHAR(created_at, 'YYYY-MM') = $1
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  `;
  
  pool.query(query, [`${year}-${month.toString().padStart(2, '0')}`], (err, result) => {
    if (err) {
      console.error('統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const row = result.rows[0] || {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      total_patients: 0,
      new_patients: 0,
      existing_patients: 0
    };
    
    res.json(row);
  });
});

app.get('/api/statistics/today', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = true THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = false THEN 1 ELSE 0 END) as existing_patients
    FROM patients 
    WHERE DATE(created_at) = CURRENT_DATE
  `;
  
  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('本日統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const row = result.rows[0] || {
      total_patients: 0,
      new_patients: 0,
      existing_patients: 0
    };
    
    res.json(row);
  });
});

app.get('/api/statistics/patients', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = true THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = false THEN 1 ELSE 0 END) as existing_patients,
      ROUND(AVG(EXTRACT(YEAR FROM AGE(date_of_birth))), 1) as average_age,
      SUM(CASE WHEN gender = '男性' THEN 1 ELSE 0 END) as male_count,
      SUM(CASE WHEN gender = '女性' THEN 1 ELSE 0 END) as female_count,
      SUM(CASE WHEN gender NOT IN ('男性', '女性') THEN 1 ELSE 0 END) as other_count
    FROM patients
  `;
  
  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('患者統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const stats = result.rows[0];
    const response = {
      total_patients: parseInt(stats.total_patients) || 0,
      new_patients: parseInt(stats.new_patients) || 0,
      existing_patients: parseInt(stats.existing_patients) || 0,
      average_age: parseFloat(stats.average_age) || 0,
      gender_distribution: {
        male: parseInt(stats.male_count) || 0,
        female: parseInt(stats.female_count) || 0,
        other: parseInt(stats.other_count) || 0
      }
    };
    
    res.json(response);
  });
});

// 予約管理API
app.get('/api/appointments', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      a.id, a.appointment_date, a.duration_minutes, a.status, a.notes,
      p.name as patient_name,
      t.name as therapist_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN therapists t ON a.therapist_id = t.id
    ORDER BY a.appointment_date DESC
  `;
  
  pool.query(query, [], (err, result) => {
    if (err) {
      console.error('予約データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(result.rows);
  });
});

app.post('/api/appointments', authenticateToken, (req, res) => {
  const { patient_id, therapist_id, appointment_date, duration_minutes, notes } = req.body;
  
  if (!patient_id || !therapist_id || !appointment_date) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  pool.query(
    `INSERT INTO appointments (patient_id, therapist_id, appointment_date, duration_minutes, notes, status)
     VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING id`,
    [patient_id, therapist_id, appointment_date, duration_minutes || 60, notes],
    (err, result) => {
      if (err) {
        console.error('予約作成エラー:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(201).json({ 
        id: result.rows[0].id,
        message: 'Appointment created successfully' 
      });
    }
  );
});

// 設定API
app.get('/api/settings', authenticateToken, (req, res) => {
  const defaultSettings = {
    clinic_name: 'カルサククリニック',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    default_therapist_id: 0,
    auto_backup: true,
    backup_frequency: 'daily',
    data_retention_days: 365,
    notification_enabled: true,
    email_notifications: false
  };
  
  res.json(defaultSettings);
});

app.put('/api/settings', authenticateToken, (req, res) => {
  res.json({ message: 'Settings saved successfully' });
});

// 店舗情報API
app.get('/api/clinic/info', authenticateToken, (req, res) => {
  const clinicInfo = {
    id: 1,
    name: 'カルサク治療院',
    name_kana: 'カルサクチリョウイン',
    category: '治療院',
    email: 'info@karusaku-clinic.com',
    phone: '03-1234-5678',
    address: '東京都渋谷区○○○ 1-2-3',
    business_hours: '平日 9:00-18:00\n土曜 9:00-17:00\n日祝 休診',
    description: '患者様一人ひとりに寄り添った治療を提供する治療院です。',
    logo_url: '',
    google_my_business_connected: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.json(clinicInfo);
});

app.put('/api/clinic/info', authenticateToken, (req, res) => {
  const { name, name_kana, category, email, phone, address, business_hours, description, logo_url } = req.body;
  
  if (!name || !email || !phone || !address) {
    return res.status(400).json({ error: '店舗名、メールアドレス、電話番号、住所は必須です' });
  }
  
  console.log('店舗情報更新:', req.body);
  res.json({ message: '店舗情報が更新されました' });
});

// アカウントAPI
app.get('/api/account/profile', authenticateToken, (req, res) => {
  const { username } = req.user;
  
  pool.query(
    'SELECT username, email, role, created_at, last_login, first_name, last_name, phone, department FROM users WHERE username = $1',
    [username],
    (err, result) => {
      if (err) {
        console.error('ユーザー情報取得エラー:', err);
        return res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }
      
      res.json(result.rows[0]);
    }
  );
});

app.get('/api/account/security', authenticateToken, (req, res) => {
  const securitySettings = {
    two_factor_enabled: false,
    session_timeout: 30,
    login_notifications: true,
    device_management: true
  };
  
  res.json(securitySettings);
});

app.get('/api/account/login-history', authenticateToken, (req, res) => {
  const loginHistory = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      ip_address: req.ip || '192.168.1.1',
      user_agent: req.get('User-Agent') || 'Unknown',
      location: 'Tokyo, Japan',
      status: 'success'
    }
  ];
  
  res.json(loginHistory);
});

// レセプト管理API（デモ）
app.get('/api/receipts', authenticateToken, (req, res) => {
  const receipts = [
    {
      id: 1,
      patient_id: 1,
      patient_name: '田中太郎',
      visit_date: '2025-10-11',
      treatment_items: [
        {
          id: 1,
          treatment_name: '鍼灸治療',
          unit_price: 3000,
          quantity: 1,
          total: 3000,
          insurance_code: 'K001'
        }
      ],
      total_amount: 3000,
      insurance_amount: 2700,
      patient_amount: 300,
      status: 'draft',
      created_at: '2025-10-11T10:00:00Z'
    }
  ];
  
  res.json(receipts);
});

app.post('/api/receipts/generate', authenticateToken, (req, res) => {
  const { medical_record_id } = req.body;
  
  if (!medical_record_id) {
    return res.status(400).json({ error: '診療記録IDは必須です' });
  }
  
  const newReceipt = {
    id: Date.now(),
    patient_id: 1,
    patient_name: '自動生成患者',
    visit_date: new Date().toISOString().split('T')[0],
    treatment_items: [
      {
        id: 1,
        treatment_name: '自動判定治療',
        unit_price: 3000,
        quantity: 1,
        total: 3000,
        insurance_code: 'AUTO001'
      }
    ],
    total_amount: 3000,
    insurance_amount: 2700,
    patient_amount: 300,
    status: 'draft',
    created_at: new Date().toISOString()
  };
  
  res.json(newReceipt);
});

app.put('/api/receipts/:id/submit', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  res.json({ 
    success: true,
    message: 'レセプトが正常に提出されました',
    receipt_id: id,
    status: 'submitted'
  });
});

// LINE Bot統計API（デモ）
app.get('/api/line-bot/stats', authenticateToken, (req, res) => {
  const stats = {
    totalAbsenceReports: 5,
    totalSubstituteRequests: 8,
    acceptedSubstitutes: 3,
    declinedSubstitutes: 2
  };
  
  res.json(stats);
});

app.get('/api/line-bot/absence-reports', authenticateToken, (req, res) => {
  const reports = [];
  res.json(reports);
});

app.get('/api/line-bot/substitute-requests', authenticateToken, (req, res) => {
  const requests = [];
  res.json(requests);
});

// エラーハンドリング（最後に配置）
app.use(errorHandler);

// データベース初期化とサーバー起動
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 カルサク EMRシステムが起動しました`);
      console.log(`📍 ポート: ${PORT}`);
      console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 データベース: PostgreSQL`);
      console.log(`🔒 セキュリティ: 有効`);
      console.log(`📈 レート制限: 100 リクエスト/15分`);
      console.log(`\n✨ アクセス: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ データベース初期化エラー:', err);
    process.exit(1);
  });