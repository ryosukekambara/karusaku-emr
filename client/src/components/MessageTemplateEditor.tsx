import React, { useState, useEffect } from 'react';
import config from '../config/api';
import { FileText } from 'lucide-react';
import './MessageTemplateEditor.css';

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

const MessageTemplateEditor: React.FC = () => {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [salonSettings, setSalonSettings] = useState<SalonSettings>({
    salon_name: 'カルサクサロン',
    phone: '03-1234-5678',
    business_hours: '10:00-19:00',
    manager_line_id: '',
    substitute_allowance: 5000,
    management_url: 'https://karusaku-salon.com/admin'
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // プレビュー用のサンプルデータ
  const [previewData, setPreviewData] = useState({
    staff_name: '田中 美咲',
    absence_date: '2024-01-15',
    absence_time: '10:00-18:00',
    absence_reason: '体調不良',
    staff_phone: '090-1234-5678',
    report_time: '09:30',
    salon_name: salonSettings.salon_name,
    management_url: salonSettings.management_url,
    notification_content: '本日の営業時間変更のお知らせ'
  });

  useEffect(() => {
    fetchMessageTemplates();
    fetchSalonSettings();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setEditingContent(selectedTemplate.content);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    setPreviewData(prev => ({
      ...prev,
      salon_name: salonSettings.salon_name,
      management_url: salonSettings.management_url
    }));
  }, [salonSettings]);

  const fetchMessageTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/workflow/message-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const templates = await response.json();
        const templateArray = Object.entries(templates).map(([id, content]) => ({
          id,
          name: getTemplateDisplayName(id),
          content: content as string,
          variables: extractVariables(content as string),
          type: getTemplateType(id) as 'absence' | 'emergency' | 'notification'
        }));
        setMessageTemplates(templateArray);
        
        // 最初のテンプレートを選択
        if (templateArray.length > 0) {
          setSelectedTemplate(templateArray[0]);
        }
      }
    } catch (error) {
      console.error('メッセージテンプレートの取得に失敗しました:', error);
      setError('テンプレートの取得に失敗しました');
    }
  };

  const fetchSalonSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${config.baseURL}/api/workflow/salon-settings', {
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

  const getTemplateDisplayName = (id: string): string => {
    switch (id) {
      case 'absence_notification':
        return '欠勤通知メッセージ';
      case 'emergency_notification':
        return '管理者通知メッセージ';
      case 'general_notification':
        return '一般通知メッセージ';
      default:
        return id;
    }
  };

  const getTemplateType = (id: string): 'absence' | 'emergency' | 'notification' => {
    if (id.includes('absence')) return 'absence';
    if (id.includes('emergency')) return 'emergency';
    return 'notification';
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(match => match.replace(/[{}]/g, ''))));
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setEditingContent(template.content);
    setError('');
    setSuccess('');
  };

  const handleContentChange = (content: string) => {
    setEditingContent(content);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('message-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      const newText = before + `{{${variable}}}` + after;
      setEditingContent(newText);
      
      // カーソル位置を調整
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/workflow/message-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editingContent
        }),
      });

      if (response.ok) {
        // テンプレート更新
        setMessageTemplates(prev => 
          prev.map(t => t.id === selectedTemplate.id ? {
            ...t,
            content: editingContent,
            variables: extractVariables(editingContent)
          } : t)
        );
        
        setSelectedTemplate({
          ...selectedTemplate,
          content: editingContent,
          variables: extractVariables(editingContent)
        });
        
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

  const handleReset = () => {
    if (selectedTemplate) {
      setEditingContent(selectedTemplate.content);
      setError('');
      setSuccess('');
    }
  };

  const renderPreview = (content: string) => {
    let preview = content;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  const getAvailableVariables = () => {
    const allVariables = new Set<string>();
    messageTemplates.forEach(template => {
      template.variables.forEach(variable => allVariables.add(variable));
    });
    return Array.from(allVariables);
  };

  return (
    <div className="message-template-editor">
      <div className="header">
        <h2>📱 メッセージテンプレート編集</h2>
        <p className="header-description">
          LINE Botで送信されるメッセージをカスタマイズできます。いつでも変更可能です。
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="editor-container">
        {/* サイドバー - テンプレート選択 */}
        <div className="sidebar">
          <div className="template-list">
            <h3>メッセージテンプレート</h3>
            {messageTemplates.map((template) => (
              <div
                key={template.id}
                className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="template-icon">
                  {template.type === 'absence' ? '🚨' : 
                   template.type === 'emergency' ? '⚡' : '📢'}
                </div>
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <p>{template.variables.length}個の変数</p>
                </div>
              </div>
            ))}
          </div>

          <div className="variables-section">
            <h3>利用可能な変数</h3>
            <div className="variables-grid">
              {getAvailableVariables().map((variable) => (
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
          </div>
        </div>

        {/* メインエディター */}
        <div className="main-editor">
          {selectedTemplate ? (
            <>
              <div className="editor-header">
                <h3>{selectedTemplate.name}</h3>
                <div className="editor-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    リセット
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>

              <div className="editor-content">
                <div className="content-section">
                  <label htmlFor="message-content">メッセージ内容</label>
                  <textarea
                    id="message-content"
                    value={editingContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    rows={12}
                    placeholder="メッセージ内容を入力してください..."
                  />
                </div>

                <div className="preview-section">
                  <h4>プレビュー</h4>
                  <div className="preview-content">
                    <pre>{renderPreview(editingContent)}</pre>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-template">
              <div className="no-template-icon"><FileText size={48} /></div>
              <h3>テンプレートを選択してください</h3>
              <p>左側のテンプレート一覧から編集したいメッセージを選択してください。</p>
            </div>
          )}
        </div>
      </div>

      {/* サロン設定 */}
      <div className="salon-settings-section">
        <h3>🏪 サロン設定</h3>
        <p className="section-description">
          メッセージで使用されるサロン情報を設定できます。
        </p>
        
        <div className="settings-grid">
          <div className="setting-item">
            <label>サロン名</label>
            <input
              type="text"
              value={salonSettings.salon_name}
              onChange={(e) => setSalonSettings({
                ...salonSettings,
                salon_name: e.target.value
              })}
            />
          </div>
          
          <div className="setting-item">
            <label>電話番号</label>
            <input
              type="tel"
              value={salonSettings.phone}
              onChange={(e) => setSalonSettings({
                ...salonSettings,
                phone: e.target.value
              })}
            />
          </div>
          
          <div className="setting-item">
            <label>営業時間</label>
            <input
              type="text"
              value={salonSettings.business_hours}
              onChange={(e) => setSalonSettings({
                ...salonSettings,
                business_hours: e.target.value
              })}
              placeholder="例: 10:00-19:00"
            />
          </div>
          
          <div className="setting-item">
            <label>管理画面URL</label>
            <input
              type="url"
              value={salonSettings.management_url}
              onChange={(e) => setSalonSettings({
                ...salonSettings,
                management_url: e.target.value
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateEditor;


