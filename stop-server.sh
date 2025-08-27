#!/bin/bash

# カルサク EMR サーバー停止スクリプト
# 作成日: 2025-08-27

# プロジェクトディレクトリに移動
cd /Users/kanbararyousuke/Projects/myapp

# 現在の日時をログに記録
echo "$(date): サーバー停止開始" >> logs/startup.log

# PIDファイルからプロセスIDを取得
if [ -f "logs/server.pid" ]; then
    PID=$(cat logs/server.pid)
    echo "$(date): プロセスID $PID を停止します..." >> logs/startup.log
    
    # プロセスの存在確認
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "$(date): プロセス $PID を停止しました" >> logs/startup.log
    else
        echo "$(date): プロセス $PID は既に停止しています" >> logs/startup.log
    fi
    
    # PIDファイルを削除
    rm -f logs/server.pid
else
    echo "$(date): PIDファイルが見つかりません" >> logs/startup.log
fi

# ポート3001を使用しているプロセスを強制停止
echo "$(date): ポート3001のプロセスを確認..." >> logs/startup.log
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "$(date): サーバー停止完了" >> logs/startup.log
