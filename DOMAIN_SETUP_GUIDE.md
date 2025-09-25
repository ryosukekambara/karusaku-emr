# 🌐 カスタムドメイン設定ガイド

## 📋 概要

カルサク電子カルテシステムにカスタムドメインを設定するためのガイドです。

**現在のURL**: https://karusaku-emr-aeza.onrender.com

## 🎯 推奨ドメイン名

### 医療機関向けドメイン例
- `karusaku-emr.com`
- `karusaku-medical.com`
- `karusaku-clinic.com`
- `karusaku-hospital.com`

### 地域特化ドメイン例
- `karusaku-tokyo.com`
- `karusaku-osaka.com`
- `karusaku-medical.jp`

## 🔧 Render.comでの設定手順

### 1. ドメイン購入
1. ドメイン登録業者でドメインを購入
   - 推奨: Namecheap, GoDaddy, お名前.com
2. ドメイン管理画面にアクセス

### 2. Render.comでの設定
1. Renderダッシュボードにログイン
2. `karusaku-emr` サービスを選択
3. 「Settings」タブをクリック
4. 「Custom Domains」セクションを探す
5. 「Add Custom Domain」をクリック
6. 購入したドメインを入力
7. 「Add」をクリック

### 3. DNS設定
Renderが提供するDNS設定情報をドメイン管理画面で設定：

#### Aレコード設定
```
Type: A
Name: @
Value: [Renderが提供するIPアドレス]
TTL: 3600
```

#### CNAMEレコード設定
```
Type: CNAME
Name: www
Value: karusaku-emr-aeza.onrender.com
TTL: 3600
```

### 4. SSL証明書の自動設定
- Renderは自動的にSSL証明書を発行
- 設定完了まで数分〜数時間かかる場合があります

## 🔒 SSL証明書設定

### 自動SSL証明書
- RenderはLet's Encryptを使用してSSL証明書を自動発行
- ドメイン設定後、自動的にHTTPSが有効になります

### 手動SSL証明書（オプション）
1. 独自のSSL証明書を購入
2. Renderの「SSL Certificates」セクションで設定
3. 証明書ファイルをアップロード

## 📊 DNS設定確認

### 設定確認コマンド
```bash
# DNS設定確認
nslookup your-domain.com

# SSL証明書確認
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### オンラインツール
- [DNS Checker](https://dnschecker.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

## ⚙️ 環境変数設定

### ドメイン変更後の設定
```bash
# 環境変数に新しいドメインを設定
DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com/api
```

## 🔄 リダイレクト設定

### wwwリダイレクト
```javascript
// server/index.js に追加
app.use((req, res, next) => {
  if (req.hostname === 'www.your-domain.com') {
    return res.redirect(301, `https://your-domain.com${req.url}`);
  }
  next();
});
```

### HTTP to HTTPS リダイレクト
```javascript
// HTTPS強制リダイレクト
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## 📱 モバイルアプリ対応

### PWA設定
```json
// manifest.json 更新
{
  "name": "カルサク電子カルテ",
  "short_name": "カルサク",
  "start_url": "https://your-domain.com",
  "display": "standalone",
  "theme_color": "#27AE60",
  "background_color": "#ffffff"
}
```

## 🔍 SEO設定

### メタタグ設定
```html
<!-- index.html に追加 -->
<meta name="description" content="カルサク電子カルテシステム - 医療機関向け電子カルテ">
<meta name="keywords" content="電子カルテ,医療,カルテ,システム">
<meta property="og:title" content="カルサク電子カルテシステム">
<meta property="og:description" content="医療機関向け電子カルテシステム">
<meta property="og:url" content="https://your-domain.com">
<meta property="og:type" content="website">
```

### サイトマップ生成
```javascript
// サイトマップ生成スクリプト
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
```

## 🚨 トラブルシューティング

### よくある問題

#### ドメインが反映されない
1. DNS設定の反映を待つ（最大48時間）
2. DNSキャッシュをクリア
3. 異なるDNSサーバーで確認

#### SSL証明書エラー
1. ドメイン設定が正しいか確認
2. DNS設定が完了しているか確認
3. RenderのSSL証明書ステータスを確認

#### リダイレクトループ
1. リダイレクト設定を確認
2. 環境変数を確認
3. ブラウザキャッシュをクリア

## 📞 サポート

### ドメイン設定サポート
- Renderサポート: support@render.com
- ドメイン業者サポート
- システム管理者

### 設定完了確認
1. 新しいドメインでアクセス
2. HTTPS接続確認
3. 全機能の動作確認
4. モバイル対応確認

---

**注意**: ドメイン設定は本番環境への影響があるため、慎重に行ってください。
