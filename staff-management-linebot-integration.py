# staff-management-linebot-integration.py
# スタッフ管理システム（w5hni7cp60ev.manus.space）用 LINE Bot統合機能

from flask import Flask, render_template_string, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
import requests
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import uuid
import re

# 環境変数読み込み
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
CORS(app)

# LINE Bot設定
LINE_BOT_A_ACCESS_TOKEN = os.getenv('LINE_BOT_A_ACCESS_TOKEN')
LINE_BOT_A_CHANNEL_SECRET = os.getenv('LINE_BOT_A_CHANNEL_SECRET')
LINE_BOT_B_ACCESS_TOKEN = os.getenv('LINE_BOT_B_ACCESS_TOKEN')
LINE_BOT_B_CHANNEL_SECRET = os.getenv('LINE_BOT_B_CHANNEL_SECRET')

# LINE Bot API初期化
line_bot_a = LineBotApi(LINE_BOT_A_ACCESS_TOKEN) if LINE_BOT_A_ACCESS_TOKEN else None
line_bot_b = LineBotApi(LINE_BOT_B_ACCESS_TOKEN) if LINE_BOT_B_ACCESS_TOKEN else None
handler_a = WebhookHandler(LINE_BOT_A_CHANNEL_SECRET) if LINE_BOT_A_CHANNEL_SECRET else None
handler_b = WebhookHandler(LINE_BOT_B_CHANNEL_SECRET) if LINE_BOT_B_CHANNEL_SECRET else None

# データ管理（実際の実装ではデータベースを使用）
staff_data = {}
absence_reports = {}
substitute_requests = {}
message_templates = {
    'absence_notification': """【サポート窓口｜HAL】当日欠勤報告

👤 スタッフ: {{staff_name}}
📅 欠勤日: {{absence_date}}
🕒 時間: {{absence_time}}
💊 理由: {{absence_reason}}
⏰ 報告時刻: {{report_time}}""",
    
    'emergency_notification': """【緊急】{{staff_name}}さん欠勤報告

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
管理画面: {{management_url}}""",
    
    'substitute_request': """【緊急】代替出勤のお願い

👤 欠勤スタッフ: {{absent_staff_name}}
📅 欠勤日: {{absence_date}}
🕒 時間: {{absence_time}}
💊 理由: {{absence_reason}}

代わりに出勤していただけますか？

✅ 出勤可能 → "代わりに出勤します"
❌ 出勤不可 → "代わりに出勤できません"

ご回答をお願いいたします。""",
    
    'customer_notification': """【重要】ご予約の振替について

お客様: {{customer_name}}
予約日時: {{appointment_date}} {{appointment_time}}
担当スタッフ: {{absent_staff_name}}

申し訳ございませんが、担当スタッフが急遽欠勤することになりました。

代替スタッフ: {{substitute_staff_name}}が担当いたします。

ご都合が悪い場合は、別日への振替も可能です。
お手数ですが、ご連絡をお願いいたします。

📞 お問い合わせ: {{salon_phone}}"""
}

salon_settings = {
    'salon_name': 'HAL',
    'salon_phone': '03-1234-5678',
    'business_hours': '10:00-19:00',
    'admin_line_id': '',
    'substitute_allowance': 5000
}

# サンプルスタッフデータ
sample_staff = {
    'U1234567890': {'id': 'U1234567890', 'name': '田中 美咲', 'position': '美容師', 'phone': '090-1234-5678'},
    'U2345678901': {'id': 'U2345678901', 'name': '佐藤 健太', 'position': '理容師', 'phone': '090-2345-6789'},
    'U3456789012': {'id': 'U3456789012', 'name': '山田 花子', 'position': 'アシスタント', 'phone': '090-3456-7890'}
}

# メッセージテンプレート処理
def process_template(template_key, variables):
    template = message_templates.get(template_key, '')
    for key, value in variables.items():
        template = template.replace(f'{{{{{key}}}}}', str(value))
    return template

# メッセージ解析
def analyze_message(message):
    text = message.lower()
    
    # 欠勤報告の検出
    if any(keyword in text for keyword in ['欠勤', '休み', '体調不良', '風邪', '熱']):
        return {
            'type': 'absence_report',
            'data': extract_absence_data(message)
        }
    
    # 代替出勤受諾の検出
    if '代わり' in text and any(keyword in text for keyword in ['出勤', '行く', 'します']):
        return {
            'type': 'substitute_accept',
            'data': None
        }
    
    # 代替出勤拒否の検出
    if '代わり' in text and any(keyword in text for keyword in ['無理', 'できない', 'できません']):
        return {
            'type': 'substitute_decline',
            'data': None
        }
    
    return {'type': 'unknown', 'data': None}

# 欠勤データ抽出
def extract_absence_data(message):
    data = {
        'reason': '体調不良',
        'date': datetime.now().strftime('%Y-%m-%d'),
        'time': '10:00-18:00'
    }
    
    # 理由の抽出
    if '風邪' in message:
        data['reason'] = '風邪'
    elif '熱' in message:
        data['reason'] = '発熱'
    elif '家族' in message:
        data['reason'] = '家族の事情'
    
    # 日付の抽出（簡易版）
    date_match = re.search(r'(\d{1,2})月(\d{1,2})日', message)
    if date_match:
        month = date_match.group(1).zfill(2)
        day = date_match.group(2).zfill(2)
        data['date'] = f"2024-{month}-{day}"
    
    return data

# LINE Bot A Webhook処理
@app.route('/webhook/bot-a', methods=['POST'])
def webhook_bot_a():
    if not handler_a:
        return 'LINE Bot A not configured', 400
    
    signature = request.headers['X-Line-Signature']
    body = request.get_data(as_text=True)
    
    try:
        handler_a.handle(body, signature)
    except InvalidSignatureError:
        return 'Invalid signature', 400
    
    return 'OK'

@handler_a.add(MessageEvent, message=TextMessage)
def handle_bot_a_message(event):
    user_id = event.source.user_id
    message_text = event.message.text
    
    print(f"📱 スタッフメッセージ受信: {message_text}")
    
    # メッセージ解析
    analysis = analyze_message(message_text)
    
    if analysis['type'] == 'absence_report':
        handle_absence_report(user_id, message_text, analysis['data'])
    elif analysis['type'] == 'substitute_accept':
        handle_substitute_accept(user_id, message_text)
    elif analysis['type'] == 'substitute_decline':
        handle_substitute_decline(user_id, message_text)
    else:
        send_bot_a_reply(event.reply_token, '申し訳ございません。メッセージを理解できませんでした。')

# 欠勤報告処理
def handle_absence_report(user_id, message, absence_data):
    try:
        # スタッフ情報取得
        staff_info = sample_staff.get(user_id)
        if not staff_info:
            send_bot_a_message(user_id, 'スタッフ情報が見つかりません。管理者にお問い合わせください。')
            return
        
        # 欠勤報告記録
        report_id = str(uuid.uuid4())
        absence_reports[report_id] = {
            'staff_id': user_id,
            'staff_name': staff_info['name'],
            'absence_data': absence_data,
            'timestamp': datetime.now().isoformat(),
            'status': 'reported'
        }
        
        # 管理者に通知
        notify_manager(report_id, staff_info, absence_data)
        
        # 代替スタッフ募集開始
        start_substitute_recruitment(report_id, staff_info, absence_data)
        
        # スタッフに確認メッセージ送信
        variables = {
            'staff_name': staff_info['name'],
            'absence_date': absence_data['date'],
            'absence_time': absence_data['time'],
            'absence_reason': absence_data['reason'],
            'report_time': datetime.now().strftime('%Y-%m-%d %H:%M')
        }
        
        confirmation_message = process_template('absence_notification', variables)
        send_bot_a_message(user_id, confirmation_message)
        
        print(f"✅ 欠勤報告処理完了: {staff_info['name']}")
        
    except Exception as error:
        print(f"欠勤報告処理エラー: {error}")
        send_bot_a_message(user_id, 'エラーが発生しました。管理者にお問い合わせください。')

# 代替スタッフ募集開始
def start_substitute_recruitment(report_id, absent_staff, absence_data):
    try:
        # 他のスタッフに代替出勤依頼を送信
        other_staff = [staff for staff_id, staff in sample_staff.items() 
                      if staff_id != absent_staff['id']]
        
        for staff in other_staff:
            send_substitute_request(staff['id'], absent_staff, absence_data)
        
        print(f"🔄 代替スタッフ募集開始: {len(other_staff)}名に依頼送信")
        
    except Exception as error:
        print(f"代替スタッフ募集エラー: {error}")

# 代替出勤依頼送信
def send_substitute_request(staff_user_id, absent_staff, absence_data):
    variables = {
        'absent_staff_name': absent_staff['name'],
        'absence_date': absence_data['date'],
        'absence_time': absence_data['time'],
        'absence_reason': absence_data['reason']
    }
    
    message = process_template('substitute_request', variables)
    send_bot_a_message(staff_user_id, message)

# 代替出勤受諾処理
def handle_substitute_accept(user_id, message):
    try:
        staff_info = sample_staff.get(user_id)
        if not staff_info:
            return
        
        # 受諾を記録
        substitute_requests[user_id] = {
            'staff_id': user_id,
            'staff_name': staff_info['name'],
            'status': 'accepted',
            'timestamp': datetime.now().isoformat()
        }
        
        # 管理者に通知
        notify_substitute_accept(staff_info)
        
        # スタッフに確認メッセージ
        send_bot_a_message(user_id, 
            f"【代替出勤受諾完了】\n\n{staff_info['name']}さん、代替出勤ありがとうございます！\n\n詳細は後ほどご連絡いたします。")
        
        print(f"✅ 代替出勤受諾: {staff_info['name']}")
        
    except Exception as error:
        print(f"代替出勤受諾処理エラー: {error}")

# 代替出勤拒否処理
def handle_substitute_decline(user_id, message):
    try:
        staff_info = sample_staff.get(user_id)
        if not staff_info:
            return
        
        # 拒否を記録
        substitute_requests[user_id] = {
            'staff_id': user_id,
            'staff_name': staff_info['name'],
            'status': 'declined',
            'timestamp': datetime.now().isoformat()
        }
        
        send_bot_a_message(user_id, 
            f"【代替出勤拒否受付】\n\n{staff_info['name']}さん、ご回答ありがとうございます。\n\n他のスタッフに依頼いたします。")
        
        print(f"❌ 代替出勤拒否: {staff_info['name']}")
        
    except Exception as error:
        print(f"代替出勤拒否処理エラー: {error}")

# 管理者通知
def notify_manager(report_id, staff_info, absence_data):
    print(f"📢 管理者通知: {staff_info['name']}が欠勤報告")

def notify_substitute_accept(staff_info):
    print(f"📢 管理者通知: {staff_info['name']}が代替出勤受諾")

# LINE Bot A メッセージ送信
def send_bot_a_message(user_id, message):
    if not line_bot_a:
        print(f"LINE Bot A not configured. Message: {message}")
        return
    
    try:
        line_bot_a.push_message(user_id, TextSendMessage(text=message))
    except Exception as error:
        print(f"LINE Bot A メッセージ送信エラー: {error}")

def send_bot_a_reply(reply_token, message):
    if not line_bot_a:
        print(f"LINE Bot A not configured. Reply: {message}")
        return
    
    try:
        line_bot_a.reply_message(reply_token, TextSendMessage(text=message))
    except Exception as error:
        print(f"LINE Bot A リプライ送信エラー: {error}")

# お客様への振替連絡送信
def send_customer_notification(customer_info, absence_info, substitute_info):
    variables = {
        'customer_name': customer_info['name'],
        'appointment_date': customer_info['appointment_date'],
        'appointment_time': customer_info['appointment_time'],
        'absent_staff_name': absence_info['staff_name'],
        'substitute_staff_name': substitute_info['name'],
        'salon_phone': salon_settings['salon_phone']
    }
    
    message = process_template('customer_notification', variables)
    
    if line_bot_b:
        try:
            line_bot_b.push_message(customer_info['line_id'], TextSendMessage(text=message))
        except Exception as error:
            print(f"LINE Bot B メッセージ送信エラー: {error}")

# スタッフ管理システムのメインHTMLテンプレート
MAIN_TEMPLATE = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>スタッフ管理システム - LINE Bot管理</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .header h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .header p {
            color: #666;
            text-align: center;
            font-size: 16px;
        }
        
        .tabs {
            display: flex;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 10px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .tab {
            flex: 1;
            padding: 15px 20px;
            background: transparent;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            color: #667eea;
        }
        
        .tab.active {
            background: #667eea;
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .tab:hover:not(.active) {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-height: 500px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .stat-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        
        .table th {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        
        .table td {
            padding: 16px 12px;
            border-bottom: 1px solid #f1f3f4;
            font-size: 14px;
        }
        
        .table tr:hover {
            background: rgba(102, 126, 234, 0.05);
        }
        
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .status-reported {
            background: rgba(52, 144, 220, 0.1);
            color: #3490dc;
        }
        
        .status-accepted {
            background: rgba(40, 167, 69, 0.1);
            color: #28a745;
        }
        
        .status-declined {
            background: rgba(220, 53, 69, 0.1);
            color: #dc3545;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            background: #667eea;
            color: white;
        }
        
        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .error-message {
            background: rgba(220, 53, 69, 0.1);
            color: #dc3545;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #dc3545;
        }
        
        .success-message {
            background: rgba(40, 167, 69, 0.1);
            color: #28a745;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #28a745;
        }
        
        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
            font-size: 16px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .tabs {
                flex-direction: column;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 LINE Bot自動化管理</h1>
            <p>スタッフの欠勤報告から代替出勤依頼まで、完全自動化</p>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('dashboard')">📊 ダッシュボード</button>
            <button class="tab" onclick="showTab('reports')">📋 欠勤報告</button>
            <button class="tab" onclick="showTab('requests')">🔄 代替出勤</button>
            <button class="tab" onclick="showTab('settings')">⚙️ 設定</button>
            <button class="tab" onclick="showTab('test')">🧪 テスト</button>
        </div>
        
        <div class="content">
            <!-- ダッシュボード -->
            <div id="dashboard" class="tab-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-number" id="total-reports">0</div>
                        <div class="stat-label">欠勤報告</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔄</div>
                        <div class="stat-number" id="total-requests">0</div>
                        <div class="stat-label">代替出勤依頼</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-number" id="accepted-requests">0</div>
                        <div class="stat-label">受諾数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">❌</div>
                        <div class="stat-number" id="declined-requests">0</div>
                        <div class="stat-label">拒否数</div>
                    </div>
                </div>
                
                <h3>最近の活動</h3>
                <div id="recent-activity">
                    <div class="no-data">データを読み込み中...</div>
                </div>
            </div>
            
            <!-- 欠勤報告 -->
            <div id="reports" class="tab-content" style="display: none;">
                <h3>欠勤報告一覧</h3>
                <div id="reports-list">
                    <div class="no-data">データを読み込み中...</div>
                </div>
            </div>
            
            <!-- 代替出勤依頼 -->
            <div id="requests" class="tab-content" style="display: none;">
                <h3>代替出勤依頼一覧</h3>
                <div id="requests-list">
                    <div class="no-data">データを読み込み中...</div>
                </div>
            </div>
            
            <!-- 設定 -->
            <div id="settings" class="tab-content" style="display: none;">
                <h3>LINE Bot設定</h3>
                <div class="form-group">
                    <label>LINE Bot A Access Token (スタッフ向け)</label>
                    <input type="text" id="bot-a-token" placeholder="LINE Bot A のアクセストークン">
                </div>
                <div class="form-group">
                    <label>LINE Bot B Access Token (お客様向け)</label>
                    <input type="text" id="bot-b-token" placeholder="LINE Bot B のアクセストークン">
                </div>
                <button class="btn" onclick="saveSettings()">設定保存</button>
            </div>
            
            <!-- テスト -->
            <div id="test" class="tab-content" style="display: none;">
                <h3>🧪 LINE Botテスト</h3>
                <div class="form-group">
                    <label>スタッフID</label>
                    <input type="text" id="test-staff-id" value="U1234567890" placeholder="U1234567890">
                </div>
                <div class="form-group">
                    <label>テストメッセージ</label>
                    <textarea id="test-message" rows="3" placeholder="今日体調不良で欠勤します">今日体調不良で欠勤します</textarea>
                </div>
                <button class="btn" onclick="testAbsenceReport()">テスト送信</button>
                
                <div style="margin-top: 30px;">
                    <h4>テストメッセージ例</h4>
                    <button class="btn" onclick="setTestMessage('今日体調不良で欠勤します')" style="margin: 5px;">体調不良で欠勤</button>
                    <button class="btn" onclick="setTestMessage('風邪で明日休みます')" style="margin: 5px;">風邪で休み</button>
                    <button class="btn" onclick="setTestMessage('代わりに出勤します')" style="margin: 5px;">代替出勤受諾</button>
                    <button class="btn" onclick="setTestMessage('代わりに出勤できません')" style="margin: 5px;">代替出勤拒否</button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // タブ切り替え
        function showTab(tabName) {
            // すべてのタブコンテンツを非表示
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.style.display = 'none');
            
            // すべてのタブボタンのアクティブクラスを削除
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // 選択されたタブを表示
            document.getElementById(tabName).style.display = 'block';
            
            // 選択されたタブボタンにアクティブクラスを追加
            event.target.classList.add('active');
            
            // データを読み込み
            if (tabName === 'dashboard') {
                loadDashboard();
            } else if (tabName === 'reports') {
                loadReports();
            } else if (tabName === 'requests') {
                loadRequests();
            }
        }
        
        // ダッシュボードデータ読み込み
        function loadDashboard() {
            fetch('/api/line-bot/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('total-reports').textContent = data.total_absence_reports || 0;
                    document.getElementById('total-requests').textContent = data.total_substitute_requests || 0;
                    document.getElementById('accepted-requests').textContent = data.accepted_substitutes || 0;
                    document.getElementById('declined-requests').textContent = data.declined_substitutes || 0;
                })
                .catch(error => {
                    console.error('統計データ取得エラー:', error);
                });
        }
        
        // 欠勤報告一覧読み込み
        function loadReports() {
            fetch('/api/line-bot/absence-reports')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('reports-list');
                    if (data.length === 0) {
                        container.innerHTML = '<div class="no-data">欠勤報告はありません</div>';
                        return;
                    }
                    
                    let html = '<table class="table"><thead><tr><th>スタッフ名</th><th>欠勤日</th><th>時間</th><th>理由</th><th>報告時刻</th><th>ステータス</th></tr></thead><tbody>';
                    data.forEach(report => {
                        html += `<tr>
                            <td>${report.staff_name}</td>
                            <td>${report.absence_data.date}</td>
                            <td>${report.absence_data.time}</td>
                            <td>${report.absence_data.reason}</td>
                            <td>${new Date(report.timestamp).toLocaleString('ja-JP')}</td>
                            <td><span class="status-badge status-${report.status}">${report.status}</span></td>
                        </tr>`;
                    });
                    html += '</tbody></table>';
                    container.innerHTML = html;
                })
                .catch(error => {
                    console.error('欠勤報告取得エラー:', error);
                });
        }
        
        // 代替出勤依頼一覧読み込み
        function loadRequests() {
            fetch('/api/line-bot/substitute-requests')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('requests-list');
                    if (data.length === 0) {
                        container.innerHTML = '<div class="no-data">代替出勤依頼はありません</div>';
                        return;
                    }
                    
                    let html = '<table class="table"><thead><tr><th>スタッフ名</th><th>ステータス</th><th>回答時刻</th></tr></thead><tbody>';
                    data.forEach(request => {
                        html += `<tr>
                            <td>${request.staff_name}</td>
                            <td><span class="status-badge status-${request.status}">${request.status}</span></td>
                            <td>${new Date(request.timestamp).toLocaleString('ja-JP')}</td>
                        </tr>`;
                    });
                    html += '</tbody></table>';
                    container.innerHTML = html;
                })
                .catch(error => {
                    console.error('代替出勤依頼取得エラー:', error);
                });
        }
        
        // テストメッセージ設定
        function setTestMessage(message) {
            document.getElementById('test-message').value = message;
        }
        
        // テスト欠勤報告送信
        function testAbsenceReport() {
            const staffId = document.getElementById('test-staff-id').value;
            const message = document.getElementById('test-message').value;
            
            fetch('/api/line-bot/test/absence-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    staff_id: staffId,
                    message: message
                })
            })
            .then(response => response.json())
            .then(data => {
                alert('テスト送信完了: ' + data.message);
                loadDashboard();
            })
            .catch(error => {
                console.error('テスト送信エラー:', error);
                alert('テスト送信に失敗しました');
            });
        }
        
        // 設定保存
        function saveSettings() {
            const botAToken = document.getElementById('bot-a-token').value;
            const botBToken = document.getElementById('bot-b-token').value;
            
            fetch('/api/line-bot/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bot_a_token: botAToken,
                    bot_b_token: botBToken
                })
            })
            .then(response => response.json())
            .then(data => {
                alert('設定を保存しました');
            })
            .catch(error => {
                console.error('設定保存エラー:', error);
                alert('設定保存に失敗しました');
            });
        }
        
        // ページ読み込み時にダッシュボードを表示
        window.onload = function() {
            loadDashboard();
        };
    </script>
</body>
</html>
"""

# メインページ
@app.route('/')
def index():
    return render_template_string(MAIN_TEMPLATE)

# API エンドポイント
@app.route('/api/line-bot/stats')
def get_stats():
    stats = {
        'total_absence_reports': len(absence_reports),
        'total_substitute_requests': len(substitute_requests),
        'accepted_substitutes': len([r for r in substitute_requests.values() if r['status'] == 'accepted']),
        'declined_substitutes': len([r for r in substitute_requests.values() if r['status'] == 'declined'])
    }
    return jsonify(stats)

@app.route('/api/line-bot/absence-reports')
def get_absence_reports():
    reports = list(absence_reports.values())
    return jsonify(reports)

@app.route('/api/line-bot/substitute-requests')
def get_substitute_requests():
    requests = list(substitute_requests.values())
    return jsonify(requests)

@app.route('/api/line-bot/test/absence-report', methods=['POST'])
def test_absence_report():
    data = request.get_json()
    staff_id = data.get('staff_id')
    message = data.get('message')
    
    # テスト用の欠勤報告処理
    analysis = analyze_message(message)
    if analysis['type'] == 'absence_report':
        handle_absence_report(staff_id, message, analysis['data'])
        return jsonify({'success': True, 'message': 'テスト欠勤報告が処理されました'})
    else:
        return jsonify({'success': False, 'message': 'メッセージを解析できませんでした'})

@app.route('/api/line-bot/settings', methods=['POST'])
def save_settings():
    data = request.get_json()
    # 設定保存処理（実際の実装ではデータベースに保存）
    return jsonify({'success': True, 'message': '設定を保存しました'})

if __name__ == '__main__':
    print("🤖 スタッフ管理システム LINE Bot統合版を起動中...")
    print("📱 アクセス: http://localhost:5000")
    print("🔧 LINE Bot Webhook: http://localhost:5000/webhook/bot-a")
    app.run(debug=True, host='0.0.0.0', port=5000)


