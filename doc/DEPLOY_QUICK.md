# Cloudflare 网页版快速部署（5分钟）

最简化的部署流程，适合快速上手。

## ⚡ 5步快速部署

### 步骤 1: 创建 D1 数据库（1分钟）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单：**Workers & Pages** → **D1 SQL Database**
3. 点击 **Create database**
4. 数据库名称：`cet6_vocabulary`
5. 点击 **Create**
6. **重要**：复制 **Database ID**（后面要用）

### 步骤 2: 初始化表结构（1分钟）

1. 在数据库页面，点击 **Console** 标签
2. 复制粘贴以下完整 SQL：

<details>
<summary>点击展开 SQL 代码（复制全部）</summary>

```sql
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    study_days INTEGER DEFAULT 0,
    learned_count INTEGER DEFAULT 0,
    last_study_date TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

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

CREATE INDEX IF NOT EXISTS idx_vocabulary_random_order ON vocabulary(random_order);

CREATE TABLE IF NOT EXISTS unknown_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (word_id) REFERENCES vocabulary(id),
    UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_unknown_words_user_id ON unknown_words(user_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_word_id ON unknown_words(word_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_user_word ON unknown_words(user_id, word_id);
```

</details>

3. 点击 **Execute**
4. 验证：点击 **Tables** 标签，应该看到 3 个表

### 步骤 3: 部署 Worker（2分钟）

1. 返回 **Workers & Pages**
2. 点击 **Create application** → **Pages** → **Connect to Git**
3. 授权并选择仓库：`dreameutopia/Memorize-vocabulary`
4. 配置：
   - Project name: `cet6-vocabulary-backend`
   - Production branch: `main`
   - Root directory: `/backend` ⚠️ **重要**
   - 其他留空
5. 点击 **Save and Deploy**

### 步骤 4: 绑定数据库（30秒）

1. 部署完成后，进入项目 **Settings**
2. 左侧菜单找到 **Functions**
3. 滚动到 **D1 database bindings**
4. 点击 **Add binding**：
   - Variable name: `DB` ⚠️ **必须是 DB**
   - D1 database: `cet6_vocabulary`
5. 点击 **Save**
6. 返回 **Deployments** → 点击最新部署的 **⋮** → **Retry deployment**

### 步骤 5: 导入单词数据（30秒）

**本地执行**（推荐，需要 Node.js）：

```bash
# 克隆仓库
git clone https://github.com/dreameutopia/Memorize-vocabulary.git
cd Memorize-vocabulary/backend

# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 生成并导入数据
npm run generate-sql
npx wrangler d1 execute cet6_vocabulary --file=./data.sql
```

**完成！** 🎉

---

## ✅ 验证部署

访问你的 Worker URL（在项目页面顶部）：
```
https://cet6-vocabulary-backend.pages.dev
```

测试注册接口：
```bash
curl -X POST https://cet6-vocabulary-backend.pages.dev/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-123"}'
```

应该返回：
```json
{
  "success": true,
  "data": {
    "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

验证单词数据：
```bash
curl "https://cet6-vocabulary-backend.pages.dev/api/words/learn?userId=YOUR_USER_ID"
```

---

## 🔥 常见错误速查

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| 500 Internal Error | 未绑定数据库 | 检查步骤4，变量名必须是 `DB` |
| 404 Not Found | Root directory 错误 | 设置为 `/backend` |
| 单词返回空数组 | 数据未导入 | 执行步骤5导入数据 |
| CORS 错误 | 前端域名未允许 | 修改代码中的 CORS 配置 |

---

## 📱 获取 API 地址

部署成功后，你的 API 基础地址为：
```
https://cet6-vocabulary-backend.pages.dev
```

或者配置自定义域名：
```
https://api.your-domain.com
```

### API 接口列表

- `POST /api/user/register` - 注册用户
- `GET /api/user/stats?userId=xxx` - 用户统计
- `GET /api/words/learn?userId=xxx` - 获取学习单词
- `POST /api/words/submit` - 提交学习结果
- `GET /api/words/review?userId=xxx` - 获取复习单词
- `POST /api/words/review-complete` - 完成复习

详细 API 文档见 [API.md](../API.md)

---

## 🚀 下一步

- [ ] 配置自定义域名
- [ ] 开发前端应用
- [ ] 启用监控和告警
- [ ] 配置 Rate Limiting

完整部署文档：[CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)

---

**总耗时：约 5 分钟**

如有问题，查看完整部署指南或访问 [Cloudflare 文档](https://developers.cloudflare.com/workers/)
