# スクリーンショット置き場

このフォルダにスクリーンショットをアップロードできます。

## 使い方

### 自動アップロード（簡単）

1. スクリーンショットを撮る（Command + Shift + 4）
2. ターミナルで実行：
   ```bash
   cd ~/Projects/myapp
   ./upload-screenshot.sh
   ```

### 手動アップロード

```bash
cp ~/Desktop/スクリーンショット.png ~/Projects/myapp/screenshots/
```

### Claudeに見せる

アップロード後、Claudeに次のように伝えてください：
```
screenshots/ファイル名.png を見て
```

例：
```
screenshots/スクリーンショット 2025-10-22 15.19.41.png を見て
```
