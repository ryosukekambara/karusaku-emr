import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    birth_year: '',
    birth_month: '',
    birth_day: '',
    gender: '',
    phone: '',
    postal_code: '',
    address: '',
    emergency_contact: '',
    // 保険情報
    insurance_card_number: '',
    insurance_type: '',
    insurance_holder: '',
    insurance_relationship: '',
    insurance_valid_until: '',
    // 傷病情報
    diagnoses: ['', ''], // 複数の主訴を配列で管理
    medical_history: '',
    allergies: '',
    medications: ''
  });

  // 保険者番号の選択肢（実際の保険者番号）
  const insuranceCardNumbers = [
    '01010001', // 全国健康保険協会
    '01010002', // 全国健康保険協会
    '01010003', // 全国健康保険協会
    '01010004', // 全国健康保険協会
    '01010005', // 全国健康保険協会
    '01010006', // 全国健康保険協会
    '01010007', // 全国健康保険協会
    '01010008', // 全国健康保険協会
    '01010009', // 全国健康保険協会
    '01010010', // 全国健康保険協会
    '01020001', // 組合管掌健康保険
    '01020002', // 組合管掌健康保険
    '01020003', // 組合管掌健康保険
    '01020004', // 組合管掌健康保険
    '01020005', // 組合管掌健康保険
    '02010001', // 国民健康保険
    '02010002', // 国民健康保険
    '02010003', // 国民健康保険
    '02010004', // 国民健康保険
    '02010005', // 国民健康保険
    '03010001', // 後期高齢者医療制度
    '03010002', // 後期高齢者医療制度
    '03010003', // 後期高齢者医療制度
    '03010004', // 後期高齢者医療制度
    '03010005', // 後期高齢者医療制度
    '04010001', // 船員保険
    '04010002', // 船員保険
    '04010003', // 船員保険
    '05010001', // 共済組合
    '05010002', // 共済組合
    '05010003', // 共済組合
    '05010004', // 共済組合
    '05010005', // 共済組合
    '06010001', // 国家公務員共済組合
    '06010002', // 国家公務員共済組合
    '06010003', // 国家公務員共済組合
    '07010001', // 地方公務員等共済組合
    '07010002', // 地方公務員等共済組合
    '07010003', // 地方公務員等共済組合
    '08010001', // 私立学校教職員共済
    '08010002', // 私立学校教職員共済
    '08010003', // 私立学校教職員共済
    '09010001', // 生活保護
    '09010002', // 生活保護
    '09010003', // 生活保護
    '10010001', // 自費
    '10010002', // 自費
    '10010003'  // 自費
  ];

  // 保険種別の選択肢
  const insuranceTypes = [
    '全国健康保険協会',
    '組合管掌健康保険',
    '国民健康保険',
    '後期高齢者医療制度',
    '船員保険',
    '共済組合',
    '国家公務員共済組合',
    '地方公務員等共済組合',
    '私立学校教職員共済',
    '生活保護',
    '自費'
  ];

  // 被保険者名の選択肢（頭文字で絞り込み）
  const insuranceHolders = [
    '佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤',
    '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水',
    '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川',
    '前田', '岡田', '長谷川', '藤田', '近藤', '青木', '福田', '西村', '坂本', '遠藤',
    '岡本', '松田', '中川', '中野', '原田', '小野', '田村', '竹内', '金子', '和田',
    '中山', '石田', '上田', '原', '柴田', '酒井', '工藤', '横山', '宮崎', '宮本',
    '内田', '高木', '安藤', '島田', '谷口', '大野', '高田', '丸山', '今井', '河野',
    '新井', '北村', '武田', '上野', '松井', '荒木', '大塚', '平野', '菅原', '野村',
    '松尾', '菊地', '野口', '久保', '木下', '佐野', '松岡', '後藤', '松本', '星野',
    '広瀬', '関', '森田', '安田', '新田', '堀', '桜井', '渡部', '岩崎', '飯田',
    '古川', '増田', '藤井', '西田', '岡本', '大西', '小島', '平田', '藤原', '中尾',
    '田口', '岡崎', '永井', '中西', '岩田', '太田', '原口', '小池', '水野', '吉川',
    '阿部', '石塚', '福田', '松浦', '川口', '村上', '武藤', '上原', '杉山', '市川',
    '高野', '森本', '秋山', '三浦', '服部', '西尾', '辻本', '菊池', '山内', '永田',
    '野崎', '松村', '大島', '小西', '北川', '安部', '川崎', '成田', '平井', '岩本',
    '片山', '千葉', '河村', '近藤', '松崎', '松本', '西川', '田辺', '新井', '高橋',
    '小林', '中村', '佐藤', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'
  ];

  // 傷病名の選択肢
  const diagnosisOptions = [
    '腰痛症',
    '頸部痛',
    '肩こり',
    '膝関節痛',
    '股関節痛',
    '坐骨神経痛',
    '椎間板ヘルニア',
    '脊柱管狭窄症',
    '変形性関節症',
    '腱鞘炎',
    'テニス肘',
    'ゴルフ肘',
    '五十肩',
    '捻挫',
    '骨折',
    '脱臼',
    '筋挫傷',
    '神経痛',
    'リウマチ',
    'その他'
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredHolders, setFilteredHolders] = useState<string[]>([]);
  const [showHolderSuggestions, setShowHolderSuggestions] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 郵便番号が入力された場合、住所を自動取得
    if (name === 'postal_code' && value.length === 7) {
      fetchAddressFromPostalCode(value);
    }

    // 被保険者名の絞り込み
    if (name === 'insurance_holder') {
      if (value.length > 0) {
        const filtered = insuranceHolders.filter(holder => 
          holder.startsWith(value)
        );
        setFilteredHolders(filtered.slice(0, 10)); // 最大10件表示
        setShowHolderSuggestions(true);
      } else {
        setFilteredHolders([]);
        setShowHolderSuggestions(false);
      }
    }
  };

  // 郵便番号から住所を取得
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    try {
      // 複数の郵便番号APIを試行
      const apis = [
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`,
        `https://api.zipaddress.net/?zipcode=${postalCode}`,
        `https://zip-api.herokuapp.com/api/${postalCode}`
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            // zipcloud.ibsnet.co.jp API
            const result = data.results[0];
            const address = `${result.address1}${result.address2}${result.address3}`;
            setFormData(prev => ({
              ...prev,
              address: address
            }));
            return;
          } else if (data.code && data.data) {
            // api.zipaddress.net API
            const address = data.data.address;
            setFormData(prev => ({
              ...prev,
              address: address
            }));
            return;
          } else if (data.zip && data.address) {
            // zip-api.herokuapp.com API
            const address = data.address;
            setFormData(prev => ({
              ...prev,
              address: address
            }));
            return;
          }
        } catch (apiError) {
          console.log(`API ${apiUrl} でエラー:`, apiError);
          continue;
        }
      }
      
      console.log('すべての郵便番号APIで住所が見つかりませんでした');
    } catch (error) {
      console.error('住所の取得に失敗しました:', error);
    }
  };

  // 被保険者名の候補を選択
  const selectInsuranceHolder = (holder: string) => {
    setFormData(prev => ({
      ...prev,
      insurance_holder: holder
    }));
    setShowHolderSuggestions(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // 月が変更された場合、日をリセット
      if (name === 'birth_month') {
        newData.birth_day = '';
      }
      
      // 年、月、日がすべて選択された場合、date_of_birthを更新
      if (newData.birth_year && newData.birth_month && newData.birth_day) {
        newData.date_of_birth = `${newData.birth_year}-${newData.birth_month}-${newData.birth_day}`;
      }
      
      return newData;
    });
  };

  // 月に応じた日の選択肢を生成
  const getDaysInMonth = (year: string, month: string) => {
    if (!year || !month) return 31;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '顧客の登録に失敗しました');
      }

      // 登録成功後、顧客一覧に戻る
      navigate('/patients');
    } catch (err) {
      setError(err instanceof Error ? err.message : '顧客の登録に失敗しました');
    } finally {
      setLoading(false);
    }

  // 和暦変換関数
  const getJapaneseEra = (year: number): string => {
    if (year >= 2019) return `令和${year - 2018}年`;
    if (year >= 1989) return `平成${year - 1988}年`;
    if (year >= 1926) return `昭和${year - 1925}年`;
    return "";
  };
  };
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>新規顧客登録</h1>
        <button onClick={() => navigate('/patients')} className="btn btn-secondary">
          戻る
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">氏名 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="date_of_birth">生年月日 *</label>
            
            {/* 選択式入力 */}
            <div className="date-input-group" style={{ marginBottom: '10px' }}>
              <select
                id="birth_year"
                name="birth_year"
                value={formData.birth_year || ''}
                onChange={handleDateChange}
                required
                disabled={loading}
                className="date-select"
                style={{ maxHeight: '200px' }}
              >
                <option value="">年</option>
                {Array.from({ length: 96 }, (_, i) => 2025 - i).reverse().map(year => (
                  <option key={year} value={year}>{year}年（{getJapaneseEra(year)}）</option>
                ))}
              </select>
              <select
                id="birth_month"
                name="birth_month"
                value={formData.birth_month || ''}
                onChange={handleDateChange}
                required
                disabled={loading}
                className="date-select"
                style={{ maxHeight: '200px' }}
              >
                <option value="">月</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month.toString().padStart(2, '0')}>
                    {month}月
                  </option>
                ))}
              </select>
              <select
                id="birth_day"
                name="birth_day"
                value={formData.birth_day || ''}
                onChange={handleDateChange}
                required
                disabled={loading}
                className="date-select"
                style={{ maxHeight: '200px' }}
              >
                <option value="">日</option>
                {Array.from({ length: getDaysInMonth(formData.birth_year, formData.birth_month) }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day.toString().padStart(2, '0')}>
                    {day}日
                  </option>
                ))}
              </select>
          </div>
            </div>
            

          <div className="form-group">
            <label htmlFor="gender">性別 *</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">電話番号</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              placeholder="例: 090-1234-5678"
            />
          </div>

          <div className="form-group">
            <label htmlFor="postal_code">郵便番号</label>
            <input
              type="tel"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              disabled={loading}
              placeholder="例: 1234567"
              maxLength={7}
              pattern="[0-9]{7}"
            />
            <small className="form-help">7桁の数字を入力すると住所が自動で入力されます</small>
          </div>

          <div className="form-group">
            <label htmlFor="address">住所</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
              placeholder="住所を入力してください"
            />
          </div>

          <div className="form-group">
            <label htmlFor="emergency_contact">緊急連絡先</label>
            <input
              type="text"
              id="emergency_contact"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              disabled={loading}
              placeholder="緊急時の連絡先を入力してください"
            />
          </div>

          {/* 保険情報セクション */}
          <div className="form-section">
            <h3>保険情報</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="insurance_card_number">保険証番号</label>
                <select
                  id="insurance_card_number"
                  name="insurance_card_number"
                  value={formData.insurance_card_number}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">選択してください</option>
                  {insuranceCardNumbers.map(number => (
                    <option key={number} value={number}>{number}</option>
                  ))}
                  <option value="custom">その他（手動入力）</option>
                </select>
                {formData.insurance_card_number === 'custom' && (
                  <input
                    type="text"
                    name="insurance_card_number_custom"
                    placeholder="保険証番号を入力してください"
                    className="mt-2"
                    style={{ marginTop: '0.5rem' }}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      insurance_card_number: e.target.value
                    }))}
                  />
                )}
              </div>
              <div className="form-group">
                <label htmlFor="insurance_type">保険種別</label>
                <select
                  id="insurance_type"
                  name="insurance_type"
                  value={formData.insurance_type}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">選択してください</option>
                  {insuranceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="insurance_holder">被保険者名</label>
                <div className="input-with-suggestions">
                  <input
                    type="text"
                    id="insurance_holder"
                    name="insurance_holder"
                    value={formData.insurance_holder}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="頭文字を入力すると候補が表示されます"
                  />
                  {showHolderSuggestions && filteredHolders.length > 0 && (
                    <div className="suggestions-dropdown">
                      {filteredHolders.map((holder, index) => (
                        <div
                          key={index}
                          className="suggestion-item"
                          onClick={() => selectInsuranceHolder(holder)}
                        >
                          {holder}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="insurance_relationship">続柄</label>
                <select
                  id="insurance_relationship"
                  name="insurance_relationship"
                  value={formData.insurance_relationship}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">選択してください</option>
                  <option value="本人">本人</option>
                  <option value="配偶者">配偶者</option>
                  <option value="子">子</option>
                  <option value="父母">父母</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="insurance_valid_until">有効期限</label>
              <input
                type="date"
                id="insurance_valid_until"
                name="insurance_valid_until"
                value={formData.insurance_valid_until}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* 傷病情報セクション */}
          <div className="form-section">
            <h3>傷病情報</h3>
            <div className="form-group">
              <label>主訴（複数選択可）</label>
              <div className="diagnosis-selection">
                {formData.diagnoses.map((diagnosis, index) => (
                  <div key={index} className="diagnosis-item">
                    <select
                      value={diagnosis}
                      onChange={(e) => {
                        const newDiagnoses = [...formData.diagnoses];
                        newDiagnoses[index] = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          diagnoses: newDiagnoses
                        }));
                      }}
                      disabled={loading}
                    >
                      <option value="">選択してください</option>
                      {diagnosisOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {diagnosis === 'その他' && (
                      <input
                        type="text"
                        placeholder="主訴を入力してください"
                        className="mt-2"
                        style={{ marginTop: '0.5rem' }}
                        onChange={(e) => {
                          const newDiagnoses = [...formData.diagnoses];
                          newDiagnoses[index] = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            diagnoses: newDiagnoses
                          }));
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="remove-diagnosis-btn"
                      onClick={() => {
                        const newDiagnoses = formData.diagnoses.filter((_, i) => i !== index);
                        setFormData(prev => ({
                          ...prev,
                          diagnoses: newDiagnoses
                        }));
                      }}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-diagnosis-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      diagnoses: [...prev.diagnoses, '']
                    }));
                  }}
                  disabled={loading}
                >
                  ＋ 主訴を追加
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="medical_history">既往歴</label>
              <textarea
                id="medical_history"
                name="medical_history"
                value={formData.medical_history}
                onChange={handleChange}
                disabled={loading}
                placeholder="過去の病気や手術歴など"
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="allergies">アレルギー</label>
                <input
                  type="text"
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="例: 花粉症、薬物アレルギー"
                />
              </div>
              <div className="form-group">
                <label htmlFor="medications">常用薬</label>
                <input
                  type="text"
                  id="medications"
                  name="medications"
                  value={formData.medications}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="例: 血圧降下剤、糖尿病薬"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? '登録中...' : '顧客を登録'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/patients')}
              disabled={loading}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatient;
