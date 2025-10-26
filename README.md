# 六级单词刷词软件后端

基于 Cloudflare Workers 和 D1 数据库实现的六级单词学习系统后端。

## 📚 快速导航

### 部署指南
- 🚀 [5分钟快速部署](./doc/DEPLOY_QUICK.md) - 最简化流程
- 📖 [完整部署指南](./doc/CLOUDFLARE_DEPLOY.md) - 详细步骤说明
- 🎨 [图解部署教程](./doc/DEPLOY_VISUAL.md) - 可视化操作指南
- 💻 [本地测试说明](./LOCAL_TEST.md) - 本地开发和测试

### 开发文档
- 📝 [API 接口文档](./API.md) - 完整的 API 说明
- 📊 [项目总览](./PROJECT.md) - 项目架构和技术说明
- 💾 [数据导入指南](./DATA_IMPORT.md) - 两种数据导入方式

### 快速开始
- 🏃 [快速启动指南](./QUICKSTART.md) - 命令行部署流程
- ✅ [部署检查清单](./DEPLOYMENT.md) - 确保部署无遗漏

## 功能特性

- ✅ 多租户系统，支持多用户
- ✅ 学习模式：按顺序学习单词
- ✅ 复习模式：复习不认识的单词
- ✅ 数据持久化：使用 Cloudflare D1 数据库
- ✅ 高性能：索引优化，查询快速

## 技术栈

- Cloudflare Workers
- Cloudflare D1 Database
- TypeScript
- Node.js (用于测试和脚本)

## 项目结构

```
backend/
├── src/
│   └── index.ts              # Worker主文件
├── doc/
│   ├── CLOUDFLARE_DEPLOY.md  # 网页版部署完整指南
│   ├── DEPLOY_QUICK.md       # 5分钟快速部署
│   └── DEPLOY_VISUAL.md      # 图解部署教程
├── test/
│   └── test.js               # 测试脚本
├── scripts/
│   ├── init-data.js          # API数据初始化脚本
│   └── convert_to_sql.py     # SQL文件生成脚本
├── schema.sql                # 数据库表结构
├── vocabulary.json           # 单词数据（5523个六级单词）
├── package.json              # 依赖配置
├── tsconfig.json             # TypeScript配置
├── wrangler.toml             # Cloudflare配置
└── README.md                 # 项目文档
```

## API 接口

### 1. 注册用户
**POST** `/api/user/register`

请求体：
```json
{
  "deviceId": "device-unique-id"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "userId": "generated-uuid"
  }
}
```

### 2. 获取用户统计
**GET** `/api/user/stats?userId={userId}`

响应：
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "studyDays": 5,
    "learnedCount": 100,
    "remainingCount": 5423
  }
}
```

### 3. 获取学习单词
**GET** `/api/words/learn?userId={userId}`

响应：
```json
{
  "success": true,
  "data": {
    "words": [
      {
        "id": 1,
        "word": "abandon",
        "phonetic": "/əˈbændən/",
        "meaning": "v. 遗弃；离开；放弃...",
        "example": "",
        "exampleCn": "",
        "memorize": "",
        "learned": 0,
        "reviewCount": 0
      }
      // ... 最多20个单词
    ],
    "offset": 0
  }
}
```

### 4. 提交学习结果
**POST** `/api/words/submit`

请求体：
```json
{
  "userId": "user-id",
  "wordId": 1,
  "known": false
}
```

响应：
```json
{
  "success": true,
  "data": {
    "message": "Word result submitted successfully"
  }
}
```

### 5. 获取复习单词
**GET** `/api/words/review?userId={userId}`

响应：
```json
{
  "success": true,
  "data": {
    "words": [
      // 随机最多20个不认识的单词
    ],
    "count": 10
  }
}
```

### 6. 完成复习
**POST** `/api/words/review-complete`

请求体：
```json
{
  "userId": "user-id",
  "wordId": 1
}
```

响应：
```json
{
  "success": true,
  "data": {
    "message": "Word removed from review list"
  }
}
```

## 部署步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 创建 D1 数据库
```bash
# 创建数据库
wrangler d1 create cet6_vocabulary

# 记录返回的 database_id，并更新到 wrangler.toml
```

### 3. 初始化数据库表
```bash
npm run init-db
```

### 4. 启动本地开发服务器
```bash
npm run dev
```

### 5. 导入单词数据

**方式1: 使用 SQL 文件（推荐）**
```bash
# 生成 SQL 文件
python scripts/convert_to_sql.py

# 导入数据
wrangler d1 execute cet6_vocabulary --local --file=./data.sql
```

**方式2: 通过 API 导入**
在另一个终端运行：
```bash
node scripts/init-data.js
```

### 6. 运行测试
```bash
npm test
```

### 7. 部署到生产环境
```bash
npm run deploy
```

## 数据库设计

### users 表
- user_id: 用户ID（主键）
- device_id: 设备ID（唯一）
- study_days: 学习天数
- learned_count: 已学习单词数
- last_study_date: 最后学习日期
- created_at: 创建时间

### vocabulary 表
- id: 单词ID（主键）
- word: 单词
- phonetic: 音标
- meaning: 释义
- example: 例句
- exampleCn: 例句中文
- memorize: 记忆方法
- learned: 是否已学习
- reviewCount: 复习次数
- random_order: 随机顺序（用于打乱）

### unknown_words 表
- id: 自增ID（主键）
- user_id: 用户ID（外键）
- word_id: 单词ID（外键）
- created_at: 创建时间
- 唯一约束：(user_id, word_id)

## 性能优化

1. **索引优化**
   - device_id 索引：快速查找用户
   - random_order 索引：快速分页
   - (user_id, word_id) 复合索引：快速查询和去重

2. **查询优化**
   - 使用 LIMIT 限制返回数量
   - 使用 OFFSET 实现分页
   - 使用 RANDOM() 随机选择复习单词

3. **数据库设计**
   - 单词顺序预先打乱并存储
   - 使用整数类型提高查询效率
   - 避免复杂的 JOIN 操作

## 测试说明

测试脚本 `test/test.js` 包含11个测试用例：

1. 注册用户
2. 重复注册用户
3. 获取用户统计数据
4. 获取学习单词
5. 提交学习结果（认识）
6. 提交学习结果（不认识）
7. 验证用户统计更新
8. 获取复习单词
9. 完成复习
10. 验证复习列表更新
11. 测试分页功能

运行测试前确保本地开发服务器正在运行。

## 注意事项

1. **database_id 配置**：部署前必须在 `wrangler.toml` 中配置正确的 database_id

2. **CORS 配置**：当前允许所有来源（*），生产环境建议限制具体域名

3. **数据导入**：初次部署需要运行 `init-data.js` 导入单词数据

4. **学习天数计算**：基于最后学习日期自动更新，每天首次访问时增加

## 许可证

MIT
