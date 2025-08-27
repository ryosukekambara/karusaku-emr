#!/bin/bash

# カルサク EMR サーバー起動スクリプト
# 作成日: 2025-08-27

# プロジェクトディレクトリに移動
cd /Users/kanbararyousuke/Projects/myapp

# ログディレクトリの作成
mkdir -p logs

# 現在の日時をログに記録
echo "$(date): サーバー起動開始" >> logs/startup.log

# Node.jsのパスを確認
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo "$(date): Node.jsが見つかりません" >> logs/error.log
    exit 1
fi

# サーバーファイルの存在確認
if [ ! -f "server.js" ]; then
    echo "$(date): server.jsが見つかりません" >> logs/error.log
    exit 1
fi

# 環境変数の設定
export NODE_ENV=production
export PORT=3001

# サーバー起動
echo "$(date): サーバーを起動します..." >> logs/startup.log
$NODE_PATH server.js >> logs/server.log 2>> logs/error.log &

# プロセスIDを保存
echo $! > logs/server.pid

echo "$(date): サーバー起動完了 (PID: $!)" >> logs/startup.log
