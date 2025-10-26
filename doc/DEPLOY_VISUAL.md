# Cloudflare 网页版部署图解

通过截图和步骤说明，帮助你可视化地完成部署。

## 📋 部署架构图

```
GitHub 仓库 (dreameutopia/Memorize-vocabulary)
    ↓
    ↓ (自动同步)
    ↓
Cloudflare Pages (Worker)
    ↓
    ↓ (绑定)
    ↓
Cloudflare D1 Database (cet6_vocabulary)
    ├── users 表
    ├── vocabulary 表 (5523个单词)
    └── unknown_words 表
    ↓
    ↓
用户请求 → API 响应
```

---

## 第一步：创建 D1 数据库

### 1.1 进入 D1 管理页面

```
Cloudflare Dashboard
  └── 左侧菜单
      └── Workers & Pages
          └── D1 SQL Database
              └── [Create database] 按钮
```

**截图位置**：
- URL: `https://dash.cloudflare.com/`
- 路径: Workers & Pages → Overview → D1

### 1.2 创建数据库表单

```
┌─────────────────────────────────────┐
│  Create a database                  │
├─────────────────────────────────────┤
│                                     │
│  Database name *                    │
│  ┌─────────────────────────────┐   │
│  │ cet6_vocabulary             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Location                           │
│  ○ Automatic (recommended)          │
│  ○ Western North America            │
│  ○ Eastern North America            │
│  ○ Western Europe                   │
│  ○ Eastern Europe                   │
│                                     │
│  [Cancel]  [Create]                 │
└─────────────────────────────────────┘
```

**填写内容**：
- Database name: `cet6_vocabulary`
- Location: 选择 `Automatic`

### 1.3 数据库创建成功

创建后会显示数据库详情页：

```
┌────────────────────────────────────────────┐
│ cet6_vocabulary                            │
├────────────────────────────────────────────┤
│ Database ID: a1b2c3d4-e5f6-7890-abcd-ef123 │  ← 复制这个！
│ Created: 2025-10-27                        │
│ Size: 0 MB                                 │
├────────────────────────────────────────────┤
│ [Console] [Tables] [Settings]              │
└────────────────────────────────────────────┘
```

**重要**：复制 `Database ID` 并保存！

---

## 第二步：初始化表结构

### 2.1 打开数据库控制台

点击 **Console** 标签：

```
┌────────────────────────────────────────────┐
│ [Console] [Tables] [Settings]              │
├────────────────────────────────────────────┤
│                                            │
│  SQL Editor                                │
│  ┌────────────────────────────────────┐   │
│  │ -- Enter your SQL query here       │   │
│  │ SELECT * FROM ...                  │   │
│  │                                    │   │
│  │                                    │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Execute]                                 │
│                                            │
│  Results:                                  │
│  ┌────────────────────────────────────┐   │
│  │ No results yet                     │   │
│  └────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### 2.2 执行建表 SQL

将完整的建表 SQL 粘贴到编辑器中，点击 **Execute**。

### 2.3 验证表创建

点击 **Tables** 标签，应该看到：

```
┌────────────────────────────────────────────┐
│ Tables (3)                                 │
├────────────────────────────────────────────┤
│  📋 users                                  │
│     Columns: 6                             │
│     Rows: 0                                │
│                                            │
│  📋 vocabulary                             │
│     Columns: 10                            │
│     Rows: 0                                │
│                                            │
│  📋 unknown_words                          │
│     Columns: 4                             │
│     Rows: 0                                │
└────────────────────────────────────────────┘
```

✅ 看到 3 个表说明成功！

---

## 第三步：从 GitHub 部署 Worker

### 3.1 创建 Pages 项目

```
Workers & Pages
  └── [Create application]
      ├── Workers (创建新 Worker)
      └── Pages (从 Git 部署) ← 选这个
```

### 3.2 连接 GitHub

```
┌────────────────────────────────────────────┐
│ Create a Pages project                     │
├────────────────────────────────────────────┤
│                                            │
│  Connect your Git provider                │
│                                            │
│  [Connect GitHub]                          │
│                                            │
│  Already connected?                        │
│  Select your repository below              │
│                                            │
└────────────────────────────────────────────┘
```

点击 **Connect GitHub** 并授权。

### 3.3 选择仓库

授权后会显示仓库列表：

```
┌────────────────────────────────────────────┐
│ Select a repository                        │
├────────────────────────────────────────────┤
│  Search repositories...                    │
│  ┌────────────────────────────────────┐   │
│  │ dreameutopia/Memorize-vocabulary   │ ← │
│  └────────────────────────────────────┘   │
│                                            │
│  [Select]                                  │
└────────────────────────────────────────────┘
```

选择 `dreameutopia/Memorize-vocabulary`

### 3.4 配置构建设置

```
┌────────────────────────────────────────────┐
│ Set up builds and deployments              │
├────────────────────────────────────────────┤
│  Project name *                            │
│  ┌────────────────────────────────────┐   │
│  │ cet6-vocabulary-backend            │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Production branch                         │
│  ┌────────────────────────────────────┐   │
│  │ main                               │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Framework preset                          │
│  ┌────────────────────────────────────┐   │
│  │ None                               │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Root directory (optional)                 │
│  ┌────────────────────────────────────┐   │
│  │ /backend                           │ ← 重要! │
│  └────────────────────────────────────┘   │
│                                            │
│  Build command (optional)                  │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Build output directory (optional)         │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Save and Deploy]                         │
└────────────────────────────────────────────┘
```

**关键配置**：
- Project name: `cet6-vocabulary-backend`（可自定义）
- Production branch: `main`
- Root directory: `/backend` ⚠️ **必填**
- 其他留空

### 3.5 部署进行中

```
┌────────────────────────────────────────────┐
│ Deploying your site                        │
├────────────────────────────────────────────┤
│                                            │
│  ⏳ Initializing build environment         │
│  ✅ Cloning repository                     │
│  ✅ Installing dependencies                │
│  ⏳ Building application                   │
│  ⏳ Deploying to Cloudflare's edge         │
│                                            │
│  Estimated time: 1-2 minutes               │
└────────────────────────────────────────────┘
```

### 3.6 首次部署结果

⚠️ **预期结果**：首次部署可能显示成功，但 API 会报错（因为还没绑定数据库）

```
┌────────────────────────────────────────────┐
│ ✅ Deployment successful                   │
├────────────────────────────────────────────┤
│  Your site is live at:                     │
│  https://cet6-vocabulary-backend.pages.dev │
│                                            │
│  [View deployment] [View logs]             │
└────────────────────────────────────────────┘
```

---

## 第四步：绑定 D1 数据库

### 4.1 进入项目设置

```
项目页面顶部导航：
[Overview] [Deployments] [Analytics] [Settings] ← 点这里
```

### 4.2 找到 Functions 设置

```
Settings 左侧菜单：
├── General
├── Builds & deployments
├── Environment variables
├── Functions                    ← 点这里
├── Custom domains
└── ...
```

### 4.3 添加 D1 绑定

滚动到 **D1 database bindings** 部分：

```
┌────────────────────────────────────────────┐
│ D1 database bindings                       │
├────────────────────────────────────────────┤
│  No bindings configured                    │
│                                            │
│  [Add binding]                             │
└────────────────────────────────────────────┘
```

点击 **Add binding**：

```
┌────────────────────────────────────────────┐
│ Add D1 database binding                    │
├────────────────────────────────────────────┤
│  Variable name *                           │
│  ┌────────────────────────────────────┐   │
│  │ DB                                 │ ← 必须是 DB! │
│  └────────────────────────────────────┘   │
│                                            │
│  D1 database *                             │
│  ┌────────────────────────────────────┐   │
│  │ cet6_vocabulary                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Cancel]  [Save]                          │
└────────────────────────────────────────────┘
```

**重要**：
- Variable name: 必须是 `DB`（大写）
- D1 database: 选择 `cet6_vocabulary`

### 4.4 保存并重新部署

保存后，返回 **Deployments** 标签：

```
┌────────────────────────────────────────────┐
│ Production                                 │
├────────────────────────────────────────────┤
│  2025-10-27 12:34:56                       │
│  Deployed from main                        │
│  Status: Active                            │
│  ⋮ [Retry deployment]    ← 点这个           │
└────────────────────────────────────────────┘
```

点击 **Retry deployment** 重新部署。

---

## 第五步：导入单词数据

### 方式 1: 使用命令行（推荐）

在本地终端执行：

```bash
# Windows PowerShell
cd path\to\Memorize-vocabulary\backend
npm install
npx wrangler login
npm run generate-sql
npx wrangler d1 execute cet6_vocabulary --file=./data.sql
```

执行过程：

```
PS > npx wrangler login
Opening browser for authentication...
✅ Successfully logged in!

PS > npm run generate-sql
开始读取 vocabulary.json...
读取到 5523 个单词
正在生成 SQL 语句...
✅ 转换完成！

PS > npx wrangler d1 execute cet6_vocabulary --file=./data.sql
🌀 Executing on remote database cet6_vocabulary (a1b2c3d4-...)
🌀 Inserting data...
✅ Executed 56 commands in 3.2 seconds
```

### 方式 2: 验证数据导入

在 Cloudflare Dashboard 的 D1 Console 执行：

```sql
SELECT COUNT(*) as total FROM vocabulary;
```

结果应该显示：

```
┌───────┐
│ total │
├───────┤
│ 5523  │
└───────┘
```

✅ 看到 5523 说明导入成功！

---

## 第六步：验证部署

### 6.1 获取 API 地址

在项目页面顶部可以看到：

```
┌────────────────────────────────────────────┐
│ cet6-vocabulary-backend                    │
├────────────────────────────────────────────┤
│  🌐 https://cet6-vocabulary-backend.pages.dev │
│                                            │
│  Last deployed: 2 minutes ago              │
└────────────────────────────────────────────┘
```

### 6.2 测试 API

使用浏览器或命令行测试：

**测试 1: 浏览器访问**
```
https://cet6-vocabulary-backend.pages.dev/api/user/register
```

（会返回 405 错误，因为这是 POST 接口）

**测试 2: 使用 PowerShell**
```powershell
$body = @{
    deviceId = "test-device-123"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "https://cet6-vocabulary-backend.pages.dev/api/user/register" -Method POST -Body $body -ContentType "application/json"

Write-Host "User ID: $($result.data.userId)"
```

**测试 3: 使用 curl**
```bash
curl -X POST https://cet6-vocabulary-backend.pages.dev/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-123"}'
```

### 6.3 预期响应

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

✅ 看到这个响应说明部署成功！

---

## 监控面板概览

### Analytics 页面

```
┌────────────────────────────────────────────┐
│ Analytics - Last 24 hours                  │
├────────────────────────────────────────────┤
│                                            │
│  📊 Requests                               │
│      1,234 requests                        │
│      ▁▂▃▅▆▇█▇▆▅▃▂▁                        │
│                                            │
│  ⚡ Response Time                          │
│      avg: 45ms  p95: 120ms                │
│                                            │
│  ❌ Error Rate                             │
│      0.2% (2 errors)                       │
│                                            │
└────────────────────────────────────────────┘
```

### Logs 页面

```
┌────────────────────────────────────────────┐
│ Logs - Real-time stream                    │
├────────────────────────────────────────────┤
│  [Begin log stream]                        │
│                                            │
│  2025-10-27 12:45:23 INFO                  │
│  GET /api/user/stats?userId=xxx            │
│  → 200 OK (32ms)                           │
│                                            │
│  2025-10-27 12:45:25 INFO                  │
│  POST /api/words/submit                    │
│  → 200 OK (18ms)                           │
│                                            │
└────────────────────────────────────────────┘
```

---

## ✅ 部署完成检查清单

```
✅ Step 1: D1 数据库已创建
   └─ Database ID 已保存

✅ Step 2: 表结构已初始化
   ├─ users 表已创建
   ├─ vocabulary 表已创建
   └─ unknown_words 表已创建

✅ Step 3: Worker 已部署
   └─ 从 GitHub 自动部署

✅ Step 4: D1 数据库已绑定
   └─ 变量名: DB

✅ Step 5: 单词数据已导入
   └─ 5523 个单词

✅ Step 6: API 测试通过
   ├─ 注册接口正常
   ├─ 统计接口正常
   └─ 单词接口正常
```

---

## 🎉 恭喜！部署成功！

你的 API 地址：
```
https://cet6-vocabulary-backend.pages.dev
```

现在可以：
1. 开发前端应用
2. 配置自定义域名
3. 启用监控和告警
4. 分享给用户使用

---

## 📞 需要帮助？

- 📖 [完整部署文档](./CLOUDFLARE_DEPLOY.md)
- 📖 [API 接口文档](../API.md)
- 🌐 [Cloudflare 文档](https://developers.cloudflare.com/)
- 💬 [GitHub Issues](https://github.com/dreameutopia/Memorize-vocabulary/issues)
