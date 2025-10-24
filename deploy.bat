@echo off
chcp 65001 >nul
echo 🚀 开始部署儿童背单词网站...

REM 检查是否在Git仓库中
if not exist ".git" (
    echo 📁 初始化Git仓库...
    git init
)

REM 添加所有文件
echo 📝 添加文件到Git...
git add .

REM 提交更改
echo 💾 提交更改...
set /p commit_message="请输入提交信息 (默认: 更新网站): "
if "%commit_message%"=="" set commit_message=更新网站
git commit -m "%commit_message%"

REM 检查是否有远程仓库
git remote | findstr origin >nul
if errorlevel 1 (
    echo 🔗 请先添加GitHub远程仓库：
    echo git remote add origin https://github.com/YOUR_USERNAME/kids-vocabulary.git
    pause
    exit /b 1
)

REM 推送到GitHub
echo ⬆️ 推送到GitHub...
git push origin main

echo ✅ 部署完成！
echo 🌐 Cloudflare Pages会自动检测更新并重新部署
echo 📱 请访问你的网站查看更新
pause