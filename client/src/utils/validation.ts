// バリデーションルールの型定義
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  date?: boolean;
  custom?: (value: any, data?: any) => boolean;
  message?: string;
}

// バリデーションエラーの型定義
export interface ValidationError {
  field: string;
  message: string;
}

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// バリデーションルールの定義
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'この項目は必須です'
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `${length}文字以上で入力してください`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `${length}文字以下で入力してください`
  }),

  pattern: (regex: RegExp, message?: string): ValidationRule => ({
    pattern: regex,
    message: message || '入力形式が正しくありません'
  }),

  email: (message?: string): ValidationRule => ({
    email: true,
    message: message || '有効なメールアドレスを入力してください'
  }),

  phone: (message?: string): ValidationRule => ({
    phone: true,
    message: message || '有効な電話番号を入力してください'
  }),

  date: (message?: string): ValidationRule => ({
    date: true,
    message: message || '有効な日付を入力してください'
  }),

  custom: (validator: (value: any, data?: any) => boolean, message?: string): ValidationRule => ({
    custom: validator,
    message: message || '入力内容が正しくありません'
  })
};

// バリデータークラス
export class Validator {
  private rules: { [key: string]: ValidationRule[] } = {};

  // フィールドにルールを追加
  addRule(field: string, rule: ValidationRule): Validator {
    if (!this.rules[field]) {
      this.rules[field] = [];
    }
    this.rules[field].push(rule);
    return this;
  }

  // 複数のルールを追加
  addRules(field: string, rules: ValidationRule[]): Validator {
    rules.forEach(rule => this.addRule(field, rule));
    return this;
  }

  // バリデーション実行
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = this.getNestedValue(data, field);

      for (const rule of rules) {
        const error = this.validateField(field, value, rule, data);
        if (error) {
          errors.push(error);
          break; // 最初のエラーで停止
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // フィールドのバリデーション
  private validateField(field: string, value: any, rule: ValidationRule, data?: any): ValidationError | null {
    // 必須チェック
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        field,
        message: rule.message || 'この項目は必須です'
      };
    }

    // 値が空の場合は他のチェックをスキップ
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // 最小長チェック
    if (rule.minLength && String(value).length < rule.minLength) {
      return {
        field,
        message: rule.message || `${rule.minLength}文字以上で入力してください`
      };
    }

    // 最大長チェック
    if (rule.maxLength && String(value).length > rule.maxLength) {
      return {
        field,
        message: rule.message || `${rule.maxLength}文字以下で入力してください`
      };
    }

    // パターンチェック
    if (rule.pattern && !rule.pattern.test(String(value))) {
      return {
        field,
        message: rule.message || '入力形式が正しくありません'
      };
    }

    // メールチェック
    if (rule.email && !this.isValidEmail(String(value))) {
      return {
        field,
        message: rule.message || '有効なメールアドレスを入力してください'
      };
    }

    // 電話番号チェック
    if (rule.phone && !this.isValidPhone(String(value))) {
      return {
        field,
        message: rule.message || '有効な電話番号を入力してください'
      };
    }

    // 日付チェック
    if (rule.date && !this.isValidDate(String(value))) {
      return {
        field,
        message: rule.message || '有効な日付を入力してください'
      };
    }

    // カスタムチェック
    if (rule.custom && !rule.custom(value, data)) {
      return {
        field,
        message: rule.message || '入力内容が正しくありません'
      };
    }

    return null;
  }

  // ネストしたオブジェクトから値を取得
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // メールアドレスの検証
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 電話番号の検証
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    return phoneRegex.test(phone) && phone.replace(/[\d\-\+\(\)\s]/g, '').length === 0;
  }

  // 日付の検証
  private isValidDate(date: string): boolean {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  // ルールをクリア
  clearRules(): Validator {
    this.rules = {};
    return this;
  }

  // 特定フィールドのルールをクリア
  clearFieldRules(field: string): Validator {
    delete this.rules[field];
    return this;
  }
}

// 患者データのバリデーション
export const createPatientValidator = (): Validator => {
  return new Validator()
    .addRule('name', validationRules.required('患者名は必須です'))
    .addRule('name', validationRules.maxLength(100, '患者名は100文字以下で入力してください'))
    .addRule('date_of_birth', validationRules.required('生年月日は必須です'))
    .addRule('date_of_birth', validationRules.date('有効な生年月日を入力してください'))
    .addRule('gender', validationRules.required('性別は必須です'))
    .addRule('phone', validationRules.phone('有効な電話番号を入力してください'))
    .addRule('email', validationRules.email('有効なメールアドレスを入力してください'))
    .addRule('email', validationRules.maxLength(255, 'メールアドレスは255文字以下で入力してください'));
};

// 施術者データのバリデーション
export const createTherapistValidator = (): Validator => {
  return new Validator()
    .addRule('name', validationRules.required('施術者名は必須です'))
    .addRule('name', validationRules.maxLength(100, '施術者名は100文字以下で入力してください'))
    .addRule('license_number', validationRules.required('資格番号は必須です'))
    .addRule('license_number', validationRules.maxLength(50, '資格番号は50文字以下で入力してください'))
    .addRule('specialty', validationRules.maxLength(100, '専門分野は100文字以下で入力してください'))
    .addRule('phone', validationRules.phone('有効な電話番号を入力してください'))
    .addRule('email', validationRules.email('有効なメールアドレスを入力してください'))
    .addRule('email', validationRules.maxLength(255, 'メールアドレスは255文字以下で入力してください'));
};

// 医療記録データのバリデーション
export const createMedicalRecordValidator = (): Validator => {
  return new Validator()
    .addRule('patient_id', validationRules.required('患者は必須です'))
    .addRule('therapist_id', validationRules.required('施術者は必須です'))
    .addRule('visit_date', validationRules.required('診療日は必須です'))
    .addRule('visit_date', validationRules.date('有効な診療日を入力してください'))
    .addRule('symptoms', validationRules.maxLength(1000, '症状は1000文字以下で入力してください'))
    .addRule('diagnosis', validationRules.maxLength(1000, '診断は1000文字以下で入力してください'))
    .addRule('treatment', validationRules.maxLength(1000, '治療は1000文字以下で入力してください'))
    .addRule('prescription', validationRules.maxLength(1000, '処方は1000文字以下で入力してください'))
    .addRule('notes', validationRules.maxLength(1000, '備考は1000文字以下で入力してください'));
};

// 予約データのバリデーション
export const createAppointmentValidator = (): Validator => {
  return new Validator()
    .addRule('patient_id', validationRules.required('患者は必須です'))
    .addRule('therapist_id', validationRules.required('施術者は必須です'))
    .addRule('appointment_date', validationRules.required('予約日時は必須です'))
    .addRule('appointment_date', validationRules.date('有効な予約日時を入力してください'))
    .addRule('duration_minutes', validationRules.required('診療時間は必須です'))
    .addRule('duration_minutes', validationRules.custom(
      (value) => [30, 60, 90, 120].includes(Number(value)),
      '診療時間は30分、60分、90分、120分のいずれかを選択してください'
    ))
    .addRule('notes', validationRules.maxLength(500, '備考は500文字以下で入力してください'));
};

// ユーザーデータのバリデーション
export const createUserValidator = (): Validator => {
  return new Validator()
    .addRule('username', validationRules.required('ユーザー名は必須です'))
    .addRule('username', validationRules.minLength(3, 'ユーザー名は3文字以上で入力してください'))
    .addRule('username', validationRules.maxLength(50, 'ユーザー名は50文字以下で入力してください'))
    .addRule('username', validationRules.pattern(/^[a-zA-Z0-9_]+$/, 'ユーザー名は英数字とアンダースコアのみ使用できます'))
    .addRule('password', validationRules.required('パスワードは必須です'))
    .addRule('password', validationRules.minLength(8, 'パスワードは8文字以上で入力してください'))
    .addRule('password', validationRules.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字、小文字、数字を含む必要があります'))
    .addRule('email', validationRules.email('有効なメールアドレスを入力してください'))
    .addRule('email', validationRules.maxLength(255, 'メールアドレスは255文字以下で入力してください'));
};

// 設定データのバリデーション
export const createSettingsValidator = (): Validator => {
  return new Validator()
    .addRule('clinic_name', validationRules.required('クリニック名は必須です'))
    .addRule('clinic_name', validationRules.maxLength(100, 'クリニック名は100文字以下で入力してください'))
    .addRule('clinic_phone', validationRules.phone('有効な電話番号を入力してください'))
    .addRule('clinic_email', validationRules.email('有効なメールアドレスを入力してください'))
    .addRule('data_retention_days', validationRules.custom(
      (value) => Number(value) >= 30 && Number(value) <= 3650,
      'データ保持期間は30日から3650日の間で設定してください'
    ));
};

import React, { useState, useCallback } from 'react';

// React Hook for validation
export const useValidation = (validator: Validator, data: any) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback(() => {
    const result = validator.validate(data);
    setErrors(result.errors);
    setIsValid(result.isValid);
    return result;
  }, [validator, data]);

  const validateField = useCallback((field: string) => {
    const result = validator.validate(data);
    const fieldError = result.errors.find(error => error.field === field);
    return fieldError ? fieldError.message : null;
  }, [validator, data]);

  return {
    errors,
    isValid,
    validate,
    validateField,
    setErrors
  };
};
