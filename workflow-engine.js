const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const axios = require('axios');

class WorkflowEngine {
  constructor() {
    this.config = {
      gmail: {
        enabled: process.env.GMAIL_ENABLED === 'true',
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        user: process.env.GMAIL_USER
      },
      slack: {
        enabled: process.env.SLACK_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#general'
      },
      notion: {
        enabled: process.env.NOTION_ENABLED === 'true',
        apiKey: process.env.NOTION_API_KEY,
        databaseId: process.env.NOTION_DATABASE_ID
      },
      autoNotification: process.env.AUTO_NOTIFICATION === 'true',
      notificationInterval: parseInt(process.env.NOTIFICATION_INTERVAL) || 5
    };
    
    this.messageTemplates = {
      absence_notification: `【サポート窓口｜HAL】当日欠勤報告

👤 スタッフ: {{staff_name}}
📅 欠勤日: {{absence_date}}
🕒 時間: {{absence_time}}
💊 理由: {{absence_reason}}
⏰ 報告時刻: {{report_time}}`,

      emergency_notification: `【緊急】{{staff_name}}さん欠勤報告

📋 詳細情報:
- 欠勤日時: {{absence_date}} {{absence_time}}
- 欠勤理由: {{absence_reason}}
- 報告時刻: {{report_time}}
- スタッフ電話: {{staff_phone}}

⚡ 次の対応を実行中:
✅ 代替スタッフ募集開始
✅ 影響予約の確認
✅ 顧客への連絡準備

管理者による確認が必要です。
管理画面: {{management_url}}`,

      general_notification: `【{{salon_name}}】お知らせ

{{notification_content}}

詳細は管理画面をご確認ください。
{{management_url}}`
    };

    this.salonSettings = {
      salon_name: 'カルサクサロン',
      phone: '03-1234-5678',
      business_hours: '10:00-19:00',
      manager_line_id: '',
      substitute_allowance: 5000,
      management_url: 'https://karusaku-salon.com/admin'
    };
  }

  // ワークフロー実行メイン関数
  async executeWorkflow(emailData) {
    try {
      console.log('🔄 ワークフロー実行開始:', emailData);
      
      const results = {
        gmail: null,
        slack: null,
        notion: null,
        success: true,
        errors: []
      };

      // 1. Gmail処理
      if (this.config.gmail.enabled) {
        try {
          results.gmail = await this.processGmail(emailData);
          console.log('✅ Gmail処理完了');
        } catch (error) {
          console.error('❌ Gmail処理エラー:', error);
          results.errors.push({ service: 'gmail', error: error.message });
        }
      }

      // 2. Slack通知
      if (this.config.slack.enabled) {
        try {
          results.slack = await this.sendSlackNotification(emailData);
          console.log('✅ Slack通知完了');
    } catch (error) {
          console.error('❌ Slack通知エラー:', error);
          results.errors.push({ service: 'slack', error: error.message });
        }
      }

      // 3. Notion記録
      if (this.config.notion.enabled) {
        try {
          results.notion = await this.recordToNotion(emailData);
          console.log('✅ Notion記録完了');
        } catch (error) {
          console.error('❌ Notion記録エラー:', error);
          results.errors.push({ service: 'notion', error: error.message });
        }
      }

      // エラーがある場合はsuccessをfalseに
      if (results.errors.length > 0) {
        results.success = false;
      }

      console.log('🎉 ワークフロー実行完了:', results);
      return results;

    } catch (error) {
      console.error('💥 ワークフロー実行エラー:', error);
      return { 
        success: false,
        error: error.message,
        errors: [{ service: 'workflow', error: error.message }]
      };
    }
  }

  // Gmail処理
  async processGmail(emailData) {
    if (!this.config.gmail.enabled) {
      throw new Error('Gmail機能が無効です');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.config.gmail.clientId,
      this.config.gmail.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: this.config.gmail.refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // メール解析・処理ロジック
    const processedData = this.parseEmailData(emailData);
    
    return {
      processed: true,
      data: processedData,
          timestamp: new Date().toISOString()
    };
  }

  // Slack通知送信
  async sendSlackNotification(emailData) {
    if (!this.config.slack.enabled) {
      throw new Error('Slack機能が無効です');
    }

    const processedData = this.parseEmailData(emailData);
    const message = this.formatSlackMessage(processedData);

    const response = await axios.post(this.config.slack.webhookUrl, {
      channel: this.config.slack.channel,
      text: message,
      username: 'カルサク欠勤管理Bot',
      icon_emoji: ':hospital:'
    });

        return { 
      sent: true,
      message: message,
      timestamp: new Date().toISOString(),
      response: response.data
    };
  }

  // Notion記録
  async recordToNotion(emailData) {
    if (!this.config.notion.enabled) {
      throw new Error('Notion機能が無効です');
    }

    const processedData = this.parseEmailData(emailData);
    
    const notionData = {
        parent: { database_id: this.config.notion.databaseId },
        properties: {
        'スタッフ名': {
          title: [{ text: { content: processedData.staff_name } }]
        },
        '欠勤日': {
          date: { start: processedData.absence_date }
        },
        '欠勤時間': {
          rich_text: [{ text: { content: processedData.absence_time } }]
        },
        '理由': {
          rich_text: [{ text: { content: processedData.absence_reason } }]
        },
        '報告時刻': {
          date: { start: new Date().toISOString() }
          },
          'ステータス': {
          select: { name: '処理中' }
        }
      }
    };

    const response = await axios.post('https://api.notion.com/v1/pages', notionData, {
        headers: {
          'Authorization': `Bearer ${this.config.notion.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        }
      });

      return { 
      recorded: true,
      pageId: response.data.id,
      timestamp: new Date().toISOString()
    };
  }

  // メールデータ解析
  parseEmailData(emailData) {
    // 実際のメールデータから必要な情報を抽出
    // ここではサンプルデータを返す
    return {
      staff_name: emailData.staff_name || '田中 美咲',
      absence_date: emailData.absence_date || new Date().toISOString().split('T')[0],
      absence_time: emailData.absence_time || '10:00-18:00',
      absence_reason: emailData.absence_reason || '体調不良',
      staff_phone: emailData.staff_phone || '090-1234-5678',
      report_time: emailData.report_time || new Date().toLocaleTimeString('ja-JP'),
      salon_name: this.salonSettings.salon_name,
      management_url: this.salonSettings.management_url
    };
  }

  // Slackメッセージフォーマット
  formatSlackMessage(data) {
    return `🚨 *緊急欠勤報告*

👤 *スタッフ:* ${data.staff_name}
📅 *欠勤日:* ${data.absence_date}
🕒 *時間:* ${data.absence_time}
💊 *理由:* ${data.absence_reason}
⏰ *報告時刻:* ${data.report_time}

🔄 代替スタッフ手配中...
管理画面: ${data.management_url}`;
  }

  // テストワークフロー実行
  async testWorkflow() {
    const testData = {
      staff_name: 'テスト スタッフ',
      absence_date: new Date().toISOString().split('T')[0],
      absence_time: '10:00-18:00',
      absence_reason: 'テスト用欠勤報告',
      staff_phone: '090-0000-0000',
      report_time: new Date().toLocaleTimeString('ja-JP')
    };

    console.log('🧪 テストワークフロー実行:', testData);
    return await this.executeWorkflow(testData);
  }

  // 設定取得
  getConfig() {
    return {
      ...this.config,
      messageTemplates: this.messageTemplates,
      salonSettings: this.salonSettings
    };
  }

  // 設定更新
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  // メッセージテンプレート更新
  updateMessageTemplate(templateId, content) {
    if (this.messageTemplates[templateId]) {
      this.messageTemplates[templateId] = content;
      return { success: true, templateId, content };
    }
    throw new Error(`テンプレート ${templateId} が見つかりません`);
  }

  // サロン設定更新
  updateSalonSettings(settings) {
    this.salonSettings = { ...this.salonSettings, ...settings };
    return this.salonSettings;
  }

  // メッセージテンプレート取得
  getMessageTemplates() {
    return this.messageTemplates;
  }

  // サロン設定取得
  getSalonSettings() {
    return this.salonSettings;
  }

  // 変数置換
  replaceVariables(template, data) {
    let message = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, value);
    });
    return message;
  }

  // ワークフロー統計取得
  getWorkflowStats() {
    return {
      totalExecutions: 0, // 実際の実装ではデータベースから取得
      successRate: 0,
      lastExecution: null,
      services: {
        gmail: { enabled: this.config.gmail.enabled, lastUsed: null },
        slack: { enabled: this.config.slack.enabled, lastUsed: null },
        notion: { enabled: this.config.notion.enabled, lastUsed: null }
      }
    };
  }
}

module.exports = WorkflowEngine;