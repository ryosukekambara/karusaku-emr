# 📊 カルサクEMRシステム - 完全ドキュメント

**最終更新**: 2025年10月22日 21:00
**最新コミット**: `93def89`
**ステータス**: 🟡 サイドバー問題調査中

---

## 📋 目次

1. [システム概要](#システム概要)
2. [技術スタック](#技術スタック)
3. [ファイル構成](#ファイル構成)
4. [完了している機能](#完了している機能)
5. [未完了・問題のある機能](#未完了問題のある機能)
6. [データベース構造](#データベース構造)
7. [デプロイ環境](#デプロイ環境)
8. [システムフロー](#システムフロー)

---

## 🎯 システム概要

鍼灸院向けの電子カルテ管理システム（EMR）。患者管理、カルテ記録、施術記録、レポート機能を提供。

### 主要機能
- ✅ 認証・権限管理（JWT）
- ✅ 患者管理（CRUD完全実装）
- ✅ カルテ管理（写真添付対応）
- ✅ 施術記録・メニュー管理
- ✅ 施術者管理
- ⚠️ サイドバーUI（現在問題調査中）
- ❌ 予約管理（未実装）
- ❌ LINE連携（未実装）

---

## 🛠 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.2.0 | UIフレームワーク |
| TypeScript | 4.7.4 | 型安全性 |
| React Router | 6.3.0 | ルーティング |
| ~~react-pro-sidebar~~ | ~~1.1.0~~ | ⚠️ 削除済み（カスタム実装に変更） |
| lucide-react | 0.544.0 | アイコン |

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Node.js + Express | 5.1.0 | APIサーバー |
| PostgreSQL | 15 | データベース |
| pg | 8.11.3 | PostgreSQL接続 |
| bcryptjs | 3.0.2 | パスワードハッシュ化 |
| jsonwebtoken | 9.0.2 | JWT認証 |
| cors | 2.8.5 | CORS対応 |
| helmet | 7.0.0 | セキュリティヘッダー |

### インフラ
| サービス | 用途 | URL |
|---------|------|-----|
| Vercel | フロントエンドホスティング | https://karusaku-system.vercel.app |
| Render | バックエンド・DB（無料プラン） | https://karusaku-emr-backend.onrender.com |
| GitHub | ソース管理 | https://github.com/ryosukekambara/karusaku-emr |

---

## 📁 ファイル構成

```
karusaku-emr/
├── .gitignore
├── upload-screenshot.sh           # スクリーンショットアップロードツール
├── screenshots/                   # スクリーンショット保存先
│   └── README.md
│
├── server/                        # バックエンド
│   ├── index.js                   # メインサーバー（Render本番用）
│   ├── api-server.js              # ローカル開発用サーバー
│   ├── database.js                # データベース接続・初期化
│   ├── package.json               # 依存関係
│   └── .env                       # 環境変数（Gitには含まない）
│
└── client/                        # フロントエンド
    ├── package.json               # 依存関係
    │   ├── react: ^18.2.0
    │   ├── typescript: ^4.7.4
    │   ├── react-router-dom: ^6.3.0
    │   └── lucide-react: ^0.544.0
    │
    ├── vercel.json                # Vercel設定
    │
    ├── public/
    │   ├── index.html
    │   └── _redirects            # SPA用リダイレクト
    │
    └── src/
        ├── index.tsx              # エントリーポイント
        ├── App.tsx                # メインコンポーネント
        │   ├── 最新: カスタムサイドバー実装
        │   ├── 行数: ~380行
        │   └── 状態管理: useState, useEffect
        │
        ├── App.css                # グローバルスタイル
        │
        ├── config/
        │   └── api.ts             # API設定
        │       ├── API_BASE_URL: 'https://karusaku-emr-backend.onrender.com'
        │       ├── API_ENDPOINTS: 各種エンドポイント定義
        │       └── getAuthHeaders(): JWT認証ヘッダー生成
        │
        ├── utils/
        │   └── security.ts        # セキュリティ管理
        │       ├── sessionManager: セッション管理
        │       ├── isSessionValid(): セッション有効性チェック
        │       └── shouldAutoLogout(): 自動ログアウト判定
        │
        └── components/            # 機能コンポーネント
            ├── Login.tsx          # ログイン画面
            ├── Dashboard.tsx      # ダッシュボード
            │
            ├── PatientList.tsx    # 患者一覧
            ├── AddPatient.tsx     # 患者登録
            ├── EditPatient.tsx    # 患者編集
            ├── PatientDetail.tsx  # 患者詳細
            │
            ├── MedicalRecordList.tsx   # カルテ一覧
            ├── AddMedicalRecord.tsx    # カルテ作成
            ├── EditMedicalRecord.tsx   # カルテ編集
            │
            ├── TreatmentRecord.tsx     # 施術記録
            ├── MenuManagement.tsx      # 施術メニュー管理
            │
            ├── TherapistList.tsx       # 施術者一覧
            ├── AddTherapist.tsx        # 施術者登録
            ├── EditTherapist.tsx       # 施術者編集
            │
            ├── ReceiptManagement.tsx   # 領収書管理
            ├── Reports.tsx             # レポート機能
            ├── Settings.tsx            # 設定画面
            ├── BackupManagement.tsx    # バックアップ管理
            │
            ├── ClinicManagement.tsx     # 院管理
            ├── EmployeeManagement.tsx   # 従業員管理
            ├── WageCalculation.tsx      # 給与計算
            ├── WorkflowManagement.tsx   # ワークフロー管理
            ├── MessageTemplateEditor.tsx # メッセージテンプレート
            └── LineBotManagement.tsx    # LINE Bot管理
```

---

## ✅ 完了している機能

### 1. 認証システム ✅

**場所**:
- フロントエンド: `client/src/components/Login.tsx`
- API: `server/index.js` (63-100行目)
- セキュリティ: `client/src/utils/security.ts`

**実装内容**:
```javascript
// バックエンド: server/index.js
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0 ||
        !await bcrypt.compare(password, result.rows[0].password)) {
      return res.status(401).json({ error: '認証失敗' });
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラー' });
  }
});
```

**フロー**:
```
1. ユーザーがログイン画面でadmin/admin123を入力
   ↓
2. POST /api/auth/login
   → バックエンドでパスワード検証（bcrypt）
   ↓
3. JWT生成（有効期限24時間）
   ↓
4. トークンをlocalStorageに保存
   ↓
5. ダッシュボードにリダイレクト
```

**テストアカウント**:
- 管理者: `admin` / `admin123`
- スタッフ: `staff` / `staff123`

---

### 2. 患者管理システム ✅

#### A. 患者一覧 (`/patients`)

**場所**: `client/src/components/PatientList.tsx`

**API**: `GET /api/patients`

```javascript
// server/index.js (104-110行目)
app.get('/api/patients', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM patients ORDER BY created_at DESC'
  );
  res.json(result.rows);
});
```

**機能**:
- 全患者表示（テーブル形式）
- 検索・フィルタリング
- 詳細画面への遷移

---

#### B. 患者登録 (`/patients/add`)

**場所**: `client/src/components/AddPatient.tsx`

**API**:
- `GET /api/patients/max-id` - 最大ID取得
- `POST /api/patients` - 患者登録

**フロー**:
```
1. 画面表示時にuseEffectで最大ID取得
   ↓
   GET /api/patients/max-id
   → 現在の最大ID（例: 1233）
   ↓
2. 次のIDを自動表示（1234）
   ↓
3. ユーザーが患者情報を入力
   - 名前、ふりがな
   - 生年月日、性別
   - 電話番号、メールアドレス
   - 住所、緊急連絡先
   - 既往歴、アレルギー
   ↓
4. 登録ボタンクリック
   ↓
   POST /api/patients
   → PostgreSQLに保存
   ↓
5. 患者一覧にリダイレクト
```

**バックエンド実装**:
```javascript
// 最大ID取得
app.get('/api/patients/max-id', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT MAX(id) as max_id FROM patients');
  res.json({ maxId: result.rows[0].max_id || 0 });
});

// 患者登録
app.post('/api/patients', authenticateToken, async (req, res) => {
  const { name, kana, birth_date, gender, phone, email,
          address, emergency_contact, medical_history, allergies } = req.body;

  const result = await pool.query(
    `INSERT INTO patients (name, kana, birth_date, gender, phone, email,
                           address, emergency_contact, medical_history, allergies)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [name, kana, birth_date, gender, phone, email,
     address, emergency_contact, medical_history, allergies]
  );

  res.json({ id: result.rows[0].id, message: '登録成功' });
});
```

---

#### C. 患者詳細 (`/patients/:id`)

**場所**: `client/src/components/PatientDetail.tsx`

**API**: `GET /api/patients/:id`

**機能**:
- 患者基本情報表示
- カルテ履歴一覧
- 編集・削除機能

---

#### D. 患者編集 (`/patients/:id/edit`)

**場所**: `client/src/components/EditPatient.tsx`

**API**: `PUT /api/patients/:id`

---

### 3. カルテ管理システム ✅

#### A. カルテ一覧 (`/medical-records`)

**場所**: `client/src/components/MedicalRecordList.tsx`

**API**: `GET /api/medical-records`

```javascript
// server/index.js (151-167行目)
app.get('/api/medical-records', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT mr.*, p.name as patient_name, u.name as staff_name
    FROM medical_records mr
    JOIN patients p ON mr.patient_id = p.id
    JOIN users u ON mr.staff_id = u.id
    ORDER BY mr.treatment_date DESC
  `);
  res.json(result.rows);
});
```

**機能**:
- 全カルテ表示（患者名・施術者名付き）
- 日付順ソート
- 検索・フィルタリング

---

#### B. カルテ作成 (`/patients/:id/records/add`)

**場所**: `client/src/components/AddMedicalRecord.tsx`

**API**: `POST /api/medical-records`

**機能**:
- 施術内容入力
- 症状・診断記録
- 写真添付（Base64形式）
- 所見・次回予定

**フロー**:
```
1. 患者詳細画面から「カルテ作成」
   ↓
2. 施術情報入力
   - 施術日
   - 施術種類
   - 症状・診断
   - 施術内容
   - 備考
   ↓
3. 写真添付（任意）
   → ファイル選択
   → Base64変換
   → 最大サイズ: 約2MB
   ↓
4. 登録実行
   ↓
   POST /api/medical-records
   → PostgreSQLに保存
   ↓
5. 患者詳細画面に戻る
```

⚠️ **注意**: 写真はBase64形式でPostgreSQLに直接保存（1枚約2MB）

---

#### C. カルテ編集 (`/medical-records/:id/edit`)

**場所**: `client/src/components/EditMedicalRecord.tsx`

**API**: `PUT /api/medical-records/:id`

---

### 4. 施術記録システム ✅

**場所**: `client/src/components/TreatmentRecord.tsx`

**機能**:
- 施術メニュー選択
- 施術時間記録
- 施術者選択
- 料金自動計算

---

### 5. 施術メニュー管理 ✅

**場所**: `client/src/components/MenuManagement.tsx`

**機能**:
- メニューCRUD
- 料金設定
- カテゴリ管理
- 施術時間設定

---

### 6. 施術者管理 ✅

**場所**:
- 一覧: `client/src/components/TherapistList.tsx`
- 登録: `client/src/components/AddTherapist.tsx`
- 編集: `client/src/components/EditTherapist.tsx`

**機能**:
- 施術者登録
- スキル・資格管理
- 勤務状況管理

---

## ❌ 未完了・問題のある機能

### 1. サイドバーUI問題 🔴 **最優先・緊急**

**現在の状況**: 2025/10/22 21:00時点

#### 問題

1. ✅ **コード**: 最新版に更新済み（`93def89`）
   - `if (!sidebarOpen) return null;` 実装済み
   - react-pro-sidebar完全削除
   - カスタムサイドバー実装

2. ✅ **GitHub**: 正しいコードがコミット済み

3. ✅ **Vercel**: 最新コードをビルド済み
   - ビルドファイル: `main.29d22dc6.js`
   - キャッシュクリア済み

4. ❌ **ブラウザ**: 古いファイルを読み込んでいる
   - 読み込み中: `main.a0be573d.js`（古い）
   - 期待: `main.29d22dc6.js`（新しい）

#### 確認済みの事実

```javascript
// ブラウザコンソールでの確認結果
const sidebar = document.querySelector('.sidebar');
// → Sidebar exists: true
// → Sidebar HTML: <aside data-testid="ps-sidebar-root-test-id" ... class="ps-sidebar-root ps-broken sidebar"

// これはreact-pro-sidebarのHTML（古い）
// 新しいコードでは<div>を使うはず
```

#### 原因仮説

1. **index.htmlが古い**: Vercelのデプロイでindex.htmlが更新されていない
2. **複数のドメイン**: 別のドメインが古いままデプロイされている
3. **Vercelのルーティング問題**: SPAのルーティング設定が影響

#### 次に確認すべきこと

1. `https://karusaku-system.vercel.app` のHTML直接確認
2. `https://karusaku-system.vercel.app/static/js/main.29d22dc6.js` が存在するか
3. Vercelの他のドメイン設定確認

---

### 2. 予約管理システム 🟡 **未実装**

**優先度**: 高

**必要なテーブル**:
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  therapist_id INTEGER REFERENCES therapists(id),
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**必要な機能**:
- 予約カレンダー表示
- 予約作成・編集・キャンセル
- 施術者別スケジュール
- 空き時間検索

---

### 3. データベース容量問題 🟡

**現状**:
- 写真1枚: 約2MB（Base64形式）
- DB容量制限: 1GB（Render無料プラン）
- 限界: 約500枚

**解決策**:
1. 画像圧縮（sharp使用）
2. 外部ストレージ（S3、Cloudinary）
3. 有料プラン

---

### 4. サービススリープ問題 🟠

**問題**: 15分アクセスなしでスリープ
- 起動に30秒-1分かかる
- 訪問先での初回アクセスが遅い

**解決策**: UptimeRobot設定
- 監視URL: `https://karusaku-emr-backend.onrender.com/api/health`
- 間隔: 5分

---

### 5. LINE連携 🟢 **未実装**

**優先度**: 低

**必要な機能**:
- 予約通知
- リマインダー送信
- 自動応答

---

## 🗄️ データベース構造

### ERD概要

```
users (ユーザー・施術者)
  ↓ staff_id
medical_records (カルテ) ← patient_id ← patients (患者)
```

### usersテーブル（認証用）

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,      -- bcryptハッシュ
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,           -- 'master' or 'staff'
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### patientsテーブル（患者情報）

```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  kana VARCHAR(255),
  birth_date DATE,
  gender VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  emergency_contact VARCHAR(255),
  medical_history TEXT,
  allergies TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### medical_recordsテーブル（カルテ）

```sql
CREATE TABLE medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  staff_id INTEGER REFERENCES users(id),
  treatment_date DATE NOT NULL,
  treatment_type VARCHAR(100),
  symptoms TEXT,
  diagnosis TEXT,
  treatment_content TEXT,
  notes TEXT,
  photo TEXT,                          -- Base64形式（約2MB/枚）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 デプロイ環境

### フロントエンド（Vercel）

| 項目 | 値 |
|------|-----|
| URL | https://karusaku-system.vercel.app |
| ビルドコマンド | `npm run build` |
| 出力ディレクトリ | `build` |
| フレームワーク | create-react-app |
| Node.js | 18.x |
| 自動デプロイ | mainブランチへのpush時 |

**最新デプロイ**:
- コミット: `93def89`
- 時刻: 2025/10/22 21:08
- ビルド時間: 46秒
- ビルドファイル: `main.29d22dc6.js`
- ステータス: ✅ Ready

### バックエンド（Render）

| 項目 | 値 |
|------|-----|
| URL | https://karusaku-emr-backend.onrender.com |
| タイプ | Web Service |
| ビルドコマンド | `npm install` |
| 起動コマンド | `node index.js` |
| プラン | Free |
| リージョン | Oregon (US West) |
| スリープ | 15分無通信で自動スリープ |

### データベース（Render PostgreSQL）

| 項目 | 値 |
|------|-----|
| タイプ | PostgreSQL 15 |
| プラン | Free |
| 容量 | 1GB |
| バックアップ | なし（無料プラン） |
| 接続方式 | 環境変数（DATABASE_URL） |

---

## 🔄 システムフロー

### 全体アーキテクチャ

```
[ブラウザ]
    ↓ HTTPS
[Vercel - React SPA]
    ↓ API呼び出し（JWT付き）
[Render - Express API]
    ↓ SQL
[Render - PostgreSQL]
```

### 認証フロー（完了）✅

```
1. ユーザーがログイン画面でadmin/admin123を入力
   Location: client/src/components/Login.tsx
   ↓
2. フロントエンドがAPIコール
   POST https://karusaku-emr-backend.onrender.com/api/auth/login
   Body: { username: "admin", password: "admin123" }
   ↓
3. バックエンドで認証処理
   Location: server/index.js (63-100行目)
   - ユーザー検索: SELECT * FROM users WHERE username = $1
   - パスワード検証: bcrypt.compare(password, hash)
   ↓
4. JWT生成
   jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '24h' })
   ↓
5. トークン返却
   Response: { token: "eyJhbGc...", user: { username, name, role } }
   ↓
6. フロントエンドで保存
   localStorage.setItem('token', data.token)
   localStorage.setItem('user', JSON.stringify(data.user))
   ↓
7. ダッシュボードにリダイレクト
   navigate('/dashboard')
```

### 患者登録フロー（完了）✅

```
1. ダッシュボードから「新規患者登録」をクリック
   Location: client/src/components/Dashboard.tsx
   ↓
2. 患者登録画面表示
   Location: client/src/components/AddPatient.tsx
   URL: /patients/add
   ↓
3. useEffectで最大ID取得
   GET /api/patients/max-id
   Header: Authorization: Bearer <token>
   ↓
4. バックエンドで最大ID取得
   Location: server/index.js (119-123行目)
   Query: SELECT MAX(id) as max_id FROM patients
   Response: { maxId: 1233 }
   ↓
5. 次のIDを画面に表示
   State: suggestedId = "1234"
   Display: "患者ID: 自動 1234"
   ↓
6. ユーザーが情報入力
   - 名前: "山田太郎"
   - ふりがな: "やまだたろう"
   - 生年月日: "1980-01-01"
   - 性別: "男性"
   - 電話番号: "090-1234-5678"
   - メールアドレス: "yamada@example.com"
   - 住所: "東京都..."
   - 緊急連絡先: "090-9876-5432"
   - 既往歴: "高血圧"
   - アレルギー: "なし"
   ↓
7. 登録ボタンクリック
   ↓
8. バリデーション
   - 必須項目チェック（名前、生年月日、電話番号）
   - 形式チェック（メールアドレス、電話番号）
   ↓
9. APIコール
   POST /api/patients
   Header: Authorization: Bearer <token>
   Body: { name, kana, birth_date, ... }
   ↓
10. バックエンドで登録処理
    Location: server/index.js (125-147行目)
    Query: INSERT INTO patients (...) VALUES (...) RETURNING id
    ↓
11. 登録完了
    Response: { id: 1234, message: "患者が正常に登録されました" }
    ↓
12. 患者一覧にリダイレクト
    navigate('/patients')
```

### カルテ作成フロー（完了）✅

```
1. 患者詳細画面から「カルテ作成」をクリック
   Location: client/src/components/PatientDetail.tsx
   ↓
2. カルテ作成画面表示
   Location: client/src/components/AddMedicalRecord.tsx
   URL: /patients/:id/records/add
   ↓
3. useEffectで患者情報取得
   GET /api/patients/:id
   Header: Authorization: Bearer <token>
   ↓
4. 患者情報表示
   Display: "患者: 山田太郎 (ID: 1234)"
   ↓
5. ユーザーが施術情報入力
   - 施術日: "2025-10-22"
   - 施術種類: "鍼治療"
   - 症状: "肩こり、頭痛"
   - 診断: "頸肩腕症候群"
   - 施術内容: "肩井、天柱、風池に刺鍼"
   - 備考: "次回は1週間後"
   ↓
6. 写真添付（任意）
   - ファイル選択
   - プレビュー表示
   - Base64変換（約2MB）
   ↓
7. 登録ボタンクリック
   ↓
8. APIコール
   POST /api/medical-records
   Header: Authorization: Bearer <token>
   Body: {
     patient_id: 1234,
     staff_id: 1,  // ログイン中のユーザー
     treatment_date: "2025-10-22",
     treatment_type: "鍼治療",
     symptoms: "肩こり、頭痛",
     diagnosis: "頸肩腕症候群",
     treatment_content: "肩井、天柱、風池に刺鍼",
     notes: "次回は1週間後",
     photo: "data:image/jpeg;base64,/9j/4AAQ..."  // Base64
   }
   ↓
9. バックエンドで登録処理
   Location: server/index.js (151-180行目付近)
   Query: INSERT INTO medical_records (...) VALUES (...) RETURNING id
   ↓
10. 登録完了
    Response: { id: 5678, message: "カルテが正常に作成されました" }
    ↓
11. 患者詳細画面に戻る
    navigate(`/patients/${patientId}`)
```

### API認証フロー（全APIで共通）✅

```
1. フロントエンドからAPIコール
   Header: Authorization: Bearer eyJhbGc...
   ↓
2. バックエンドのミドルウェア
   Location: server/index.js (authenticateToken関数)
   ↓
3. トークン検証
   - Header確認: Authorization存在チェック
   - トークン抽出: Bearer <token>からtokenを取得
   - JWT検証: jwt.verify(token, JWT_SECRET)
   ↓
4. 検証結果
   OK: req.user = { id, username, role }
   NG: res.status(401).json({ error: '認証が必要です' })
   ↓
5. ハンドラー実行
   - req.userからユーザー情報取得
   - ロール確認（必要に応じて）
   - DB処理
   - レスポンス返却
```

### 画面遷移フロー

```
/login (ログイン画面)
  → ログイン成功
  ↓
/dashboard (ダッシュボード)
  ├→ 患者管理
  │  ├→ /patients (患者一覧)
  │  │  ├→ /patients/add (患者登録)
  │  │  └→ /patients/:id (患者詳細)
  │  │     ├→ /patients/:id/edit (患者編集)
  │  │     ├→ /patients/:id/records/add (カルテ作成)
  │  │     └→ /patients/:id/treatment (施術記録)
  │  │
  │  └→ /medical-records (カルテ一覧)
  │     └→ /medical-records/:id/edit (カルテ編集)
  │
  ├→ 施術管理
  │  ├→ /menu-management (施術メニュー管理)
  │  └→ /therapists (施術者管理)
  │     ├→ /therapists/add (施術者登録)
  │     └→ /therapists/edit/:id (施術者編集)
  │
  ├→ 管理機能（マスターのみ）
  │  ├→ /receipts (領収書管理)
  │  ├→ /employees (従業員管理)
  │  ├→ /wage-calculation (給与計算)
  │  ├→ /workflow (ワークフロー管理)
  │  ├→ /message-editor (メッセージテンプレート)
  │  ├→ /line-bot (LINE Bot管理)
  │  ├→ /backup (バックアップ管理)
  │  ├→ /reports (レポート)
  │  └→ /settings (設定)
  │
  └→ /logout (ログアウト)
```

---

## 📝 開発メモ

### 最近の変更履歴

| 日時 | コミット | 変更内容 |
|------|---------|---------|
| 2025/10/22 21:08 | 93def89 | PR#5マージ: react-pro-sidebar削除 |
| 2025/10/22 18:00 | 0259075 | package.jsonからreact-pro-sidebar削除 |
| 2025/10/22 17:00 | 9762ee9 | カスタムサイドバー実装 |
| 2025/10/22 16:00 | eea0951 | z-index調整 |

### 既知の問題

1. **サイドバー表示問題** (2025/10/22 21:00)
   - 症状: ブラウザが古いJSファイルを読み込んでいる
   - 影響: サイドバーが常に表示される
   - 調査中

2. **画像容量問題**
   - Base64形式で約2MB/枚
   - DB容量1GBで約500枚が限界
   - 解決策: 画像圧縮またはS3移行

3. **スリープ問題**
   - 15分無通信でスリープ
   - 解決策: UptimeRobot導入

---

## 🔧 開発環境セットアップ

### フロントエンド

```bash
cd ~/Projects/myapp/client
npm install
npm start  # http://localhost:3000
```

### バックエンド

```bash
cd ~/Projects/myapp/server
npm install

# .envファイル作成
echo "DATABASE_URL=postgresql://user:pass@host:5432/db" > .env
echo "JWT_SECRET=your-secret-key" >> .env

node api-server.js  # http://localhost:5000
```

### デプロイ

```bash
# GitHubにプッシュするだけで自動デプロイ
git add .
git commit -m "feat: 新機能追加"
git push origin main

# Vercelが自動的にビルド・デプロイ
# Renderもmainブランチの変更を検知して自動デプロイ
```

---

## 📞 サポート

### リポジトリ
https://github.com/ryosukekambara/karusaku-emr

### 開発者
Ryosuke Kambara

### ライセンス
Private

---

**最終更新**: 2025年10月22日 21:00
