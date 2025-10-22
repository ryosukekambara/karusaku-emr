#!/bin/bash
# スクリーンショットをアップロードするスクリプト

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCREENSHOTS_DIR="$SCRIPT_DIR/screenshots"

echo "📸 スクリーンショットアップローダー"
echo ""

# 引数でパスが指定された場合
if [ -n "$1" ]; then
    if [ -f "$1" ]; then
        FILENAME=$(basename "$1")
        cp "$1" "$SCREENSHOTS_DIR/$FILENAME"
        echo "✅ アップロード成功！"
        echo ""
        echo "ファイル: $FILENAME"
        echo "保存先: screenshots/$FILENAME"
        echo ""
        echo "📝 Claudeに次のように伝えてください："
        echo "   「screenshots/$FILENAME を見て」"
        exit 0
    else
        echo "❌ ファイルが見つかりません: $1"
        exit 1
    fi
fi

echo "【使い方】"
echo ""
echo "方法1: ドラッグ&ドロップ"
echo "  ターミナルに「./upload-screenshot.sh 」と入力して、"
echo "  スクリーンショットをドラッグ&ドロップしてEnter"
echo ""
echo "方法2: 直接指定"
echo "  ./upload-screenshot.sh ~/Desktop/スクリーンショット....png"
echo ""
echo "方法3: 最新のスクリーンショットを自動検索"
echo "  そのままEnterを押してください..."
read -p ""

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
