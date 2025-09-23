import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CheckCircle } from 'lucide-react';
import './WorkflowManagement.css';

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  type: 'absence' | 'emergency' | 'notification';
}

interface SalonSettings {
  salon_name: string;
  phone: string;
  business_hours: string;
  manager_line_id: string;
  substitute_allowance: number;
  management_url: string;
}

const WorkflowManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'salon' | 'workflow'>('messages');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // メッセージテンプレート管理
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([
    {
      id: 'absence_notification',
      name: '欠勤通知メッセージ',
      content: `【サポート窓口｜HAL】当日欠勤報告

👤 スタッフ: {{staff_name}}
<Calendar size={16} /> 欠勤日: {{absence_date}}
🕒 時間: {{absence_time}}
💊 理由: {{absence_reason}}
⏰ 報告時刻: {{report_time}}`,
      variables: ['staff_name', 'absence_date', 'absence_time', 'absence_reason', 'report_time'],
      type: 'absence'
    },
    {
      id: 'emergency_notification',
      name: '管理者通知メッセージ',
      content: `【緊急】{{staff_name}}さん欠勤報告

<FileText size={16} /> 詳細情報:
- 欠勤日時: {{absence_date}} {{absence_time}}
- 欠勤理由: {{absence_reason}}
- 報告時刻: {{report_time}}
- スタッフ電話: {{staff_phone}}

⚡ 次の対応を実行中:
<CheckCircle size={16} /> 代替スタッフ募集開始
<CheckCircle size={16} /> 影響予約の確認
<CheckCircle size={16} /> 顧客への連絡準備

管理者による確認が必要です。
管理画面: {{management_url}}`,
      variables: ['staff_name', 'absence_date', 'absence_time', 'absence_reason', 'report_time', 'staff_phone', 'management_url'],
      type: 'emergency'
    },
    {
      id: 'general_notification',
      name: '一般通知メッセージ',
      content: `【{{salon_name}}】お知らせ

{{notification_content}}

詳細は管理画面をご確認ください。
{{management_url}}`,
      variables: ['salon_name', 'notification_content', 'management_url'],
      type: 'notification'
    }
  ]);

  // サロン設定
  const [salonSettings, setSalonSettings] = useState<SalonSettings>({
    salon_name: 'カルサクサロン',
    phone: '03-1234-5678',
    business_hours: '10:00-19:00',
    manager_line_id: '',
    substitute_allowance: 5000,
    management_url: 'https://karusaku-salon.com/admin'
  });

  // ワークフロー設定
  const [workflowConfig, setWorkflowConfig] = useState({
    gmail_enabled: true,
    slack_enabled: true,
    notion_enabled: true,
    auto_notification: true,
    notification_interval: 5
  });

  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState({
    staff_name: '田中 美咲',
    absence_date: '2024-01-15',
    absence_time: '10:00',
    absence_reason: '体調不良',
    staff_phone: '090-1234-5678',
    report_time: '09:30',
    salon_name: salonSettings.salon_name,
    management_url: salonSettings.management_url,
    notification_content: '本日の営業時間変更のお知らせ'
  });

  useEffect(() => {
    fetchWorkflowConfig();
    fetchMessageTemplates();
    fetchSalonSettings();
  }, []);

  const fetchWorkflowConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflow/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const config = await response.json();
        setWorkflowConfig(config);
      }
    } catch (error) {
      console.error('ワークフロー設定の取得に失敗しました:', error);
    }
  };

  const fetchMessageTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflow/message-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const templates = await response.json();
        // バックエンドから取得したテンプレートで更新
        const templateArray = Object.entries(templates).map(([id, content]) => ({
          id,
          name: id === 'absence_notification' ? '欠勤通知メッセージ' : 
                id === 'emergency_notification' ? '管理者通知メッセージ' : 
                '一般通知メッセージ',
          content: content as string,
          variables: extractVariables(content as string),
          type: (id.includes('absence') ? 'absence' : 
                id.includes('emergency') ? 'emergency' : 'notification') as 'absence' | 'emergency' | 'notification'
        }));
        setMessageTemplates(templateArray);
      }
    } catch (error) {
      console.error('メッセージテンプレートの取得に失敗しました:', error);
    }
  };

  const fetchSalonSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflow/salon-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const settings = await response.json();
        setSalonSettings(settings);
      }
    } catch (error) {
      console.error('サロン設定の取得に失敗しました:', error);
    }
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(match => match.replace(/[{}]/g, ''))));
  };

  const handleTemplateEdit = (template: MessageTemplate) => {
    setEditingTemplate({ ...template });
  };

  const handleTemplateSave = async () => {
    if (!editingTemplate) return;

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workflow/message-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editingTemplate.content
        }),
      });

      if (response.ok) {
        // テンプレート更新
        setMessageTemplates(prev => 
          prev.map(t => t.id === editingTemplate.id ? editingTemplate : t)
        );
        
        setEditingTemplate(null);
        setSuccess('メッセージテンプレートが更新されました');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'テンプレートの保存に失敗しました');
      }
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
      setError('テンプレートの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSalonSettingsSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflow/salon-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(salonSettings),
      });

      if (response.ok) {
        setSuccess('サロン設定が保存されました');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'サロン設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('サロン設定保存エラー:', error);
      setError('サロン設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowTest = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workflow/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('ワークフローテストが完了しました');
      } else {
        setError('ワークフローテストに失敗しました');
      }
    } catch (error) {
      console.error('ワークフローテストエラー:', error);
      setError('ワークフローテストに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    
    const textarea = document.getElementById('message-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      const newText = before + `{{${variable}}}` + after;
      setEditingTemplate({
        ...editingTemplate,
        content: newText
      });
      
      // カーソル位置を調整
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const renderPreview = (content: string) => {
    let preview = content;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  return (
    <div className="workflow-management">
      <div className="header">
        <h2>ワークフロー管理</h2>
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            📱 メッセージ設定
          </button>
          <button 
            className={`tab-btn ${activeTab === 'salon' ? 'active' : ''}`}
            onClick={() => setActiveTab('salon')}
          >
            🏪 サロン設定
          </button>
          <button 
            className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            🔄 ワークフロー
          </button>
        </div>
            </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'messages' && (
        <div className="messages-container">
          <div className="section">
            <h3>メッセージテンプレート管理</h3>
            <p className="section-description">
              LINE Botで送信されるメッセージをカスタマイズできます。変数を使用して動的な内容を挿入できます。
            </p>

            <div className="templates-grid">
              {messageTemplates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <h4>{template.name}</h4>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleTemplateEdit(template)}
                    >
                      編集
                    </button>
              </div>
                  <div className="template-preview">
                    <pre>{renderPreview(template.content)}</pre>
            </div>
              </div>
              ))}
            </div>
          </div>

          {editingTemplate && (
            <div className="section">
              <h3>メッセージ編集: {editingTemplate.name}</h3>
              
              <div className="editor-container">
                <div className="editor-sidebar">
                  <h4>利用可能な変数</h4>
                  <div className="variables-list">
                    {editingTemplate.variables.map((variable) => (
                      <button
                        key={variable}
                        className="variable-btn"
                        onClick={() => insertVariable(variable)}
                        title={`{{${variable}}}`}
                      >
                        {variable}
                      </button>
                    ))}
        </div>

                  <div className="preview-section">
                    <h4>プレビュー</h4>
                    <div className="preview-content">
                      <pre>{renderPreview(editingTemplate.content)}</pre>
                    </div>
                  </div>
                </div>

                <div className="editor-main">
                  <label htmlFor="message-content">メッセージ内容</label>
                  <textarea
                    id="message-content"
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      content: e.target.value
                    })}
                    rows={15}
                    placeholder="メッセージ内容を入力してください..."
                  />
                  
                  <div className="editor-actions">
            <button 
              className="btn btn-primary"
                      onClick={handleTemplateSave}
                      disabled={loading}
            >
                      {loading ? '保存中...' : '保存'}
            </button>
            <button 
              className="btn btn-secondary"
                      onClick={() => setEditingTemplate(null)}
            >
                      キャンセル
            </button>
          </div>
        </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'salon' && (
        <div className="salon-container">
          <div className="section">
            <h3>サロン基本設定</h3>
            <p className="section-description">
              サロンの基本情報とメッセージで使用される設定を管理できます。
            </p>

            <div className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="salon_name">サロン名</label>
                  <input
                    type="text"
                    id="salon_name"
                    value={salonSettings.salon_name}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      salon_name: e.target.value
                    })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">電話番号</label>
                  <input
                    type="tel"
                    id="phone"
                    value={salonSettings.phone}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      phone: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="business_hours">営業時間</label>
                  <input
                    type="text"
                    id="business_hours"
                    value={salonSettings.business_hours}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      business_hours: e.target.value
                    })}
                    placeholder="例: 10:00-19:00"
                  />
            </div>

                <div className="form-group">
                  <label htmlFor="manager_line_id">管理者LINE ID</label>
                  <input
                    type="text"
                    id="manager_line_id"
                    value={salonSettings.manager_line_id}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      manager_line_id: e.target.value
                    })}
                    placeholder="@manager_line_id"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="substitute_allowance">代替勤務手当 (円)</label>
                  <input
                    type="number"
                    id="substitute_allowance"
                    value={salonSettings.substitute_allowance}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      substitute_allowance: parseInt(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="management_url">管理画面URL</label>
                  <input
                    type="url"
                    id="management_url"
                    value={salonSettings.management_url}
                    onChange={(e) => setSalonSettings({
                      ...salonSettings,
                      management_url: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSalonSettingsSave}
                  disabled={loading}
                >
                  {loading ? '保存中...' : '設定保存'}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {activeTab === 'workflow' && (
        <div className="workflow-container">
          <div className="section">
            <h3>ワークフロー設定</h3>
            <p className="section-description">
              Gmail、Slack、Notionとの連携設定と自動通知の管理を行います。
            </p>

            <div className="workflow-settings">
              <div className="setting-group">
                <h4>連携サービス</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workflowConfig.gmail_enabled}
                      onChange={(e) => setWorkflowConfig({
                        ...workflowConfig,
                        gmail_enabled: e.target.checked
                      })}
                    />
                    <span>Gmail連携</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workflowConfig.slack_enabled}
                      onChange={(e) => setWorkflowConfig({
                        ...workflowConfig,
                        slack_enabled: e.target.checked
                      })}
                    />
                    <span>Slack連携</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workflowConfig.notion_enabled}
                      onChange={(e) => setWorkflowConfig({
                        ...workflowConfig,
                        notion_enabled: e.target.checked
                      })}
                    />
                    <span>Notion連携</span>
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h4>自動通知設定</h4>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={workflowConfig.auto_notification}
                      onChange={(e) => setWorkflowConfig({
                        ...workflowConfig,
                        auto_notification: e.target.checked
                      })}
                    />
                    <span>自動通知を有効にする</span>
                  </label>
                </div>
                
                <div className="form-group">
                  <label htmlFor="notification_interval">通知間隔 (分)</label>
                  <input
                    type="number"
                    id="notification_interval"
                    value={workflowConfig.notification_interval}
                    onChange={(e) => setWorkflowConfig({
                      ...workflowConfig,
                      notification_interval: parseInt(e.target.value) || 5
                    })}
                    min="1"
                    max="60"
                  />
                </div>
              </div>

              <div className="workflow-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleWorkflowTest}
                  disabled={loading}
                >
                  {loading ? 'テスト中...' : 'ワークフローテスト実行'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowManagement;