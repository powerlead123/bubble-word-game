# 部署指南 🚀

## 步骤1：准备GitHub仓库

### 1.1 初始化Git仓库
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: 儿童背单词网站"
```

### 1.2 创建GitHub仓库
1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 仓库名称：`kids-vocabulary`
4. 描述：`儿童背单词学习网站`
5. 设置为 Public（公开）
6. 不要勾选 "Add a README file"（我们已经有了）
7. 点击 "Create repository"

### 1.3 推送代码到GitHub
```bash
# 添加远程仓库（替换为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/kids-vocabulary.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤2：部署到Cloudflare Pages

### 2.1 登录Cloudflare
1. 访问 [Cloudflare](https://cloudflare.com)
2. 登录你的账户（没有账户的话先注册）

### 2.2 创建Pages项目
1. 在Cloudflare仪表板中，点击左侧的 "Pages"
2. 点击 "Create a project"
3. 选择 "Connect to Git"

### 2.3 连接GitHub
1. 点击 "Connect GitHub"
2. 授权Cloudflare访问你的GitHub账户
3. 选择 `kids-vocabulary` 仓库

### 2.4 配置部署设置
```
项目名称: kids-vocabulary
生产分支: main
构建设置:
  - Framework preset: None
  - Build command: (留空)
  - Build output directory: /
  - Root directory: /
```

### 2.5 部署
1. 点击 "Save and Deploy"
2. 等待部署完成（通常1-2分钟）
3. 部署成功后，你会得到一个类似 `https://kids-vocabulary.pages.dev` 的网址

## 步骤3：自定义域名（可选）

### 3.1 添加自定义域名
1. 在Pages项目中，点击 "Custom domains"
2. 点击 "Set up a custom domain"
3. 输入你的域名（如：`vocabulary.yourdomain.com`）
4. 按照提示配置DNS记录

### 3.2 SSL证书
Cloudflare会自动为你的域名提供免费的SSL证书。

## 步骤4：后续更新

每次更新代码后：
```bash
git add .
git commit -m "更新描述"
git push
```

Cloudflare Pages会自动检测到更新并重新部署。

## 环境变量（如果需要）

在Cloudflare Pages中设置环境变量：
1. 进入你的Pages项目
2. 点击 "Settings" > "Environment variables"
3. 添加需要的环境变量

## 故障排除

### 常见问题
1. **部署失败**：检查代码是否有语法错误
2. **页面无法访问**：确认DNS设置正确
3. **样式不显示**：检查文件路径是否正确

### 查看部署日志
1. 在Pages项目中点击具体的部署
2. 查看 "Build log" 了解详细信息

## 性能优化

### 已配置的优化
- ✅ 静态资源缓存
- ✅ 安全头部设置
- ✅ 响应式设计
- ✅ 本地存储

### 建议的优化
- 启用Cloudflare的 "Auto Minify"
- 启用 "Brotli" 压缩
- 配置 "Page Rules" 进一步优化缓存

## 监控和分析

### Cloudflare Analytics
在Pages项目中可以查看：
- 访问量统计
- 性能指标
- 错误日志

### 建议添加
- Google Analytics（可选）
- 用户反馈收集

---

🎉 恭喜！你的儿童背单词网站现在已经在线了！

访问地址：`https://your-project-name.pages.dev`