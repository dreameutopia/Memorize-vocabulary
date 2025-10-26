# Cloudflare 网页版部署完整指南

本指南将教你如何通过 Cloudflare Dashboard（网页版）直接从 GitHub 仓库部署六级单词刷词软件后端，包括 Worker 和 D1 数据库的完整配置。

## 📋 前置准备

### 1. 账号准备
- ✅ GitHub 账号（已有仓库：`dreameutopia/Memorize-vocabulary`）
- ✅ Cloudflare 账号（免费套餐即可）
- ✅ 确保代码已推送到 GitHub

### 2. 仓库结构检查
确保你的仓库包含以下文件：
```
backend/
├── src/index.ts          # Worker 代码
├── schema.sql            # 数据库表结构
├── data.sql              # 单词数据（需要生成）
├── wrangler.toml         # Cloudflare 配置
├── package.json          # 依赖配置
└── tsconfig.json         # TypeScript 配置
```

## 🚀 部署步骤

---

## 第一步：创建 D1 数据库

### 1.1 登录 Cloudflare Dashboard
访问 [https://dash.cloudflare.com/](https://dash.cloudflare.com/) 并登录

### 1.2 进入 D1 数据库管理
1. 在左侧菜单找到 **Workers & Pages**
2. 点击 **D1 SQL Database**
3. 点击右上角 **Create database** 按钮

![D1 创建入口](https://developers.cloudflare.com/assets/d1-dashboard-create_hu86e4c0e4ad399866a684abfd03d3d35e_29234_1242x0_resize_q75_box.jpg)

### 1.3 配置数据库
- **Database name**: `cet6_vocabulary`
- **Location**: 选择 `Automatic`（自动选择最近的数据中心）
- 点击 **Create** 创建

### 1.4 记录数据库 ID
创建成功后，你会看到数据库详情页：
- 找到 **Database ID**（格式类似：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
- **重要**：复制保存这个 ID，稍后配置时需要用到

---

## 第二步：初始化数据库表结构

### 2.1 在数据库详情页执行 SQL

1. 在 `cet6_vocabulary` 数据库页面
2. 点击 **Console** 标签
3. 复制以下 SQL 并粘贴到控制台：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    study_days INTEGER DEFAULT 0,
    learned_count INTEGER DEFAULT 0,
    last_study_date TEXT,
    created_at TEXT NOT NULL
);

-- 为设备ID创建索引
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- 单词表
CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    exampleCn TEXT,
    memorize TEXT,
    learned INTEGER DEFAULT 0,
    reviewCount INTEGER DEFAULT 0,
    random_order INTEGER NOT NULL
);

-- 为随机顺序创建索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_random_order ON vocabulary(random_order);

-- 不认识的单词关联表
CREATE TABLE IF NOT EXISTS unknown_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (word_id) REFERENCES vocabulary(id),
    UNIQUE(user_id, word_id)
);

-- 为用户ID和单词ID创建索引
CREATE INDEX IF NOT EXISTS idx_unknown_words_user_id ON unknown_words(user_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_word_id ON unknown_words(word_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_user_word ON unknown_words(user_id, word_id);
```

4. 点击 **Execute** 执行
5. 看到成功提示后，点击 **Tables** 标签验证表已创建

### 2.2 验证表结构
在 **Tables** 标签应该看到：
- ✅ users
- ✅ vocabulary
- ✅ unknown_words

---

## 第三步：通过 GitHub 部署 Worker

### 3.1 创建 Worker 项目

1. 返回 Cloudflare Dashboard
2. 点击 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**

### 3.2 连接 GitHub

1. 点击 **Connect GitHub**
2. 授权 Cloudflare 访问你的 GitHub 账号
3. 选择仓库：**dreameutopia/Memorize-vocabulary**
4. 点击 **Install & Authorize**

### 3.3 配置构建设置

**Set up builds and deployments** 页面配置：

- **Project name**: `cet6-vocabulary-backend`（或自定义名称）
- **Production branch**: `main`
- **Framework preset**: `None`（选择 None）
- **Build command**: 留空或填 `npm run build`
- **Build output directory**: 留空或填 `/`
- **Root directory**: `/backend`（重要！指向 backend 目录）

### 3.4 环境变量（暂时跳过）
点击 **Save and Deploy**

⚠️ **注意**：首次部署可能会失败，这是正常的，因为还没有绑定 D1 数据库。

---

## 第四步：配置 Worker 绑定 D1 数据库

### 4.1 进入 Worker 设置

1. 部署完成后，进入项目页面
2. 点击 **Settings** 标签
3. 在左侧菜单找到 **Functions**

### 4.2 绑定 D1 数据库

1. 滚动到 **D1 database bindings** 部分
2. 点击 **Add binding**
3. 配置绑定：
   - **Variable name**: `DB`（必须与代码中的 `Env.DB` 一致）
   - **D1 database**: 选择 `cet6_vocabulary`
4. 点击 **Save**

### 4.3 重新部署

1. 点击 **Deployments** 标签
2. 点击最新部署右侧的 **⋮** 菜单
3. 选择 **Retry deployment**

或者：
1. 回到 GitHub 推送一个新的 commit
2. Cloudflare 会自动重新部署

---

## 第五步：导入单词数据

现在 Worker 已部署成功，需要导入 5523 个单词数据。

### 方式 1: 使用 Wrangler CLI（推荐）

如果你有本地环境：

```bash
# 1. 克隆仓库（如果还没有）
git clone https://github.com/dreameutopia/Memorize-vocabulary.git
cd Memorize-vocabulary/backend

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 生成 SQL 文件
npm run generate-sql

# 5. 导入数据到远程数据库
npx wrangler d1 execute cet6_vocabulary --file=./data.sql
```

### 方式 2: 通过 Dashboard Console（手动，较慢）

⚠️ **警告**：这种方式需要手动复制粘贴大量 SQL，非常不推荐。

1. 在本地生成 `data.sql`
2. 打开 D1 数据库的 **Console**
3. 分批复制粘贴 SQL 语句（每次最多 1000 行）
4. 重复直到全部导入

### 方式 3: 通过 Worker API（需要开启接口）

1. 访问你的 Worker URL：`https://cet6-vocabulary-backend.pages.dev`
2. 调用初始化接口（需要准备好 vocabulary.json）：

```bash
curl -X POST https://cet6-vocabulary-backend.pages.dev/api/init \
  -H "Content-Type: application/json" \
  -d @vocabulary.json
```

⚠️ **安全提示**：生产环境应该移除或保护 `/api/init` 接口

---

## 第六步：验证部署

### 6.1 获取 Worker URL

部署成功后，在项目页面顶部可以看到：
```
https://cet6-vocabulary-backend.pages.dev
```

或自定义域名：
```
https://your-custom-domain.com
```

### 6.2 测试 API

#### 测试 1: 注册用户
```bash
curl -X POST https://cet6-vocabulary-backend.pages.dev/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-123"}'
```

预期响应：
```json
{
  "success": true,
  "data": {
    "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

#### 测试 2: 获取用户统计
```bash
curl "https://cet6-vocabulary-backend.pages.dev/api/user/stats?userId=YOUR_USER_ID"
```

#### 测试 3: 获取学习单词
```bash
curl "https://cet6-vocabulary-backend.pages.dev/api/words/learn?userId=YOUR_USER_ID"
```

### 6.3 验证数据库

在 Cloudflare Dashboard:
1. 进入 D1 数据库 `cet6_vocabulary`
2. 点击 **Console**
3. 执行查询：
```sql
SELECT COUNT(*) as count FROM vocabulary;
```

应该返回：
```
count: 5523
```

---

## 第七步：配置自定义域名（可选）

### 7.1 添加自定义域名

1. 在 Worker 项目页面
2. 点击 **Custom domains** 标签
3. 点击 **Set up a custom domain**
4. 输入你的域名（如：`api.yourdomain.com`）
5. 点击 **Continue**

### 7.2 配置 DNS

Cloudflare 会自动为你配置 DNS 记录（如果域名在 Cloudflare）。

如果域名不在 Cloudflare：
1. 按照提示添加 CNAME 记录
2. 等待 DNS 生效（通常几分钟到几小时）

---

## 🔧 高级配置

### 环境变量

如果需要添加环境变量（如 API 密钥）：

1. 进入 Worker 项目 **Settings**
2. 找到 **Environment variables**
3. 点击 **Add variable**
4. 配置变量名和值
5. 点击 **Save**

### 配置 CORS

如果需要限制允许的域名，修改 `src/index.ts` 中的 CORS 配置：

```typescript
function handleCORS(response?: Response): Response {
  const headers = {
    'Access-Control-Allow-Origin': 'https://your-frontend-domain.com', // 修改这里
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  // ...
}
```

然后推送到 GitHub，Cloudflare 会自动重新部署。

### Rate Limiting（速率限制）

在 Cloudflare Dashboard 配置速率限制：

1. 进入 **Security** → **WAF**
2. 创建 Rate Limiting Rule
3. 配置规则（如：每分钟最多 100 请求）

---

## 📊 监控和日志

### 查看实时日志

1. 进入 Worker 项目页面
2. 点击 **Logs** 标签
3. 选择 **Begin log stream**
4. 发送请求测试，实时查看日志

### 查看分析数据

1. 点击 **Analytics** 标签
2. 查看：
   - 请求数量
   - 响应时间
   - 错误率
   - CPU 使用时间

### 设置告警

1. 点击 **Notifications** 标签
2. 配置告警规则（如：错误率超过 5%）
3. 选择通知方式（邮件、Webhook 等）

---

## 🔄 持续部署

### 自动部署流程

配置完成后，每次推送到 GitHub 的 `main` 分支：
1. Cloudflare 自动检测到变更
2. 自动构建和部署 Worker
3. 几秒钟后生效

### 查看部署历史

1. 点击 **Deployments** 标签
2. 查看所有部署记录
3. 可以回滚到任意历史版本

### 部署预览

推送到非主分支时：
1. Cloudflare 创建预览部署
2. 获得独立的预览 URL
3. 测试无误后再合并到主分支

---

## ❗ 常见问题

### Q1: 部署失败：找不到 wrangler.toml
**解决方案**：
- 确保 Root directory 设置为 `/backend`
- 检查 wrangler.toml 文件是否在 backend 目录下

### Q2: API 返回 500 错误
**解决方案**：
1. 检查 D1 数据库绑定是否正确（变量名必须是 `DB`）
2. 查看 Logs 标签的错误信息
3. 确认表结构已创建

### Q3: 数据库查询返回空
**解决方案**：
- 确认已导入单词数据
- 在 D1 Console 执行 `SELECT COUNT(*) FROM vocabulary` 验证

### Q4: CORS 错误
**解决方案**：
- 检查前端请求的域名是否在允许列表
- 修改 `handleCORS` 函数中的 `Access-Control-Allow-Origin`

### Q5: 如何更新代码？
**解决方案**：
```bash
# 本地修改代码后
git add .
git commit -m "更新描述"
git push origin main

# Cloudflare 会自动重新部署
```

### Q6: 如何查看数据库大小？
**解决方案**：
在 D1 数据库页面，顶部会显示当前存储使用量。

### Q7: 免费套餐够用吗？
**解决方案**：
Cloudflare 免费套餐包含：
- Workers: 100,000 请求/天
- D1: 5GB 存储，5,000,000 读取/天
- 对于中小型应用完全足够 ✅

---

## 🔐 安全建议

### 1. 移除初始化接口
生产环境应该注释或删除 `/api/init` 接口：

```typescript
// 注释掉这部分
// if (path === '/api/init' && request.method === 'POST') {
//   return handleCORS(await initDatabase(request, env));
// }
```

### 2. 添加认证
考虑添加简单的 API Key 认证：

```typescript
const API_KEY = env.API_KEY; // 从环境变量读取

if (request.headers.get('X-API-Key') !== API_KEY) {
  return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
}
```

### 3. 限制 CORS
生产环境限制特定域名：

```typescript
'Access-Control-Allow-Origin': 'https://your-app.com'
```

---

## 📝 部署检查清单

部署完成后，确认以下内容：

- [ ] ✅ D1 数据库已创建（`cet6_vocabulary`）
- [ ] ✅ 表结构已初始化（3个表）
- [ ] ✅ Worker 已部署成功
- [ ] ✅ D1 数据库已绑定（变量名 `DB`）
- [ ] ✅ 单词数据已导入（5523个）
- [ ] ✅ API 测试通过（注册、查询等）
- [ ] ✅ 自定义域名已配置（如需要）
- [ ] ✅ 监控和日志已启用
- [ ] ✅ 安全配置已完成

---

## 🎯 总结

### 部署流程回顾

```
1. 创建 D1 数据库 (cet6_vocabulary)
   ↓
2. 初始化表结构 (执行 schema.sql)
   ↓
3. 通过 GitHub 部署 Worker
   ↓
4. 绑定 D1 数据库 (变量名: DB)
   ↓
5. 导入单词数据 (5523个单词)
   ↓
6. 验证部署和测试 API
   ↓
7. 配置域名和安全设置
   ↓
✅ 部署完成！
```

### 核心要点

1. **D1 数据库 ID** 必须正确配置
2. **绑定变量名** 必须是 `DB`
3. **Root directory** 必须设置为 `/backend`
4. **数据导入** 建议使用 Wrangler CLI
5. **安全配置** 生产环境必须做好防护

### 获取帮助

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [GitHub 仓库](https://github.com/dreameutopia/Memorize-vocabulary)

---

**恭喜！你的六级单词刷词软件后端已成功部署到 Cloudflare！** 🎉

现在可以开始开发前端应用，使用部署的 API 地址进行对接了。
