# 🏗️ カルサク EMRシステム アーキテクチャ詳細

## 🎯 **マルチテナント構成**

### 📊 **データベース設計**

#### **単一データベース・マルチテナント**
```
medical_records.db
├── clinics (クリニック情報)
│   ├── id (主キー)
│   ├── name (クリニック名)
│   ├── address (住所)
│   ├── phone (電話番号)
│   ├── email (メールアドレス)
│   ├── subscription_plan (契約プラン)
│   ├── max_patients (最大患者数)
│   ├── created_at (作成日時)
│   └── status (ステータス)
│
├── users (ユーザー情報)
│   ├── id (主キー)
│   ├── clinic_id (外部キー)
│   ├── username (ユーザー名)
│   ├── password (パスワード)
│   ├── role (役割)
│   ├── created_at (作成日時)
│   └── last_login (最終ログイン)
│
├── patients (患者情報)
│   ├── id (主キー)
│   ├── clinic_id (外部キー)
│   ├── name (患者名)
│   ├── date_of_birth (生年月日)
│   ├── gender (性別)
│   ├── phone (電話番号)
│   ├── email (メールアドレス)
│   ├── address (住所)
│   ├── is_new_patient (新規患者フラグ)
│   ├── created_at (作成日時)
│   └── updated_at (更新日時)
│
├── therapists (施術者情報)
│   ├── id (主キー)
│   ├── clinic_id (外部キー)
│   ├── name (施術者名)
│   ├── license_number (資格番号)
│   ├── specialty (専門分野)
│   ├── phone (電話番号)
│   ├── email (メールアドレス)
│   ├── status (ステータス)
│   ├── created_at (作成日時)
│   └── updated_at (更新日時)
│
├── medical_records (診療記録)
│   ├── id (主キー)
│   ├── clinic_id (外部キー)
│   ├── patient_id (外部キー)
│   ├── therapist_id (外部キー)
│   ├── visit_date (診療日)
│   ├── symptoms (症状)
│   ├── diagnosis (診断)
│   ├── treatment (治療)
│   ├── prescription (処方)
│   ├── notes (備考)
│   ├── created_at (作成日時)
│   └── updated_at (更新日時)
│
└── appointments (予約情報)
    ├── id (主キー)
    ├── clinic_id (外部キー)
    ├── patient_id (外部キー)
    ├── therapist_id (外部キー)
    ├── appointment_date (予約日時)
    ├── duration_minutes (時間)
    ├── status (ステータス)
    ├── notes (備考)
    ├── created_at (作成日時)
    └── updated_at (更新日時)
```

## 📈 **スケーラビリティ分析**

### 🏥 **クリニック規模別想定**

#### **小規模クリニック（1-3施術者）**
```
患者数: 50-100名
├── 月間診療記録: 200-400件
├── 同時接続: 5-10接続
├── データ容量: 100MB-200MB
└── 対象: 個人クリニック、小規模整体院
```

#### **中規模クリニック（3-8施術者）**
```
患者数: 100-300名
├── 月間診療記録: 400-1,200件
├── 同時接続: 10-20接続
├── データ容量: 200MB-600MB
└── 対象: 中規模整体院、リハビリ施設
```

#### **大規模クリニック（8-15施術者）**
```
患者数: 300-500名
├── 月間診療記録: 1,200-2,000件
├── 同時接続: 20-30接続
├── データ容量: 600MB-1GB
└── 対象: 大規模整体院、医療法人
```

### 💾 **データ容量予測**

#### **フェーズ別データ容量**
```
フェーズ1 (10クリニック):
├── 平均患者数: 150名/クリニック
├── 総患者数: 1,500名
├── 月間診療記録: 6,000件
├── データ容量: 500MB
└── 年間増加: 100MB

フェーズ2 (50クリニック):
├── 平均患者数: 150名/クリニック
├── 総患者数: 7,500名
├── 月間診療記録: 30,000件
├── データ容量: 2.5GB
└── 年間増加: 500MB

フェーズ3 (100クリニック):
├── 平均患者数: 150名/クリニック
├── 総患者数: 15,000名
├── 月間診療記録: 60,000件
├── データ容量: 5GB
└── 年間増加: 1GB
```

## 🔧 **技術的実装**

### 🛡️ **データ分離（セキュリティ）**

#### **クリニック間データ分離**
```javascript
// ミドルウェア: クリニックID検証
const verifyClinicAccess = (req, res, next) => {
  const userClinicId = req.user.clinic_id;
  const requestedClinicId = req.params.clinicId || req.body.clinic_id;
  
  if (userClinicId !== requestedClinicId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// クエリ: クリニックIDフィルタリング
const getPatientsByClinic = (clinicId) => {
  return db.all(
    "SELECT * FROM patients WHERE clinic_id = ? ORDER BY created_at DESC",
    [clinicId]
  );
};
```

### 📊 **パフォーマンス最適化**

#### **インデックス設計**
```sql
-- クリニックIDインデックス
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_therapists_clinic_id ON therapists(clinic_id);
CREATE INDEX idx_medical_records_clinic_id ON medical_records(clinic_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);

-- 複合インデックス
CREATE INDEX idx_medical_records_clinic_patient ON medical_records(clinic_id, patient_id);
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, appointment_date);
```

### 🔄 **バックアップ戦略**

#### **クリニック別バックアップ**
```bash
#!/bin/bash
# クリニック別差分バックアップ

for clinic_id in $(sqlite3 medical_records.db "SELECT id FROM clinics"); do
  # クリニック別データ抽出
  sqlite3 medical_records.db ".dump" | grep "clinic_id = $clinic_id" > backup_clinic_${clinic_id}_$(date +%Y%m%d).sql
  
  # 圧縮
  gzip backup_clinic_${clinic_id}_$(date +%Y%m%d).sql
done
```

## 💰 **料金プラン詳細**

### 📋 **プラン別制限**

#### **スタータープラン: ¥5,500/月**
```
患者数: 100名まで
├── 施術者数: 3名まで
├── 月間診療記録: 500件まで
├── バックアップ: 日次
├── サポート: メールサポート
└── 対象: 小規模クリニック
```

#### **プロプラン: ¥15,000/月**
```
患者数: 500名まで
├── 施術者数: 10名まで
├── 月間診療記録: 2,000件まで
├── バックアップ: 日次 + 週次
├── サポート: 電話サポート
└── 対象: 中規模クリニック
```

#### **エンタープライズ: ¥30,000/月**
```
患者数: 無制限
├── 施術者数: 無制限
├── 月間診療記録: 無制限
├── バックアップ: 日次 + 週次 + 月次
├── サポート: 専任サポート
└── 対象: 大規模クリニック
```

## 🎯 **結論**

### ✅ **単一データベース・マルチテナント**
- **1つのSQLiteファイル**で全クリニックのデータを管理
- **クリニックID**でデータを分離
- **段階的拡張**でVPSリソースを増強

### 📊 **想定規模**
- **10クリニック**: 1,500患者（平均150名/クリニック）
- **50クリニック**: 7,500患者
- **100クリニック**: 15,000患者

### 💡 **メリット**
- **管理コスト**: 単一データベースで管理が簡単
- **スケーラビリティ**: 段階的にリソース拡張
- **コスト効率**: 初期投資を最小限に抑制
- **データ統合**: 将来的な分析・レポートが容易

**加盟者に迷惑をかけない、効率的なマルチテナント構成で持続可能なビジネスを構築できます！**


