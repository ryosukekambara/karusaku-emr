#!/bin/bash
# スクリーンショットをアップロードするスクリプト

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"

echo "📸 スクリーンショットアップローダー"
echo ""
echo "デスクトップのスクリーンショットを探しています..."
echo ""

# 複数の場所を探す
DESKTOP_PATHS=(
    "$HOME/Desktop"
    "/Users/$USER/Desktop"
    "/home/$USER/Desktop"
)

LATEST_SCREENSHOT=""
for DESKTOP in "${DESKTOP_PATHS[@]}"; do
    if [ -d "$DESKTOP" ]; then
        FOUND=$(ls -t "$DESKTOP"/スクリーンショット*.png "$DESKTOP"/Screenshot*.png "$DESKTOP"/screenshot*.png 2>/dev/null | head -1)
        if [ -n "$FOUND" ]; then
            LATEST_SCREENSHOT="$FOUND"
            break
        fi
    fi
done

if [ -z "$LATEST_SCREENSHOT" ]; then
    echo "❌ スクリーンショットが見つかりません"
    echo ""
    echo "【使い方】"
    echo "1. スクリーンショットを撮る（Command + Shift + 4）"
    echo "2. ターミナルで実行: cd ~/Projects/myapp && ./upload-screenshot.sh"
    echo ""
    echo "【手動でアップロード】"
    echo "スクリーンショットのフルパスを指定："
    echo "./upload-screenshot.sh /path/to/screenshot.png"
    exit 1
fi

# プロジェクトフォルダにコピー
FILENAME=$(basename "$LATEST_SCREENSHOT")
cp "$LATEST_SCREENSHOT" "$SCREENSHOTS_DIR/$FILENAME"

echo "✅ アップロード成功！"
echo ""
echo "ファイル: $FILENAME"
echo "保存先: screenshots/$FILENAME"
echo ""
echo "📝 Claudeに次のように伝えてください："
echo "   「screenshots/$FILENAME を見て」"
