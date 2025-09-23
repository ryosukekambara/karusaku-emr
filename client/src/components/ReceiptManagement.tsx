import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import './ReceiptManagement.css';

interface ReceiptData {
  id: number;
  patient_id: number;
  patient_name: string;
  visit_date: string;
  treatment_items: TreatmentItem[];
  total_amount: number;
  insurance_amount: number;
  patient_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
}

interface TreatmentItem {
  id: number;
  treatment_name: string;
  unit_price: number;
  quantity: number;
  total: number;
  insurance_code: string;
}

const ReceiptManagement: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      // デモモード用のトークン
          const token = localStorage.getItem('token');
    const response = await fetch('/api/receipts', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

      if (response.ok) {
        const data = await response.json();
        setReceipts(data);
      } else {
        // デモデータ
        setReceipts([
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
          }
        ]);
      }
    } catch (error) {
      console.error('レセプトデータの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptFromMedicalRecord = async (medicalRecordId: number) => {
    try {
      // デモモード用のトークン
      const token = localStorage.getItem('token');
      const response = await fetch('/api/receipts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ medical_record_id: medicalRecordId }),
      });

      if (response.ok) {
        const newReceipt = await response.json();
        setReceipts(prev => [...prev, newReceipt]);
        setActiveTab('list');
      }
    } catch (error) {
      console.error('レセプト生成に失敗しました:', error);
    }
  };

  const submitReceipt = async (receiptId: number) => {
    try {
      // デモモード用のトークン
          const token = localStorage.getItem('token');
    const response = await fetch(`/api/receipts/${receiptId}/submit`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

      if (response.ok) {
        // 成功時は該当レセプトのみステータスを更新（エラーハンドリング強化）
        setReceipts(prev => {
          try {
            return prev.map(receipt => 
              receipt.id === receiptId 
                ? { ...receipt, status: 'submitted' }
                : receipt
            );
          } catch (updateError) {
            console.error('状態更新エラー:', updateError);
            return prev; // エラー時は元の状態を維持
          }
        });
        alert('レセプトが正常に提出されました。');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'レセプト提出に失敗しました');
      }
    } catch (error) {
      console.error('レセプト提出に失敗しました:', error);
      alert(`レセプト提出に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const editReceipt = (receiptId: number) => {
    // 編集機能の実装（現在はアラートで表示）
    alert(`レセプトID: ${receiptId} の編集機能は開発中です。`);
  };

  const printReceipt = (receiptId: number) => {
    // 印刷機能の実装（現在はアラートで表示）
    alert(`レセプトID: ${receiptId} の印刷機能は開発中です。`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#ffc107';
      case 'submitted': return '#17a2b8';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '下書き';
      case 'submitted': return '提出済み';
      case 'approved': return '承認済み';
      case 'rejected': return '却下';
      default: return '不明';
    }
  };

  if (loading) {
    return (
      <div className="receipt-management-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>レセプトデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態の処理
  if (!receipts || receipts.length === 0) {
    return (
      <div className="receipt-management-container">
        <div className="receipt-header">
          <h1><Lock size={24} /> レセプト管理</h1>
          <div className="premium-badge">
            <span>プレミアム機能</span>
          </div>
        </div>
        <div className="receipt-content">
          <div className="no-data-message">
            <p>レセプトデータが見つかりません。</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="receipt-management-container">
      <div className="receipt-header">
        <h1><Lock size={24} /> レセプト管理</h1>
        <div className="premium-badge">
          <span>プレミアム機能</span>
        </div>
      </div>

      <div className="receipt-tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          レセプト一覧
        </button>
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          自動作成
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          設定
        </button>
      </div>

      <div className="receipt-content">
        {activeTab === 'list' && (
          <div className="receipt-list">
            <div className="receipt-actions">
              <button className="btn btn-primary">
                新規レセプト作成
              </button>
              <button className="btn btn-secondary">
                一括提出
              </button>
            </div>

            <div className="receipts-grid">
              {receipts.map(receipt => (
                <div key={receipt.id} className="receipt-card">
                  <div className="receipt-header">
                    <h3>{receipt.patient_name}</h3>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(receipt.status) }}
                    >
                      {getStatusText(receipt.status)}
                    </span>
                  </div>
                  <div className="receipt-details">
                    <p>来院日: {receipt.visit_date}</p>
                    <p>総額: ¥{receipt.total_amount.toLocaleString()}</p>
                    <p>保険適用: ¥{receipt.insurance_amount.toLocaleString()}</p>
                    <p>顧客負担: ¥{receipt.patient_amount.toLocaleString()}</p>
                  </div>
                  <div className="receipt-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => editReceipt(receipt.id)}
                    >
                      編集
                    </button>
                    <button 
                      className={`btn btn-sm ${receipt.status === 'draft' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          submitReceipt(receipt.id);
                        } catch (error) {
                          console.error('提出ボタンクリックエラー:', error);
                          alert('エラーが発生しました。ページを再読み込みしてください。');
                        }
                      }}
                      disabled={receipt.status !== 'draft'}
                    >
                      {receipt.status === 'draft' ? '提出' : '提出済み'}
                    </button>
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => printReceipt(receipt.id)}
                    >
                      印刷
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="generate-section">
            <h3>レセプト自動作成</h3>
            <div className="generate-info">
              <p>電子カルテの診療記録から自動的にレセプトを作成します。</p>
              <div className="feature-list">
                <h4>自動化機能</h4>
                <ul>
                  <li>診療内容の自動判定</li>
                  <li>保険点数自動計算</li>
                  <li>顧客負担額の自動算出</li>
                  <li>レセプト用紙の自動生成</li>
                </ul>
              </div>
            </div>
            <div className="generate-actions">
              <button className="btn btn-primary">
                診療記録から作成
              </button>
              <button className="btn btn-secondary">
                テンプレートから作成
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>レセプト設定</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>保険点数マスタ</label>
                <button className="btn btn-outline">管理</button>
              </div>
              <div className="setting-item">
                <label>レセプト用紙設定</label>
                <button className="btn btn-outline">設定</button>
              </div>
              <div className="setting-item">
                <label>自動提出設定</label>
                <button className="btn btn-outline">設定</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptManagement;
