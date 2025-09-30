require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const WorkflowEngine = require('./workflow-engine');

const app = express();
const PORT = process.env.PORT || 3001;

// ワークフローエンジン初期化
const workflowEngine = new WorkflowEngine();

// 拠点別データファイル取得関数
function getDataFilePath(clinicId = 'clinic001') {
  return path.join(__dirname, `customer_data_${clinicId}.json`);
}

// バックアップ設定
const BACKUP_CONFIG = {
  enabled: process.env.AUTO_BACKUP === 'true' || true,
  interval: process.env.BACKUP_INTERVAL || 24 * 60 * 60 * 1000, // 24時間
  maxBackups: process.env.MAX_BACKUPS || 30, // 30個まで保持
  backupDir: process.env.BACKUP_DIR || './backups',
  compressBackups: process.env.COMPRESS_BACKUPS === 'true' || false
};

// SaaSプラン別バックアップ設定（医療データ保存期間対応）
const BACKUP_PLANS = {
  free: {
    maxBackups: 30, // 1ヶ月分（最低限）
    retentionDays: 30,
    autoBackup: false,
    googleDriveSync: false,
    emailBackup: false,
    price: 0
  },
  starter: {
    maxBackups: 365, // 1年分（基本）
    retentionDays: 365,
    autoBackup: true,
    googleDriveSync: false,
    emailBackup: true, // 月次CSV
    price: 1500
  },
  pro: {
    maxBackups: 1095, // 3年分（医療データ保存期間）
    retentionDays: 1095,
    autoBackup: true,
    googleDriveSync: true,
    emailBackup: true, // 週次CSV
    price: 4000
  },
  enterprise: {
    maxBackups: 1825, // 5年分（長期保存）
    retentionDays: 1825,
    autoBackup: true,
    googleDriveSync: true,
    emailBackup: true, // 日次CSV
    price: 12000
  }
};

// 全社員ログイン設定
const COMPANY_USERS = {
  'staff0': {
    password: 'staff0',
    name: 'マスター',
    role: 'master',
    department: '管理部'
  },
  'staff1': {
    password: 'staff1',
    name: 'スタッフ',
    role: 'staff',
    department: '営業部'
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
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15分
  max: process.env.RATE_LIMIT_MAX || 100, // リクエスト制限
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
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
  origin: process.env.CORS_ORIGIN || '*', // すべてのオリジンからのアクセスを許可
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// データベース初期化
const dbPath = process.env.SQLITE_PATH || './medical_records.db';
const db = new sqlite3.Database(dbPath);

// バックアップ機能
const createBackup = () => {
  return new Promise((resolve, reject) => {
    try {
      // バックアップディレクトリ作成
      if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
        fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_CONFIG.backupDir, `medical_records_backup_${timestamp}.db`);
      
      // データベースファイルをコピー
      fs.copyFileSync(dbPath, backupPath);
      
      // 古いバックアップを削除
      cleanupOldBackups();
      
      console.log(`✅ 自動バックアップ完了: ${backupPath}`);
      resolve(backupPath);
    } catch (error) {
      console.error('❌ バックアップエラー:', error);
      reject(error);
    }
  });
};

const cleanupOldBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.backupDir)
      .filter(file => file.startsWith('medical_records_backup_'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_CONFIG.backupDir, file),
        time: fs.statSync(path.join(BACKUP_CONFIG.backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // 古いバックアップを削除
    if (files.length > BACKUP_CONFIG.maxBackups) {
      const filesToDelete = files.slice(BACKUP_CONFIG.maxBackups);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ 古いバックアップ削除: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('❌ バックアップクリーンアップエラー:', error);
  }
};

// 自動バックアップ開始
let backupInterval;
const startAutoBackup = () => {
  if (BACKUP_CONFIG.enabled) {
    backupInterval = setInterval(async () => {
      try {
        await createBackup();
      } catch (error) {
        console.error('❌ 自動バックアップエラー:', error);
      }
    }, BACKUP_CONFIG.interval);
    
    console.log(`🔄 自動バックアップ開始: ${BACKUP_CONFIG.interval / (1000 * 60 * 60)}時間間隔`);
  }
};

// Google Drive連携機能（コスト最適化版）
const uploadToGoogleDrive = async (filePath, fileName, clinicId) => {
  try {
    // ファイルサイズチェック（10MB制限）
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 10) {
      console.log(`⚠️ ファイルサイズが大きすぎます: ${fileSizeInMB.toFixed(2)}MB`);
      // 圧縮版をアップロード
      return await uploadCompressedBackup(filePath, fileName, clinicId);
    }

    // Google Drive API設定
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_DRIVE_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = {
      name: `${clinicId}_${fileName}`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      description: `カルサク EMR バックアップ - ${new Date().toISOString()}`,
    };

    const media = {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,size',
    });

    console.log(`✅ Google Driveアップロード完了: ${file.data.id} (${(file.data.size / 1024 / 1024).toFixed(2)}MB)`);
    return file.data.id;
  } catch (error) {
    console.error('❌ Google Driveアップロードエラー:', error);
    throw error;
  }
};

// 圧縮バックアップアップロード
const uploadCompressedBackup = async (filePath, fileName, clinicId) => {
  try {
    const archiver = require('archiver');
    const compressedPath = `${filePath}.zip`;
    
    const output = fs.createWriteStream(compressedPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.file(filePath, { name: fileName });
    await archive.finalize();
    
    // 圧縮ファイルをアップロード
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_DRIVE_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = {
      name: `${clinicId}_${fileName}.zip`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      description: `カルサク EMR 圧縮バックアップ - ${new Date().toISOString()}`,
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(compressedPath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,size',
    });

    // 圧縮ファイルを削除
    fs.unlinkSync(compressedPath);
    
    console.log(`✅ 圧縮Google Driveアップロード完了: ${file.data.id} (${(file.data.size / 1024 / 1024).toFixed(2)}MB)`);
    return file.data.id;
  } catch (error) {
    console.error('❌ 圧縮Google Driveアップロードエラー:', error);
    throw error;
  }
};

// メールバックアップ機能
const sendEmailBackup = async (clinicId, clinicEmail, backupType = 'monthly') => {
  try {
    // CSVデータ生成
    const csvData = await generateCSVBackup(clinicId, backupType);
    
    // メール送信設定
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clinicEmail,
      subject: `カルサク - ${backupType === 'monthly' ? '月次' : '週次'}データバックアップ`,
      html: `
        <h2>カルサク データバックアップ</h2>
        <p>${backupType === 'monthly' ? '月次' : '週次'}データバックアップをお送りします。</p>
        <p>添付のCSVファイルをご確認ください。</p>
        <p>※このメールは自動送信されています。</p>
      `,
      attachments: [
        {
          filename: `karusaku_backup_${clinicId}_${new Date().toISOString().split('T')[0]}.csv`,
          content: csvData,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ メールバックアップ送信完了: ${clinicEmail}`);
  } catch (error) {
    console.error('❌ メールバックアップ送信エラー:', error);
    throw error;
  }
};

// CSVバックアップ生成
const generateCSVBackup = async (clinicId, backupType) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id, p.name, p.date_of_birth, p.gender, p.phone, p.email, p.address,
        p.insurance_card_number, p.primary_diagnosis, p.created_at,
        t.name as therapist_name,
        mr.treatment_date, mr.symptoms, mr.treatment_content, mr.notes
      FROM patients p
      LEFT JOIN therapists t ON p.therapist_id = t.id
      LEFT JOIN medical_records mr ON p.id = mr.patient_id
      WHERE p.clinic_id = ?
      ORDER BY p.created_at DESC
    `;

    db.all(query, [clinicId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const headers = [
        '患者ID', '氏名', '生年月日', '性別', '電話番号', 'メール', '住所',
        '保険証番号', '主訴', '登録日', '担当施術者', '治療日', '症状', '治療内容', '備考'
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => [
          row.id, row.name, row.date_of_birth, row.gender, row.phone, row.email, row.address,
          row.insurance_card_number, row.primary_diagnosis, row.created_at,
          row.therapist_name, row.treatment_date, row.symptoms, row.treatment_content, row.notes
        ].join(','))
      ].join('\n');

      resolve(csvContent);
    });
  });
};

// データベーステーブル作成
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // ユーザーテーブル
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT DEFAULT 'user',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        department TEXT,
        avatar TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 患者テーブル
      db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        gender TEXT CHECK(gender IN ('男性', '女性', 'その他')),
        phone TEXT,
        email TEXT,
        address TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        insurance_card_number TEXT,
        insurance_type TEXT,
        insurance_holder TEXT,
        insurance_relationship TEXT,
        insurance_valid_until TEXT,
        primary_diagnosis TEXT,
        secondary_diagnosis TEXT,
        medical_history TEXT,
        allergies TEXT,
        medications TEXT,
        is_new_patient INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 施術者テーブル
      db.run(`CREATE TABLE IF NOT EXISTS therapists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        license_number TEXT UNIQUE,
        specialty TEXT,
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'active',
        hire_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 診療記録テーブル
      db.run(`CREATE TABLE IF NOT EXISTS medical_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        therapist_id INTEGER,
        visit_date TEXT NOT NULL,
        symptoms TEXT,
        diagnosis TEXT,
        treatment TEXT,
        prescription TEXT,
        notes TEXT,
        next_visit_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
        FOREIGN KEY (therapist_id) REFERENCES therapists (id) ON DELETE SET NULL
      )`);

      // 予約テーブル
      db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        therapist_id INTEGER,
        appointment_date TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
        FOREIGN KEY (therapist_id) REFERENCES therapists (id) ON DELETE SET NULL
      )`);

      // 請求テーブル
      db.run(`CREATE TABLE IF NOT EXISTS billing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        medical_record_id INTEGER,
        amount REAL NOT NULL,
        tax_rate REAL DEFAULT 0.10,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
        FOREIGN KEY (medical_record_id) REFERENCES medical_records (id) ON DELETE SET NULL
      )`);

      // システム設定テーブル
      db.run(`CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 監査ログテーブル
      db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // メニューテーブル
      db.run(`CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL DEFAULT 0,
        duration INTEGER DEFAULT 60,
        category TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 施術記録テーブル
      db.run(`CREATE TABLE IF NOT EXISTS treatment_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        therapist TEXT,
        menu TEXT,
        memo TEXT,
        photos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
      )`);

      // 監査ログテーブルの修正
      db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      )`);

      // 初期データ挿入
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) {
          console.error('初期データ確認エラー:', err);
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          const hashedPassword = bcrypt.hashSync('admin123', 12);
          db.run("INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)", 
            ['admin', hashedPassword, 'admin@karusaku.com', 'admin'], (err) => {
            if (err) {
              console.error('初期ユーザー作成エラー:', err);
              reject(err);
            } else {
              console.log('初期ユーザー（admin）を作成しました');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  });
};

// 監査ログ機能
const auditLog = (userId, action, tableName, recordId, oldValues, newValues, req) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  db.run(`INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, action, tableName, recordId, 
     oldValues ? JSON.stringify(oldValues) : null,
     newValues ? JSON.stringify(newValues) : null,
     ipAddress, userAgent]);
};

// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // デモトークンの認証（開発・テスト用）
  if (token === 'demo-token') {
    req.user = { id: 'demo', username: 'demo', role: 'admin' };
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // ユーザー情報の検証
    if (!user.username || !user.role) {
      return res.status(403).json({ error: 'Invalid user information' });
    }
    
    // 有効なユーザーかチェック
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
  
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ error: 'Data constraint violation' });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
};

// APIルート（静的ファイルの提供より前に配置）
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // 全社員ログイン対応
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

  // 既存のデータベース認証（フォールバック）
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
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

// 給与計算システム関連API
// 従業員管理API
app.get('/api/employees', authenticateToken, (req, res) => {
  db.all('SELECT * FROM employees ORDER BY created_at DESC', (err, employees) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(employees);
  });
});

app.post('/api/employees', authenticateToken, (req, res) => {
  const { name, position, hourly_rate, commission_rate, phone, email } = req.body;
  
  db.run(
    'INSERT INTO employees (name, position, hourly_rate, commission_rate, phone, email) VALUES (?, ?, ?, ?, ?, ?)',
    [name, position, hourly_rate, commission_rate, phone, email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Employee created successfully' });
    }
  );
});

// OCR画像解析API（Gemini 2.0-flash統合）
app.post('/api/ocr/analyze', authenticateToken, (req, res) => {
  const { imageData, employeeId } = req.body;
  
  // Gemini 2.0-flash API統合（emergentintegrations使用）
  const analyzeImage = async () => {
    try {
      // 画像データから給与計算に必要な情報を抽出
      const extractedData = {
        treatmentRevenue: 0,
        productSales: 0,
        workingDays: 0,
        deductions: 0,
        overtimeHours: 0,
        bonus: 0
      };
      
      // 実際のGemini 2.0-flash API呼び出しはここに実装
      // emergentintegrationsライブラリを使用
      
      res.json({
        success: true,
        data: extractedData,
        message: '画像解析が完了しました'
      });
    } catch (error) {
      console.error('OCR解析エラー:', error);
      res.status(500).json({ error: '画像解析に失敗しました' });
    }
  };
  
  analyzeImage();
});

// 給与計算API
app.post('/api/wage/calculate', authenticateToken, (req, res) => {
  const { employeeId, treatmentRevenue, productSales, workingDays, deductions, overtimeHours, bonus } = req.body;
  
  try {
    // 従業員情報を取得
    db.get('SELECT * FROM employees WHERE id = ?', [employeeId], (err, employee) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      // 給与計算ロジック
      const hourlyRate = employee.hourly_rate || 0;
      const commissionRate = employee.commission_rate || 0;
      
      // 基本給計算
      const baseSalary = hourlyRate * workingDays * 8; // 1日8時間想定
      
      // 歩合給計算
      const treatmentCommission = treatmentRevenue * (commissionRate / 100);
      const productCommission = productSales * (commissionRate / 100);
      
      // 残業代計算
      const overtimePay = overtimeHours * hourlyRate * 1.25; // 25%割増
      
      // 総支給額
      const grossSalary = baseSalary + treatmentCommission + productCommission + overtimePay + (bonus || 0);
      
      // 控除後支給額
      const netSalary = grossSalary - (deductions || 0);
      
      const wageCalculation = {
        employeeId,
        employeeName: employee.name,
        baseSalary,
        treatmentCommission,
        productCommission,
        overtimePay,
        bonus: bonus || 0,
        grossSalary,
        deductions: deductions || 0,
        netSalary,
        calculationDate: new Date().toISOString()
      };
      
      // 給与計算結果をデータベースに保存
      db.run(
        'INSERT INTO wage_calculations (employee_id, base_salary, treatment_commission, product_commission, overtime_pay, bonus, gross_salary, deductions, net_salary, calculation_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [employeeId, baseSalary, treatmentCommission, productCommission, overtimePay, bonus || 0, grossSalary, deductions || 0, netSalary, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('給与計算保存エラー:', err);
          }
        }
      );
      
      res.json({
        success: true,
        wageCalculation,
        message: '給与計算が完了しました'
      });
    });
  } catch (error) {
    console.error('給与計算エラー:', error);
    res.status(500).json({ error: '給与計算に失敗しました' });
  }
});

// 給与明細履歴API
app.get('/api/wage/history', authenticateToken, (req, res) => {
  const { employeeId, month, year } = req.query;
  
  let query = `
    SELECT wc.*, e.name as employee_name 
    FROM wage_calculations wc 
    JOIN employees e ON wc.employee_id = e.id
  `;
  let params = [];
  
  if (employeeId) {
    query += ' WHERE wc.employee_id = ?';
    params.push(employeeId);
  }
  
  if (month && year) {
    query += employeeId ? ' AND' : ' WHERE';
    query += ' strftime("%m", wc.calculation_date) = ? AND strftime("%Y", wc.calculation_date) = ?';
    params.push(month.padStart(2, '0'), year);
  }
  
  query += ' ORDER BY wc.calculation_date DESC';
  
  db.all(query, params, (err, wageHistory) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(wageHistory);
  });
});

// 患者関連API
app.get('/api/patients', authenticateToken, (req, res) => {
  db.all('SELECT * FROM patients ORDER BY created_at DESC', (err, patients) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(patients);
  });
});

app.post('/api/patients', authenticateToken, (req, res) => {
  const { name, date_of_birth, gender, phone, address, emergency_contact } = req.body;

  db.run(
    'INSERT INTO patients (name, date_of_birth, gender, phone, address, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)',
    [name, date_of_birth, gender, phone, address, emergency_contact],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Patient created successfully' });
    }
  );
});

app.get('/api/patients/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, patient) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  });
});

// 施術者関連API
app.get('/api/therapists', authenticateToken, (req, res) => {
  db.all('SELECT * FROM therapists ORDER BY created_at DESC', (err, therapists) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(therapists);
  });
});

app.post('/api/therapists', authenticateToken, (req, res) => {
  const { name, license_number, specialty, phone, email } = req.body;

  db.run(
    'INSERT INTO therapists (name, license_number, specialty, phone, email) VALUES (?, ?, ?, ?, ?)',
    [name, license_number, specialty, phone, email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Therapist created successfully' });
    }
  );
});

app.get('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM therapists WHERE id = ?', [id], (err, therapist) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    res.json(therapist);
  });
});

// 施術者更新API
app.put('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, license_number, specialty, phone, email, status } = req.body;

  db.run(
    `UPDATE therapists 
     SET name = ?, license_number = ?, specialty = ?, phone = ?, email = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [name, license_number, specialty, phone, email, status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Therapist not found' });
      }
      res.json({ message: '施術者情報を更新しました' });
    }
  );
});

// 施術者削除API
app.delete('/api/therapists/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM therapists WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    res.json({ message: '施術者を削除しました' });
  });
});

// 診療記録関連API
app.get('/api/patients/:id/records', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT mr.*, t.name as therapist_name 
     FROM medical_records mr 
     JOIN therapists t ON mr.therapist_id = t.id 
     WHERE mr.patient_id = ? 
     ORDER BY mr.visit_date DESC`,
    [id],
    (err, records) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(records);
    }
  );
});

// CSVインポート用API
app.post('/api/patients/import-csv', authenticateToken, (req, res) => {
  try {
    const { patients } = req.body;
    
    if (!Array.isArray(patients)) {
      return res.status(400).json({ error: '患者データが正しい形式ではありません' });
    }

    const stmt = db.prepare(`
      INSERT INTO patients (name, phone, date_of_birth, gender, is_new_patient, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertMany = db.transaction((patients) => {
      for (const patient of patients) {
        stmt.run(
          patient.name,
          patient.phone,
          patient.date_of_birth,
          patient.gender,
          patient.is_new_patient ? 1 : 0
        );
      }
    });

    insertMany(patients);
    stmt.finalize();

    res.json({ message: 'CSVインポートが完了しました', count: patients.length });
  } catch (error) {
    console.error('CSVインポートエラー:', error);
    res.status(500).json({ error: 'CSVインポートに失敗しました' });
  }
});

// メニュー管理API
app.get('/api/menus', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM menus ORDER BY created_at DESC');
    const menus = stmt.all();
    stmt.finalize();
    res.json(menus);
  } catch (error) {
    console.error('メニュー取得エラー:', error);
    res.status(500).json({ error: 'メニューの取得に失敗しました' });
  }
});

app.post('/api/menus', authenticateToken, (req, res) => {
  try {
    const { name, description, price, duration, category } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO menus (name, description, price, duration, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(name, description, price, duration, category);
    stmt.finalize();
    
    res.json({ id: result.lastInsertRowid, message: 'メニューを登録しました' });
  } catch (error) {
    console.error('メニュー登録エラー:', error);
    res.status(500).json({ error: 'メニューの登録に失敗しました' });
  }
});

app.delete('/api/menus/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM menus WHERE id = ?');
    const result = stmt.run(id);
    stmt.finalize();
    
    if (result.changes > 0) {
      res.json({ message: 'メニューを削除しました' });
    } else {
      res.status(404).json({ error: 'メニューが見つかりません' });
    }
  } catch (error) {
    console.error('メニュー削除エラー:', error);
    res.status(500).json({ error: 'メニューの削除に失敗しました' });
  }
});

// 施術記録API
app.get('/api/patients/:id/treatment-records', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT * FROM treatment_records 
      WHERE patient_id = ? 
      ORDER BY date DESC, time DESC
    `);
    const records = stmt.all(id);
    stmt.finalize();
    
    res.json(records);
  } catch (error) {
    console.error('施術記録取得エラー:', error);
    res.status(500).json({ error: '施術記録の取得に失敗しました' });
  }
});

app.post('/api/patients/:id/treatment-records', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, therapist, menu, memo } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO treatment_records (patient_id, date, time, therapist, menu, memo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(id, date, time, therapist, menu, memo);
    stmt.finalize();
    
    res.json({ id: result.lastInsertRowid, message: '施術記録を保存しました' });
  } catch (error) {
    console.error('施術記録保存エラー:', error);
    res.status(500).json({ error: '施術記録の保存に失敗しました' });
  }
});

app.post('/api/patients/:id/records', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes } = req.body;

  db.run(
    `INSERT INTO medical_records 
     (patient_id, therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, therapist_id, visit_date, symptoms, diagnosis, treatment, prescription, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Medical record created successfully' });
    }
  );
});

// 月別患者登録統計API
app.get('/api/statistics/monthly', authenticateToken, (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || new Date().getMonth() + 1;
  
  const query = `
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = 0 THEN 1 ELSE 0 END) as existing_patients
    FROM patients 
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY strftime('%Y-%m', created_at)
  `;
  
  db.get(query, [`${year}-${month.toString().padStart(2, '0')}`], (err, row) => {
    if (err) {
      console.error('統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const result = row || {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      total_patients: 0,
      new_patients: 0,
      existing_patients: 0
    };
    
    res.json(result);
  });
});

// 月別患者登録数（過去12ヶ月）
app.get('/api/statistics/monthly-trend', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = 0 THEN 1 ELSE 0 END) as existing_patients
    FROM patients 
    WHERE created_at >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('月別統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(rows);
  });
});

// 本日の患者人数API
app.get('/api/statistics/today', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = 0 THEN 1 ELSE 0 END) as existing_patients
    FROM patients 
    WHERE DATE(created_at) = DATE('now')
  `;
  
  db.get(query, [], (err, row) => {
    if (err) {
      console.error('本日統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const result = row || {
      total_patients: 0,
      new_patients: 0,
      existing_patients: 0
    };
    
    res.json(result);
  });
});

// 施術者別統計API
app.get('/api/statistics/therapists', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      t.id,
      t.name,
      t.specialty,
      COUNT(DISTINCT mr.patient_id) as total_patients,
      COUNT(mr.id) as total_records,
      SUM(CASE WHEN p.is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
      ROUND(
        (SUM(CASE WHEN p.is_new_patient = 0 THEN 1 ELSE 0 END) * 100.0 / 
         COUNT(DISTINCT mr.patient_id)), 1
      ) as repeat_rate
    FROM therapists t
    LEFT JOIN medical_records mr ON t.id = mr.therapist_id
    LEFT JOIN patients p ON mr.patient_id = p.id
    WHERE t.status = 'active'
    GROUP BY t.id, t.name, t.specialty
    ORDER BY total_patients DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('施術者統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(rows);
  });
});

// 患者タイプを切り替えるAPI
app.put('/api/patients/:id/mark-existing', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { is_new_patient } = req.body;
  
  db.run("UPDATE patients SET is_new_patient = ? WHERE id = ?", [is_new_patient ? 1 : 0, id], function(err) {
    if (err) {
      console.error('患者更新エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const message = is_new_patient ? 'Patient marked as new successfully' : 'Patient marked as existing successfully';
    res.json({ message });
  });
});

// 前回の診療記録を取得するAPI
app.get('/api/patients/:id/last-record', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT mr.*, t.name as therapist_name
    FROM medical_records mr
    LEFT JOIN therapists t ON mr.therapist_id = t.id
    WHERE mr.patient_id = ?
    ORDER BY mr.visit_date DESC, mr.created_at DESC
    LIMIT 1
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('前回記録取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(row || {});
  });
});

// 医療記録一覧API
app.get('/api/medical-records', authenticateToken, (req, res) => {
  const query = `
    SELECT mr.*, p.name as patient_name, t.name as therapist_name
    FROM medical_records mr
    JOIN patients p ON mr.patient_id = p.id
    JOIN therapists t ON mr.therapist_id = t.id
    ORDER BY mr.visit_date DESC, mr.created_at DESC
  `;
  
  db.all(query, [], (err, records) => {
    if (err) {
      console.error('医療記録一覧取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(records);
  });
});

// 医療記録詳細API
app.get('/api/medical-records/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT mr.*, p.name as patient_name, t.name as therapist_name
    FROM medical_records mr
    JOIN patients p ON mr.patient_id = p.id
    JOIN therapists t ON mr.therapist_id = t.id
    WHERE mr.id = ?
  `;
  
  db.get(query, [id], (err, record) => {
    if (err) {
      console.error('医療記録詳細取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    
    res.json(record);
  });
});

// 医療記録削除API
app.delete('/api/medical-records/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM medical_records WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('医療記録削除エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    
    res.json({ message: 'Medical record deleted successfully' });
  });
});

// 患者統計API
app.get('/api/statistics/patients', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_patients,
      SUM(CASE WHEN is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
      SUM(CASE WHEN is_new_patient = 0 THEN 1 ELSE 0 END) as existing_patients,
      ROUND(AVG(CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER)), 1) as average_age,
      SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_count,
      SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_count,
      SUM(CASE WHEN gender NOT IN ('male', 'female') THEN 1 ELSE 0 END) as other_count
    FROM patients
  `;
  
  db.get(query, [], (err, stats) => {
    if (err) {
      console.error('患者統計データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const result = {
      total_patients: stats.total_patients || 0,
      new_patients: stats.new_patients || 0,
      existing_patients: stats.existing_patients || 0,
      average_age: stats.average_age || 0,
      gender_distribution: {
        male: stats.male_count || 0,
        female: stats.female_count || 0,
        other: stats.other_count || 0
      }
    };
    
    res.json(result);
  });
});

// レポートCSVエクスポートAPI
app.get('/api/reports/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  
  let query = '';
  let filename = '';
  
  switch (type) {
    case 'patients':
      query = `
        SELECT 
          id, name, date_of_birth, gender, phone, email, address,
          CASE WHEN is_new_patient = 1 THEN '新規' ELSE '既存' END as patient_type,
          created_at
        FROM patients
        ORDER BY created_at DESC
      `;
      filename = 'patients_report.csv';
      break;
      
    case 'medical-records':
      query = `
        SELECT 
          mr.id, p.name as patient_name, t.name as therapist_name,
          mr.visit_date, mr.symptoms, mr.diagnosis, mr.treatment,
          mr.prescription, mr.notes, mr.created_at
        FROM medical_records mr
        JOIN patients p ON mr.patient_id = p.id
        JOIN therapists t ON mr.therapist_id = t.id
        ORDER BY mr.visit_date DESC
      `;
      filename = 'medical_records_report.csv';
      break;
      
    case 'therapists':
      query = `
        SELECT 
          id, name, specialty, status, created_at
        FROM therapists
        ORDER BY created_at DESC
      `;
      filename = 'therapists_report.csv';
      break;
      
    case 'monthly-stats':
      query = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as total_patients,
          SUM(CASE WHEN is_new_patient = 1 THEN 1 ELSE 0 END) as new_patients,
          SUM(CASE WHEN is_new_patient = 0 THEN 1 ELSE 0 END) as existing_patients
        FROM patients 
        WHERE created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
      `;
      filename = 'monthly_stats_report.csv';
      break;
      
    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('レポート生成エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // CSVヘッダーを生成
    const headers = Object.keys(rows[0] || {}).join(',');
    const csvData = [headers];
    
    // データ行を生成
    rows.forEach(row => {
      const values = Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      );
      csvData.push(values.join(','));
    });
    
    const csv = csvData.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

// 設定API
app.get('/api/settings', authenticateToken, (req, res) => {
  // 簡易版：デフォルト設定を返す
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
  // 簡易版：設定を保存（実際はデータベースに保存）
  res.json({ message: 'Settings saved successfully' });
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
  
  db.all(query, [], (err, appointments) => {
    if (err) {
      console.error('予約データ取得エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(appointments);
  });
});

app.post('/api/appointments', authenticateToken, (req, res) => {
  const { patient_id, therapist_id, appointment_date, duration_minutes, notes } = req.body;
  
  if (!patient_id || !therapist_id || !appointment_date) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  db.run(`
    INSERT INTO appointments (patient_id, therapist_id, appointment_date, duration_minutes, notes, status)
    VALUES (?, ?, ?, ?, ?, 'scheduled')
  `, [patient_id, therapist_id, appointment_date, duration_minutes || 60, notes], function(err) {
    if (err) {
      console.error('予約作成エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.status(201).json({ 
      id: this.lastID,
      message: 'Appointment created successfully' 
    });
  });
});

app.put('/api/appointments/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) {
      console.error('予約ステータス更新エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment status updated successfully' });
  });
});

app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM appointments WHERE id = ?", [id], function(err) {
    if (err) {
      console.error('予約削除エラー:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  });
});

// アカウントAPI
app.get('/api/account/profile', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  
  db.get('SELECT username, email, role, created_at, last_login, first_name, last_name, phone, department FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err) {
      console.error('ユーザー情報取得エラー:', err);
      return res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    
    res.json(user);
  });
});

app.put('/api/account/profile', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  const { username, email, first_name, last_name, phone, department } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'ユーザー名とメールアドレスは必須です' });
  }
  
  db.run(
    'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, phone = ?, department = ? WHERE id = ?', 
    [username, email, first_name || null, last_name || null, phone || null, department || null, user_id], 
    function(err) {
      if (err) {
        console.error('プロフィール更新エラー:', err);
        return res.status(500).json({ error: 'プロフィールの更新に失敗しました' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }
      
      res.json({ message: 'プロフィールが更新されました' });
    }
  );
});

app.get('/api/account/security', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  
  // セキュリティ設定を取得（デフォルト値）
  const securitySettings = {
    two_factor_enabled: false,
    session_timeout: 30,
    login_notifications: true,
    device_management: true
  };
  
  res.json(securitySettings);
});

app.put('/api/account/security', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  const { two_factor_enabled, session_timeout, login_notifications, device_management } = req.body;
  
  // セキュリティ設定を保存（実際の実装ではデータベースに保存）
  console.log('セキュリティ設定更新:', { user_id, two_factor_enabled, session_timeout, login_notifications, device_management });
  
  res.json({ message: 'セキュリティ設定が更新されました' });
});

app.get('/api/account/login-history', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  
  // ログイン履歴を取得（実際の実装ではデータベースから取得）
  const loginHistory = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      ip_address: req.ip || '192.168.1.1',
      user_agent: req.get('User-Agent') || 'Unknown',
      location: 'Tokyo, Japan',
      status: 'success'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Tokyo, Japan',
      status: 'success'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      ip_address: '203.0.113.1',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      location: 'Osaka, Japan',
      status: 'failed'
    }
  ];
  
  res.json(loginHistory);
});

app.post('/api/account/logout-all', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  
  // すべてのデバイスからログアウト（実際の実装ではトークンを無効化）
  console.log('すべてのデバイスからログアウト:', user_id);
  
  res.json({ message: 'すべてのデバイスからログアウトしました' });
});

app.put('/api/account/password', authenticateToken, (req, res) => {
  const { user_id } = req.user;
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: '現在のパスワードと新しいパスワードは必須です' });
  }
  
  if (new_password.length < 8) {
    return res.status(400).json({ error: '新しいパスワードは8文字以上で入力してください' });
  }
  
  // パスワード強度チェック
  const hasLower = /[a-z]/.test(new_password);
  const hasUpper = /[A-Z]/.test(new_password);
  const hasNumber = /\d/.test(new_password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(new_password);
  
  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return res.status(400).json({ error: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります' });
  }
  
  // 現在のパスワードを確認
  db.get('SELECT password FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err) {
      console.error('パスワード確認エラー:', err);
      return res.status(500).json({ error: 'パスワードの確認に失敗しました' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    
    bcrypt.compare(current_password, user.password, (err, isMatch) => {
      if (err) {
        console.error('パスワード比較エラー:', err);
        return res.status(500).json({ error: 'パスワードの確認に失敗しました' });
      }
      
      if (!isMatch) {
        return res.status(400).json({ error: '現在のパスワードが正しくありません' });
      }
      
      // 新しいパスワードをハッシュ化
      bcrypt.hash(new_password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('パスワードハッシュ化エラー:', err);
          return res.status(500).json({ error: 'パスワードの更新に失敗しました' });
        }
        
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user_id], function(err) {
          if (err) {
            console.error('パスワード更新エラー:', err);
            return res.status(500).json({ error: 'パスワードの更新に失敗しました' });
          }
          
          res.json({ message: 'パスワードが更新されました' });
        });
      });
    });
  });
});

// 店舗・治療院管理API
app.get('/api/clinic/info', authenticateToken, (req, res) => {
  // デフォルトの店舗情報を返す
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
  
  // 実際の実装ではデータベースに保存
  console.log('店舗情報更新:', req.body);
  
  res.json({ message: '店舗情報が更新されました' });
});

// レセプト管理API（プレミアム機能）
app.get('/api/receipts', authenticateToken, (req, res) => {
  // デモデータを返す
  const receipts = [
    {
      id: 1,
      patient_id: 1,
      patient_name: '田中太郎',
      visit_date: '2025-08-25',
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
      created_at: '2025-08-25T10:00:00Z'
    },
    {
      id: 2,
      patient_id: 2,
      patient_name: '佐藤花子',
      visit_date: '2025-08-24',
      treatment_items: [
        {
          id: 2,
          treatment_name: 'マッサージ',
          unit_price: 2500,
          quantity: 1,
          total: 2500,
          insurance_code: 'M001'
        }
      ],
      total_amount: 2500,
      insurance_amount: 2250,
      patient_amount: 250,
      status: 'submitted',
      created_at: '2025-08-24T15:30:00Z'
    }
  ];
  
  res.json(receipts);
});

app.post('/api/receipts/generate', authenticateToken, (req, res) => {
  const { medical_record_id } = req.body;
  
  if (!medical_record_id) {
    return res.status(400).json({ error: '診療記録IDは必須です' });
  }
  
  // 診療記録からレセプトを自動生成
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
  
  console.log('レセプト自動生成:', { medical_record_id, newReceipt });
  
  res.json(newReceipt);
});

app.put('/api/receipts/:id/submit', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  console.log('レセプト提出:', id);
  
  try {
    // レセプトの存在確認とステータス更新のロジックをここに実装
    // 現在はデモ用の成功レスポンスを返す
    
    // 成功レスポンス
    res.json({ 
      success: true,
      message: 'レセプトが正常に提出されました',
      receipt_id: id,
      status: 'submitted'
    });
  } catch (error) {
    console.error('レセプト提出エラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'レセプト提出に失敗しました' 
    });
  }
});

// バックアップ関連API
app.post('/api/backup/create', authenticateToken, async (req, res) => {
  try {
    const backupPath = await createBackup();
    res.json({ 
      success: true, 
      message: 'バックアップが作成されました',
      backup_path: backupPath 
    });
  } catch (error) {
    console.error('手動バックアップエラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'バックアップ作成に失敗しました' 
    });
  }
});

app.get('/api/backup/list', authenticateToken, (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(BACKUP_CONFIG.backupDir)
      .filter(file => file.startsWith('medical_records_backup_'))
      .map(file => {
        const filePath = path.join(BACKUP_CONFIG.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created_at: stats.mtime,
          size_human: formatBytes(stats.size)
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    res.json({ backups: files });
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'バックアップ一覧の取得に失敗しました' 
    });
  }
});

app.post('/api/backup/restore/:filename', authenticateToken, (req, res) => {
  const { filename } = req.params;
  
  try {
    const backupPath = path.join(BACKUP_CONFIG.backupDir, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'バックアップファイルが見つかりません' 
      });
    }

    // 現在のデータベースをバックアップ
    const currentBackup = path.join(BACKUP_CONFIG.backupDir, `current_before_restore_${Date.now()}.db`);
    fs.copyFileSync(dbPath, currentBackup);

    // バックアップから復元
    fs.copyFileSync(backupPath, dbPath);
    
    res.json({ 
      success: true, 
      message: 'バックアップから復元されました',
      restored_from: filename,
      current_backup: path.basename(currentBackup)
    });
  } catch (error) {
    console.error('バックアップ復元エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'バックアップ復元に失敗しました' 
    });
  }
});

// ユーティリティ関数
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// プラン別バックアップ管理API
app.get('/api/backup/plans', authenticateToken, (req, res) => {
  res.json({
    plans: BACKUP_PLANS,
    currentPlan: req.user.plan || 'free'
  });
});

app.post('/api/backup/upgrade-plan', authenticateToken, (req, res) => {
  const { plan } = req.body;
  
  if (!BACKUP_PLANS[plan]) {
    return res.status(400).json({ error: '無効なプランです' });
  }

  // プランアップグレード処理
  // 実際の実装では決済処理を追加
  console.log(`プランアップグレード: ${req.user.username} -> ${plan}`);
  
  res.json({
    success: true,
    message: 'プランがアップグレードされました',
    newPlan: plan,
    features: BACKUP_PLANS[plan]
  });
});

app.post('/api/backup/setup-google-drive', authenticateToken, (req, res) => {
  const { clinicId, email } = req.body;
  
  // Google Drive連携設定
  // 実際の実装ではOAuth認証フローを追加
  console.log(`Google Drive連携設定: ${clinicId} -> ${email}`);
  
  res.json({
    success: true,
    message: 'Google Drive連携が設定されました',
    clinicId,
    email
  });
});

app.post('/api/backup/setup-email', authenticateToken, (req, res) => {
  const { clinicId, email, frequency } = req.body;
  
  // メールバックアップ設定
  console.log(`メールバックアップ設定: ${clinicId} -> ${email} (${frequency})`);
  
  res.json({
    success: true,
    message: 'メールバックアップが設定されました',
    clinicId,
    email,
    frequency
  });
});

app.get('/api/backup/usage/:clinicId', authenticateToken, (req, res) => {
  const { clinicId } = req.params;
  const plan = req.user.plan || 'free';
  const planConfig = BACKUP_PLANS[plan];
  
  try {
    const backupDir = path.join(BACKUP_CONFIG.backupDir, clinicId);
    let backupCount = 0;
    let totalSize = 0;
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('medical_records_backup_'));
      
      backupCount = files.length;
      totalSize = files.reduce((sum, file) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return sum + stats.size;
      }, 0);
    }
    
    res.json({
      clinicId,
      plan,
      usage: {
        current: backupCount,
        limit: planConfig.maxBackups,
        totalSize: formatBytes(totalSize),
        retentionDays: planConfig.retentionDays
      },
      features: {
        autoBackup: planConfig.autoBackup,
        googleDriveSync: planConfig.googleDriveSync,
        emailBackup: planConfig.emailBackup
      }
    });
  } catch (error) {
    console.error('バックアップ使用量取得エラー:', error);
    res.status(500).json({ error: '使用量の取得に失敗しました' });
  }
});

// ==================== ワークフローAPI エンドポイント ====================

// ワークフロー実行API
app.post('/api/workflow/execute', authenticateToken, async (req, res) => {
  try {
    const { emailData, workflowType = 'gmail-slack-notion' } = req.body;
    
    if (!emailData) {
      return res.status(400).json({ error: 'メールデータが必要です' });
    }

    const result = await workflowEngine.executeWorkflow(emailData);
    res.json(result);
  } catch (error) {
    console.error('ワークフローAPI エラー:', error);
    res.status(500).json({ error: 'ワークフロー実行に失敗しました' });
  }
});

// Gmail Webhook エンドポイント
app.post('/api/webhook/gmail', async (req, res) => {
  try {
    const emailData = req.body;
    console.log('📧 Gmail Webhook受信:', emailData);
    
    // ワークフローを自動実行
    const result = await workflowEngine.executeWorkflow(emailData);
    
    res.json({ success: true, message: 'ワークフロー実行完了' });
  } catch (error) {
    console.error('Gmail Webhook エラー:', error);
    res.status(500).json({ error: 'Webhook処理に失敗しました' });
  }
});

// ワークフロー設定取得API
app.get('/api/workflow/config', authenticateToken, (req, res) => {
  try {
    const config = workflowEngine.getConfig();
    res.json(config);
  } catch (error) {
    console.error('ワークフロー設定取得エラー:', error);
    res.status(500).json({ error: '設定取得に失敗しました' });
  }
});

// ワークフローテスト実行API
app.post('/api/workflow/test', authenticateToken, async (req, res) => {
  try {
    const result = await workflowEngine.testWorkflow();
    res.json({
      success: true,
      message: 'テストワークフロー実行完了',
      result
    });
  } catch (error) {
    console.error('ワークフローテストエラー:', error);
    res.status(500).json({ error: 'テスト実行に失敗しました' });
  }
});

// ==================== LINE Bot統合API エンドポイント ====================

// LINE Bot統計情報取得API
app.get('/api/line-bot/stats', authenticateToken, (req, res) => {
  try {
    // デモデータを返す
    const stats = {
      totalAbsenceReports: 5,
      totalSubstituteRequests: 8,
      acceptedSubstitutes: 3,
      declinedSubstitutes: 2
    };
    
    res.json(stats);
  } catch (error) {
    console.error('LINE Bot統計取得エラー:', error);
    res.status(500).json({ error: '統計情報の取得に失敗しました' });
  }
});

// 欠勤報告一覧取得API
app.get('/api/line-bot/absence-reports', authenticateToken, (req, res) => {
  try {
    // デモデータを返す
    const reports = [
      {
        staffId: 'U1234567890',
        staffName: '田中 美咲',
        absenceData: {
          reason: '体調不良',
          date: '2024-01-15',
          time: '10:00-18:00'
        },
        timestamp: new Date().toISOString(),
        status: 'reported'
      },
      {
        staffId: 'U0987654321',
        staffName: '佐藤 健太',
        absenceData: {
          reason: '風邪',
          date: '2024-01-16',
          time: '9:00-17:00'
        },
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'processing'
      }
    ];
    
    res.json(reports);
  } catch (error) {
    console.error('欠勤報告取得エラー:', error);
    res.status(500).json({ error: '欠勤報告の取得に失敗しました' });
  }
});

// 代替出勤依頼一覧取得API
app.get('/api/line-bot/substitute-requests', authenticateToken, (req, res) => {
  try {
    // デモデータを返す
    const requests = [
      {
        staffId: 'U1111111111',
        staffName: '山田 太郎',
        status: 'accepted',
        timestamp: new Date().toISOString()
      },
      {
        staffId: 'U2222222222',
        staffName: '鈴木 花子',
        status: 'declined',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        staffId: 'U3333333333',
        staffName: '高橋 次郎',
        status: 'pending',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    
    res.json(requests);
  } catch (error) {
    console.error('代替出勤依頼取得エラー:', error);
    res.status(500).json({ error: '代替出勤依頼の取得に失敗しました' });
  }
});

// テスト用欠勤報告API
app.post('/api/line-bot/test/absence-report', authenticateToken, (req, res) => {
  try {
    const { staffId, message } = req.body;
    
    if (!staffId || !message) {
      return res.status(400).json({ error: 'スタッフIDとメッセージは必須です' });
    }
    
    // メッセージ解析（簡易版）
    const reason = message.includes('体調不良') ? '体調不良' : 
                   message.includes('風邪') ? '風邪' : 
                   message.includes('熱') ? '発熱' : 'その他';
    
    const date = new Date().toISOString().split('T')[0];
    const time = '10:00-18:00';
    
    console.log('テスト欠勤報告受信:', { staffId, message, reason, date, time });
    
    res.json({
      success: true,
      message: 'テスト欠勤報告が処理されました',
      data: {
        staffId,
        reason,
        date,
        time,
        status: 'reported'
      }
    });
  } catch (error) {
    console.error('テスト欠勤報告エラー:', error);
    res.status(500).json({ error: 'テスト欠勤報告の処理に失敗しました' });
  }
});

// LINE Bot Webhook（スタッフ向け）
app.post('/webhook/bot-a', (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || events.length === 0) {
      return res.status(200).json({ message: 'No events' });
    }
    
    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        const { userId, message } = event;
        const text = message.text;
        
        console.log('LINE Bot A メッセージ受信:', { userId, text });
        
        // メッセージ解析と処理
        if (text.includes('欠勤') || text.includes('休み') || text.includes('体調不良')) {
          console.log('欠勤報告を検出:', { userId, text });
          // 欠勤報告処理
        } else if (text.includes('代わりに出勤') || text.includes('出勤します')) {
          console.log('代替出勤受諾を検出:', { userId, text });
          // 代替出勤受諾処理
        } else if (text.includes('出勤できません') || text.includes('出勤不可')) {
          console.log('代替出勤拒否を検出:', { userId, text });
          // 代替出勤拒否処理
        }
      }
    });
    
    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('LINE Bot Webhook エラー:', error);
    res.status(500).json({ error: 'Webhook処理に失敗しました' });
  }
});

// LINE Bot Webhook（お客様向け）
app.post('/webhook/bot-b', (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || events.length === 0) {
      return res.status(200).json({ message: 'No events' });
    }
    
    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        const { userId, message } = event;
        const text = message.text;
        
        console.log('LINE Bot B メッセージ受信:', { userId, text });
        // お客様向けメッセージ処理
      }
    });
    
    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('LINE Bot B Webhook エラー:', error);
    res.status(500).json({ error: 'Webhook処理に失敗しました' });
  }
});

// 静的ファイルの提供（APIルートの後）
app.use(express.static(path.join(__dirname, 'client/build')));

// 全ルートをReactアプリにリダイレクト（最後）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// エラーハンドリングミドルウェア（最後に配置）
app.use(errorHandler);

// データベース初期化とサーバー起動
initDatabase()
  .then(() => {
    // 自動バックアップ開始
    startAutoBackup();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 カルサク EMRシステムが起動しました`);
      console.log(`📍 ポート: ${PORT}`);
      console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 データベース: ${dbPath}`);
      console.log(`🔒 セキュリティ: 有効`);
      console.log(`📈 レート制限: ${process.env.RATE_LIMIT_MAX || 100} リクエスト/15分`);
      console.log(`💾 自動バックアップ: ${BACKUP_CONFIG.enabled ? '有効' : '無効'}`);
      console.log(`📦 バックアップ保持: ${BACKUP_CONFIG.maxBackups}個`);
      console.log(`\n✨ アクセス: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ データベース初期化エラー:', err);
    process.exit(1);
  });
