const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();

// CORS設定
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// データベース初期化
const dbPath = process.env.SQLITE_PATH || './medical_records.db';
const db = new sqlite3.Database(dbPath);

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

// ログインAPI
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = COMPANY_USERS[username];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const token = jwt.sign(
      { 
        username, 
        role: user.role, 
        name: user.name,
        department: user.department 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// 基本的なAPIエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'カルサク EMRシステム API' });
});

// Vercel用のエクスポート
module.exports = app;
