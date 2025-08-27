#!/bin/bash

# カルサク EMR サーバー管理スクリプト
# 作成日: 2025-08-27

PROJECT_DIR="/Users/kanbararyousuke/Projects/myapp"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# 色付きメッセージ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo -e "${BLUE}カルサク EMR サーバー管理スクリプト${NC}"
    echo ""
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  start-always     - 常時起動モードを有効化（ログイン時に自動起動）"
    echo "  start-business   - 営業時間起動モードを有効化（平日8:00に起動）"
    echo "  start-ondemand   - オンデマンド起動モードを有効化（アクセス時に起動）"
    echo "  stop             - サーバーを停止"
    echo "  restart          - サーバーを再起動"
    echo "  status           - サーバーの状態を確認"
    echo "  logs             - ログを表示"
    echo "  help             - このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 start-always   # 常時起動モード"
    echo "  $0 status         # 状態確認"
}

# サーバー状態確認
check_status() {
    echo -e "${BLUE}=== サーバー状態 ===${NC}"
    
    # プロセス確認
    if pgrep -f "node server.js" > /dev/null; then
        echo -e "${GREEN}✅ サーバーは起動中です${NC}"
        PID=$(pgrep -f "node server.js")
        echo "プロセスID: $PID"
    else
        echo -e "${RED}❌ サーバーは停止中です${NC}"
    fi
    
    # ポート確認
    if lsof -i:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ポート3001でリッスン中${NC}"
    else
        echo -e "${RED}❌ ポート3001でリッスンしていません${NC}"
    fi
    
    # LaunchAgent確認
    echo ""
    echo -e "${BLUE}=== LaunchAgent状態 ===${NC}"
    launchctl list | grep karusaku || echo "LaunchAgentは登録されていません"
}

# 常時起動モード
start_always() {
    echo -e "${BLUE}常時起動モードを設定中...${NC}"
    
    # 既存のLaunchAgentを停止
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.business.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.ondemand.plist" 2>/dev/null
    
    # 常時起動LaunchAgentを有効化
    cp "$PROJECT_DIR/com.karusaku.emr.plist" "$LAUNCH_AGENTS_DIR/"
    launchctl load "$LAUNCH_AGENTS_DIR/com.karusaku.emr.plist"
    
    echo -e "${GREEN}✅ 常時起動モードが有効化されました${NC}"
    echo "サーバーはログイン時に自動起動し、常時稼働します"
}

# 営業時間起動モード
start_business() {
    echo -e "${BLUE}営業時間起動モードを設定中...${NC}"
    
    # 既存のLaunchAgentを停止
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.business.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.ondemand.plist" 2>/dev/null
    
    # 営業時間起動LaunchAgentを有効化
    cp "$PROJECT_DIR/com.karusaku.emr.business.plist" "$LAUNCH_AGENTS_DIR/"
    launchctl load "$LAUNCH_AGENTS_DIR/com.karusaku.emr.business.plist"
    
    echo -e "${GREEN}✅ 営業時間起動モードが有効化されました${NC}"
    echo "サーバーは平日8:00に自動起動します"
}

# オンデマンド起動モード
start_ondemand() {
    echo -e "${BLUE}オンデマンド起動モードを設定中...${NC}"
    
    # 既存のLaunchAgentを停止
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.business.plist" 2>/dev/null
    launchctl unload "$LAUNCH_AGENTS_DIR/com.karusaku.emr.ondemand.plist" 2>/dev/null
    
    # オンデマンド起動LaunchAgentを有効化
    cp "$PROJECT_DIR/com.karusaku.emr.ondemand.plist" "$LAUNCH_AGENTS_DIR/"
    launchctl load "$LAUNCH_AGENTS_DIR/com.karusaku.emr.ondemand.plist"
    
    echo -e "${GREEN}✅ オンデマンド起動モードが有効化されました${NC}"
    echo "サーバーは初回アクセス時に自動起動します（起動時間: 2-3秒）"
}

# メイン処理
case "$1" in
    "start-always")
        start_always
        ;;
    "start-business")
        start_business
        ;;
    "start-ondemand")
        start_ondemand
        ;;
    "stop")
        echo -e "${YELLOW}サーバーを停止中...${NC}"
        "$PROJECT_DIR/stop-server.sh"
        ;;
    "restart")
        echo -e "${YELLOW}サーバーを再起動中...${NC}"
        "$PROJECT_DIR/stop-server.sh"
        sleep 2
        "$PROJECT_DIR/start-server.sh"
        ;;
    "status")
        check_status
        ;;
    "logs")
        echo -e "${BLUE}=== ログファイル ===${NC}"
        if [ -f "$PROJECT_DIR/logs/server.log" ]; then
            echo -e "${GREEN}サーバーログ:${NC}"
            tail -20 "$PROJECT_DIR/logs/server.log"
        fi
        if [ -f "$PROJECT_DIR/logs/error.log" ]; then
            echo -e "${RED}エラーログ:${NC}"
            tail -20 "$PROJECT_DIR/logs/error.log"
        fi
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 不明なオプション: $1${NC}"
        show_help
        exit 1
        ;;
esac
