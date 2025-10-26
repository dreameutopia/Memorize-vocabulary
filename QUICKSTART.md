# 快速启动指南

## 前置要求

1. 安装 Node.js (v16+)
2. 安装 Wrangler CLI: `npm install -g wrangler`
3. 拥有 Cloudflare 账户

## 快速开始

### 步骤 1: 登录 Cloudflare
```bash
wrangler login
```

### 步骤 2: 创建 D1 数据库
```bash
wrangler d1 create cet6_vocabulary
```

执行后会返回类似以下内容：
```
✅ Successfully created DB 'cet6_vocabulary'!

[[d1_databases]]
binding = "DB"
database_name = "cet6_vocabulary"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**: 将 `database_id` 复制到 `wrangler.toml` 文件中！

### 步骤 3: 初始化数据库表结构
```bash
npm run init-db
```

或者使用完整命令：
```bash
wrangler d1 execute cet6_vocabulary --file=./schema.sql
```

### 步骤 4: 启动本地开发服务器
```bash
npm run dev
```

服务器将在 `http://localhost:8787` 启动

### 步骤 5: 导入单词数据

有两种方式导入单词数据：

#### 方式1: 使用 SQL 文件（推荐，更快）
```bash
# 如果还没有 data.sql，先生成
python scripts/convert_to_sql.py

# 导入到本地数据库
wrangler d1 execute cet6_vocabulary --local --file=./data.sql

# 或导入到远程数据库（需要先创建远程数据库）
wrangler d1 execute cet6_vocabulary --file=./data.sql
```

#### 方式2: 通过 API 导入（需要 Worker 运行）
打开新终端，运行：
```bash
node scripts/init-data.js
```

这将通过 API 读取 `vocabulary.json` 并导入所有5523个单词到数据库。

### 步骤 6: 运行测试
```bash
node test/test.js
```

测试将验证所有API功能是否正常工作。

### 步骤 7: 部署到生产环境
```bash
npm run deploy
```

部署成功后，你会得到一个类似 `https://cet6-vocabulary-backend.your-subdomain.workers.dev` 的URL。

## 本地开发 vs 远程部署

### 本地开发（使用 --local）
```bash
wrangler dev --local
```
数据存储在本地文件，不会同步到云端。

### 远程开发（使用 --remote）
```bash
wrangler dev --remote
```
直接连接到云端D1数据库，所有操作都会影响生产数据。

**推荐**: 先使用 `--local` 进行开发测试，确认无误后再部署。

## 常见问题

### Q1: 数据库初始化失败
确保已经创建了D1数据库，并在 `wrangler.toml` 中配置了正确的 `database_id`。

### Q2: 导入数据时连接失败
确保本地开发服务器正在运行（`npm run dev`）。

### Q3: 测试失败
1. 确保本地服务器在运行
2. 确保已导入单词数据
3. 检查 `test/test.js` 中的 `BASE_URL` 是否正确

### Q4: 部署后API无响应
检查 Cloudflare Workers 的日志：
```bash
wrangler tail
```

## 生产环境配置

部署到生产后，更新前端代码中的API地址：

```javascript
const API_BASE = 'https://your-worker.workers.dev';
```

## 数据库管理

### 查询数据
```bash
wrangler d1 execute cet6_vocabulary --command="SELECT COUNT(*) FROM vocabulary"
```

### 导出数据（如果需要）
```bash
wrangler d1 export cet6_vocabulary --output=backup.sql
```

### 查看表结构
```bash
wrangler d1 execute cet6_vocabulary --command="SELECT sql FROM sqlite_master WHERE type='table'"
```

## API 测试示例

使用 curl 测试API：

```bash
# 注册用户
curl -X POST http://localhost:8787/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-123"}'

# 获取用户统计（替换YOUR_USER_ID）
curl "http://localhost:8787/api/user/stats?userId=YOUR_USER_ID"

# 获取学习单词
curl "http://localhost:8787/api/words/learn?userId=YOUR_USER_ID"
```

## 性能监控

在 Cloudflare Dashboard 中可以监控：
- 请求数量
- 响应时间
- 错误率
- D1 数据库查询性能

路径：Workers & Pages > 你的Worker > Metrics

## 下一步

- [ ] 配置自定义域名
- [ ] 添加认证机制
- [ ] 实现数据备份策略
- [ ] 添加日志和监控
- [ ] 优化数据库查询性能

## 技术支持

遇到问题？检查：
1. [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
2. [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
3. [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
