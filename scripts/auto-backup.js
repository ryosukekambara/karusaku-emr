#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('cron');

class AutoBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.dbPath = path.join(__dirname, '../server/medical_records.db');
    this.ensureBackupDirectory();
  }
  
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
  
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `medical_records_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      this.log('🔄 バックアップ作成開始');
      
      // データベースファイルをコピー
      fs.copyFileSync(this.dbPath, backupPath);
      
      // バックアップファイルのサイズを確認
      const stats = fs.statSync(backupPath);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      this.log(`✅ バックアップ作成完了: ${backupFileName}`);
      this.log(`📊 ファイルサイズ: ${fileSizeKB} KB`);
      
      // 古いバックアップを削除（30日以上古いもの）
      await this.cleanOldBackups();
      
      return {
        success: true,
        fileName: backupFileName,
        fileSize: fileSizeKB,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`❌ バックアップ作成エラー: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('medical_records_backup_') && file.endsWith('.db')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            deletedCount++;
            this.log(`🗑️  古いバックアップを削除: ${file}`);
          }
        }
      }
      
      if (deletedCount > 0) {
        this.log(`🧹 ${deletedCount}個の古いバックアップを削除しました`);
      }
      
    } catch (error) {
      this.log(`❌ 古いバックアップ削除エラー: ${error.message}`);
    }
  }
  
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.startsWith('medical_records_backup_') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            size: Math.round(stats.size / 1024),
            created: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      this.log('📋 バックアップ一覧:');
      backups.forEach((backup, index) => {
        this.log(`   ${index + 1}. ${backup.fileName} (${backup.size} KB) - ${backup.created}`);
      });
      
      return backups;
      
    } catch (error) {
      this.log(`❌ バックアップ一覧取得エラー: ${error.message}`);
      return [];
    }
  }
  
  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`バックアップファイルが見つかりません: ${backupFileName}`);
      }
      
      this.log(`🔄 バックアップ復元開始: ${backupFileName}`);
      
      // 現在のデータベースをバックアップ
      const currentBackup = `current_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      fs.copyFileSync(this.dbPath, path.join(this.backupDir, currentBackup));
      
      // バックアップファイルを復元
      fs.copyFileSync(backupPath, this.dbPath);
      
      this.log(`✅ バックアップ復元完了: ${backupFileName}`);
      this.log(`💾 現在のデータベースは ${currentBackup} として保存されました`);
      
      return {
        success: true,
        restoredFile: backupFileName,
        currentBackup: currentBackup
      };
      
    } catch (error) {
      this.log(`❌ バックアップ復元エラー: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  startScheduledBackup() {
    // 毎日午前2時にバックアップを実行
    const job = new cron.CronJob('0 2 * * *', async () => {
      this.log('⏰ スケジュールバックアップ開始');
      await this.createBackup();
    }, null, true, 'Asia/Tokyo');
    
    this.log('⏰ 自動バックアップスケジュール開始 (毎日午前2時)');
    return job;
  }
}

// コマンドライン引数の処理
async function main() {
  const backup = new AutoBackup();
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      await backup.createBackup();
      break;
      
    case 'list':
      await backup.listBackups();
      break;
      
    case 'restore':
      const fileName = process.argv[3];
      if (!fileName) {
        console.log('❌ 復元するファイル名を指定してください');
        console.log('使用法: node auto-backup.js restore <ファイル名>');
        process.exit(1);
      }
      await backup.restoreBackup(fileName);
      break;
      
    case 'schedule':
      backup.startScheduledBackup();
      console.log('⏰ スケジュールバックアップが開始されました');
      console.log('終了するには Ctrl+C を押してください');
      break;
      
    default:
      console.log('📋 自動バックアップシステム');
      console.log('');
      console.log('使用法:');
      console.log('  node auto-backup.js create    - バックアップ作成');
      console.log('  node auto-backup.js list      - バックアップ一覧表示');
      console.log('  node auto-backup.js restore <ファイル名> - バックアップ復元');
      console.log('  node auto-backup.js schedule  - スケジュールバックアップ開始');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AutoBackup;
