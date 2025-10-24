#!/bin/bash

# 儿童背单词网站部署脚本

echo "🚀 开始部署儿童背单词网站..."

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo "📁 初始化Git仓库..."
    git init
fi

# 添加所有文件
echo "📝 添加文件到Git..."
git add .

# 提交更改
echo "💾 提交更改..."
read -p "请输入提交信息 (默认: 更新网站): " commit_message
commit_message=${commit_message:-"更新网站"}
git commit -m "$commit_message"

# 检查是否有远程仓库
if ! git remote | grep -q origin; then
    echo "🔗 请先添加GitHub远程仓库："
    echo "git remote add origin https://github.com/YOUR_USERNAME/kids-vocabulary.git"
    exit 1
fi

# 推送到GitHub
echo "⬆️ 推送到GitHub..."
git push origin main

echo "✅ 部署完成！"
echo "🌐 Cloudflare Pages会自动检测更新并重新部署"
echo "📱 请访问你的网站查看更新"