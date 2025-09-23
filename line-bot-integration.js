const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const crypto = require('crypto');

class LineBotIntegration {
  constructor() {
    this.config = {
      // LINE Bot A (スタッフ向け)
      botA: {
        channelAccessToken: process.env.LINE_BOT_A_ACCESS_TOKEN,
        channelSecret: process.env.LINE_BOT_A_CHANNEL_SECRET,
        webhookUrl: process.env.LINE_BOT_A_WEBHOOK_URL || '/webhook/bot-a'
      },
      // LINE Bot B (お客様向け)
      botB: {
        channelAccessToken: process.env.LINE_BOT_B_ACCESS_TOKEN,
        channelSecret: process.env.LINE_BOT_B_CHANNEL_SECRET,
        webhookUrl: process.env.LINE_BOT_B_WEBHOOK_URL || '/webhook/bot-b'
      }
    };

    // LINE Bot クライアント初期化
    this.botA = new line.Client({
      channelAccessToken: this.config.botA.channelAccessToken
    });

    this.botB = new line.Client({
      channelAccessToken: this.config.botB.channelAccessToken
    });

    // スタッフ情報管理
    this.staffData = new Map();
    this.absenceReports = new Map();
    this.substituteRequests = new Map();
  }

  // LINE Bot A Webhook処理（スタッフからのメッセージ受信）
  async handleBotAWebhook(req, res) {
    try {
      const events = req.body.events;
      
      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          await this.processStaffMessage(event);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('LINE Bot A Webhook Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // スタッフメッセージ処理
  async processStaffMessage(event) {
    const userId = event.source.userId;
    const messageText = event.message.text;
    
    console.log(`📱 スタッフメッセージ受信: ${messageText}`);

    // メッセージ解析
    const messageType = this.analyzeStaffMessage(messageText);
    
    switch (messageType.type) {
      case 'absence_report':
        await this.handleAbsenceReport(userId, messageText, messageType.data);
        break;
      case 'substitute_accept':
        await this.handleSubstituteAccept(userId, messageText);
        break;
      case 'substitute_decline':
        await this.handleSubstituteDecline(userId, messageText);
        break;
      default:
        await this.sendBotAReply(event.replyToken, '申し訳ございません。メッセージを理解できませんでした。');
    }
  }

  // スタッフメッセージ解析
  analyzeStaffMessage(message) {
    const text = message.toLowerCase();
    
    // 欠勤報告の検出
    if (text.includes('欠勤') || text.includes('休み') || text.includes('体調不良')) {
      return {
        type: 'absence_report',
        data: this.extractAbsenceData(message)
      };
    }
    
    // 代替出勤受諾の検出
    if (text.includes('代わり') && (text.includes('出勤') || text.includes('行く'))) {
      return {
        type: 'substitute_accept',
        data: null
      };
    }
    
    // 代替出勤拒否の検出
    if (text.includes('代わり') && (text.includes('無理') || text.includes('できない'))) {
      return {
        type: 'substitute_decline',
        data: null
      };
    }
    
    return { type: 'unknown', data: null };
  }

  // 欠勤データ抽出
  extractAbsenceData(message) {
    const data = {
      reason: '体調不良',
      date: new Date().toISOString().split('T')[0],
      time: '10:00-18:00'
    };
    
    // 理由の抽出
    if (message.includes('体調不良')) data.reason = '体調不良';
    if (message.includes('風邪')) data.reason = '風邪';
    if (message.includes('熱')) data.reason = '発熱';
    if (message.includes('家族')) data.reason = '家族の事情';
    
    // 日付の抽出（簡易版）
    const dateMatch = message.match(/(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      data.date = `2024-${month}-${day}`;
    }
    
    return data;
  }

  // 欠勤報告処理
  async handleAbsenceReport(userId, message, absenceData) {
    try {
      // スタッフ情報取得
      const staffInfo = await this.getStaffInfo(userId);
      if (!staffInfo) {
        await this.sendBotAReply(userId, 'スタッフ情報が見つかりません。管理者にお問い合わせください。');
        return;
      }

      // 欠勤報告記録
      const reportId = crypto.randomUUID();
      this.absenceReports.set(reportId, {
        staffId: userId,
        staffName: staffInfo.name,
        absenceData,
        timestamp: new Date().toISOString(),
        status: 'reported'
      });

      // 管理者に通知
      await this.notifyManager(reportId, staffInfo, absenceData);

      // 代替スタッフ募集開始
      await this.startSubstituteRecruitment(reportId, staffInfo, absenceData);

      // スタッフに確認メッセージ送信
      await this.sendBotAReply(userId, 
        `【欠勤報告受付完了】

👤 スタッフ: ${staffInfo.name}
📅 欠勤日: ${absenceData.date}
🕒 時間: ${absenceData.time}
💊 理由: ${absenceData.reason}

代替スタッフの手配を開始いたします。
ご連絡をお待ちください。`);

      console.log(`✅ 欠勤報告処理完了: ${staffInfo.name}`);

    } catch (error) {
      console.error('欠勤報告処理エラー:', error);
      await this.sendBotAReply(userId, 'エラーが発生しました。管理者にお問い合わせください。');
    }
  }

  // 代替スタッフ募集開始
  async startSubstituteRecruitment(reportId, absentStaff, absenceData) {
    try {
      // 他のスタッフに代替出勤依頼を送信
      const otherStaff = await this.getOtherStaff(absentStaff.id);
      
      for (const staff of otherStaff) {
        await this.sendSubstituteRequest(staff.userId, absentStaff, absenceData);
      }

      console.log(`🔄 代替スタッフ募集開始: ${otherStaff.length}名に依頼送信`);

    } catch (error) {
      console.error('代替スタッフ募集エラー:', error);
    }
  }

  // 代替出勤依頼送信
  async sendSubstituteRequest(staffUserId, absentStaff, absenceData) {
    const message = `【緊急】代替出勤のお願い

👤 欠勤スタッフ: ${absentStaff.name}
📅 欠勤日: ${absenceData.date}
🕒 時間: ${absenceData.time}
💊 理由: ${absenceData.reason}

代わりに出勤していただけますか？

✅ 出勤可能 → "代わりに出勤します"
❌ 出勤不可 → "代わりに出勤できません"

ご回答をお願いいたします。`;

    await this.sendBotAMessage(staffUserId, message);
  }

  // 代替出勤受諾処理
  async handleSubstituteAccept(userId, message) {
    try {
      const staffInfo = await this.getStaffInfo(userId);
      if (!staffInfo) return;

      // 受諾を記録
      this.substituteRequests.set(userId, {
        staffId: userId,
        staffName: staffInfo.name,
        status: 'accepted',
        timestamp: new Date().toISOString()
      });

      // 管理者に通知
      await this.notifySubstituteAccept(staffInfo);

      // スタッフに確認メッセージ
      await this.sendBotAReply(userId, 
        `【代替出勤受諾完了】

${staffInfo.name}さん、代替出勤ありがとうございます！

詳細は後ほどご連絡いたします。`);

      console.log(`✅ 代替出勤受諾: ${staffInfo.name}`);

    } catch (error) {
      console.error('代替出勤受諾処理エラー:', error);
    }
  }

  // 代替出勤拒否処理
  async handleSubstituteDecline(userId, message) {
    try {
      const staffInfo = await this.getStaffInfo(userId);
      if (!staffInfo) return;

      // 拒否を記録
      this.substituteRequests.set(userId, {
        staffId: userId,
        staffName: staffInfo.name,
        status: 'declined',
        timestamp: new Date().toISOString()
      });

      await this.sendBotAReply(userId, 
        `【代替出勤拒否受付】

${staffInfo.name}さん、ご回答ありがとうございます。

他のスタッフに依頼いたします。`);

      console.log(`❌ 代替出勤拒否: ${staffInfo.name}`);

    } catch (error) {
      console.error('代替出勤拒否処理エラー:', error);
    }
  }

  // スタッフ情報取得（実際の実装ではデータベースから取得）
  async getStaffInfo(userId) {
    // サンプルデータ
    const staffData = {
      'U1234567890': { id: 'U1234567890', name: '田中 美咲', position: '美容師' },
      'U2345678901': { id: 'U2345678901', name: '佐藤 健太', position: '理容師' },
      'U3456789012': { id: 'U3456789012', name: '山田 花子', position: 'アシスタント' }
    };
    
    return staffData[userId] || null;
  }

  // 他のスタッフ取得
  async getOtherStaff(excludeStaffId) {
    const allStaff = [
      { userId: 'U1234567890', name: '田中 美咲', position: '美容師' },
      { userId: 'U2345678901', name: '佐藤 健太', position: '理容師' },
      { userId: 'U3456789012', name: '山田 花子', position: 'アシスタント' }
    ];
    
    return allStaff.filter(staff => staff.userId !== excludeStaffId);
  }

  // 管理者通知
  async notifyManager(reportId, staffInfo, absenceData) {
    // 実際の実装では管理者のLINE IDに通知
    console.log(`📢 管理者通知: ${staffInfo.name}が欠勤報告`);
  }

  // 代替出勤受諾通知
  async notifySubstituteAccept(staffInfo) {
    // 実際の実装では管理者に通知
    console.log(`📢 管理者通知: ${staffInfo.name}が代替出勤受諾`);
  }

  // LINE Bot A メッセージ送信
  async sendBotAMessage(userId, message) {
    try {
      await this.botA.pushMessage(userId, {
        type: 'text',
        text: message
      });
    } catch (error) {
      console.error('LINE Bot A メッセージ送信エラー:', error);
    }
  }

  // LINE Bot A リプライ送信
  async sendBotAReply(replyToken, message) {
    try {
      await this.botA.replyMessage(replyToken, {
        type: 'text',
        text: message
      });
    } catch (error) {
      console.error('LINE Bot A リプライ送信エラー:', error);
    }
  }

  // LINE Bot B メッセージ送信（お客様向け）
  async sendBotBMessage(customerId, message) {
    try {
      await this.botB.pushMessage(customerId, {
        type: 'text',
        text: message
      });
    } catch (error) {
      console.error('LINE Bot B メッセージ送信エラー:', error);
    }
  }

  // お客様への振替連絡送信
  async sendCustomerNotification(customerInfo, absenceInfo, substituteInfo) {
    const message = `【重要】ご予約の振替について

お客様: ${customerInfo.name}
予約日時: ${customerInfo.appointmentDate} ${customerInfo.appointmentTime}
担当スタッフ: ${absenceInfo.staffName}

申し訳ございませんが、担当スタッフが急遽欠勤することになりました。

代替スタッフ: ${substituteInfo.name}が担当いたします。

ご都合が悪い場合は、別日への振替も可能です。
お手数ですが、ご連絡をお願いいたします。

📞 お問い合わせ: 03-1234-5678`;

    await this.sendBotBMessage(customerInfo.lineId, message);
  }

  // 統計情報取得
  getStats() {
    return {
      totalAbsenceReports: this.absenceReports.size,
      totalSubstituteRequests: this.substituteRequests.size,
      acceptedSubstitutes: Array.from(this.substituteRequests.values()).filter(r => r.status === 'accepted').length,
      declinedSubstitutes: Array.from(this.substituteRequests.values()).filter(r => r.status === 'declined').length
    };
  }
}

module.exports = LineBotIntegration;


