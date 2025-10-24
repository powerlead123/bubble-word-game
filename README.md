# 儿童背单词网站 🌟

一个专为儿童设计的互动式英语单词学习网站，支持自定义单词本和多种难度模式。

## 功能特点

### 📚 单词本管理
- 创建自定义单词本
- 编辑和删除已有单词本
- 支持中英文对照
- 本地存储，数据不丢失

### 🎮 游戏模式
- **简单模式**：部分字母提示，适合初学者
- **困难模式**：完全空白，挑战记忆力
- 智能焦点管理，自动跳转下一空格
- 字母按钮可重复使用

### 🎯 学习体验
- 彩色界面，适合儿童
- 自动评分和详细结果展示
- 响应式设计，支持手机和平板
- 流畅的答题流程

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **存储**：LocalStorage
- **部署**：Cloudflare Pages
- **版本控制**：Git + GitHub

## 快速开始

1. 克隆项目
```bash
git clone https://github.com/your-username/kids-vocabulary.git
cd kids-vocabulary
```

2. 直接打开 `index.html` 文件即可使用

3. 或者使用本地服务器
```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js
npx serve .
```

## 使用说明

### 创建单词本
1. 点击"创建单词本"
2. 输入单词本名称
3. 添加英文单词和对应中文意思
4. 保存单词本

### 开始学习
1. 点击"选择单词本"
2. 选择要学习的单词本
3. 选择难度模式：
   - **简单模式**：有字母提示
   - **困难模式**：完全空白
4. 开始答题

### 管理单词本
- **编辑**：修改单词本内容
- **删除**：删除不需要的单词本

## 项目结构

```
kids-vocabulary/
├── index.html          # 主页面
├── style.css          # 样式文件
├── script.js          # 主要逻辑
├── README.md          # 项目说明
└── .gitignore         # Git忽略文件
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 在线体验

🌐 [立即体验](https://your-site.pages.dev)

---

Made with ❤️ for kids learning English