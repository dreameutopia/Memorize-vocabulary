# 数据导入说明

本项目提供两种方式导入单词数据到 D1 数据库。

## 方式对比

| 特性 | SQL 文件导入 | API 导入 |
|------|-------------|----------|
| 速度 | ⚡ 快（几秒） | 🐌 慢（几分钟） |
| 依赖 | Python | Worker 运行中 |
| 适用场景 | 首次部署、数据恢复 | 动态更新 |
| 推荐程度 | ✅ 推荐 | ⚠️ 备选 |

## 方式1: SQL 文件导入（推荐）

### 优点
- ⚡ **速度快**：直接执行 SQL，几秒钟完成
- 🎯 **可靠性高**：原生数据库操作，不经过网络
- 🔄 **可重复**：可以多次导入，适合测试
- 📦 **易于备份**：SQL 文件可以版本控制

### 使用步骤

#### 1. 生成 SQL 文件（只需一次）
```bash
python scripts/convert_to_sql.py
```

这将：
- 读取 `vocabulary.json`（5523个单词）
- 随机打乱顺序
- 生成 `data.sql` 文件（约 10MB）
- 每100个单词一批，共56批

#### 2. 导入到本地数据库
```bash
wrangler d1 execute cet6_vocabulary --local --file=./data.sql
```

或使用 npm 脚本：
```bash
npm run import-data
```

#### 3. 导入到远程数据库（生产环境）
```bash
wrangler d1 execute cet6_vocabulary --file=./data.sql
```

或使用 npm 脚本：
```bash
npm run import-data-remote
```

### 验证导入
```bash
# 本地数据库
wrangler d1 execute cet6_vocabulary --local --command="SELECT COUNT(*) as count FROM vocabulary"

# 远程数据库
wrangler d1 execute cet6_vocabulary --command="SELECT COUNT(*) as count FROM vocabulary"
```

应该返回：
```json
{
  "count": 5523
}
```

## 方式2: API 导入

### 优点
- 🌐 **通过 HTTP**：无需数据库直接访问
- 🔄 **动态更新**：可以实时更新数据
- 📝 **有日志**：可以看到导入进度

### 缺点
- 🐌 **速度慢**：需要几分钟
- ⚠️ **需要 Worker 运行**：必须先启动开发服务器
- 📊 **批量限制**：每批100个，多次请求

### 使用步骤

#### 1. 启动开发服务器
```bash
npm run dev
```

#### 2. 在新终端运行导入脚本
```bash
node scripts/init-data.js
```

#### 3. 等待完成
脚本会显示进度，完成后会提示成功。

## 数据结构说明

### vocabulary.json 格式
```json
[
  {
    "id": 1,
    "word": "abandon",
    "phonetic": "/əˈbændən/",
    "meaning": "v. 遗弃；离开；放弃...",
    "example": "",
    "exampleCn": "",
    "memorize": "",
    "learned": false,
    "reviewCount": 0
  }
]
```

### 数据库表结构
```sql
CREATE TABLE vocabulary (
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
```

### 关键字段说明
- `id`: 原始单词ID（1-5523）
- `random_order`: 随机顺序（0-5522），用于学习模式的顺序查询
- `learned`: 0=未学习，1=已学习
- `reviewCount`: 复习次数

## 性能对比测试

### SQL 文件导入
```
开始时间: 12:00:00
读取文件: 0.5秒
执行 SQL: 2-5秒
总耗时: < 10秒
```

### API 导入
```
开始时间: 12:00:00
上传数据: 30-60秒
服务器处理: 60-120秒
总耗时: 2-3分钟
```

## 常见问题

### Q1: Python 脚本报错
**问题**: `ModuleNotFoundError: No module named 'json'`

**解决**: json 是 Python 内置模块，确保 Python 版本 >= 3.6
```bash
python --version
```

### Q2: SQL 文件太大
**问题**: 10MB 的 SQL 文件，Git 提交慢

**解决**: 已在 `.gitignore` 中排除 `data.sql`，每次部署前重新生成即可。

### Q3: 导入后查询为空
**问题**: 导入成功但查询不到数据

**解决**: 
1. 检查是否导入到正确的数据库（本地 vs 远程）
2. 确认表结构已创建：`npm run init-db`
3. 验证导入：
   ```bash
   wrangler d1 execute cet6_vocabulary --local --command="SELECT * FROM vocabulary LIMIT 5"
   ```

### Q4: 重复导入
**问题**: 可以重复导入吗？

**解决**: 可以！INSERT 语句会添加新记录。如果需要清空重新导入：
```bash
# 清空数据
wrangler d1 execute cet6_vocabulary --local --command="DELETE FROM vocabulary"

# 重新导入
npm run import-data
```

### Q5: 顺序是否每次相同
**问题**: 每次生成的 `data.sql` 顺序相同吗？

**解决**: 不同！脚本使用 `random.shuffle()` 每次打乱顺序。如果需要固定顺序，可以设置随机种子：
```python
random.seed(42)  # 在 shuffled_words = words.copy() 之前添加
```

## 生产环境推荐流程

### 首次部署
```bash
# 1. 创建数据库
wrangler d1 create cet6_vocabulary

# 2. 更新 wrangler.toml 中的 database_id

# 3. 创建表结构
npm run init-db

# 4. 生成 SQL 文件
npm run generate-sql

# 5. 导入数据到远程
npm run import-data-remote

# 6. 验证
wrangler d1 execute cet6_vocabulary --command="SELECT COUNT(*) FROM vocabulary"

# 7. 部署 Worker
npm run deploy
```

### 数据更新
如果需要更新单词数据（例如修改了 vocabulary.json）：

```bash
# 1. 清空旧数据
wrangler d1 execute cet6_vocabulary --command="DELETE FROM vocabulary"

# 2. 重新生成 SQL
npm run generate-sql

# 3. 重新导入
npm run import-data-remote
```

## 备份和恢复

### 备份数据
```bash
# 导出数据
wrangler d1 export cet6_vocabulary --output=backup-$(date +%Y%m%d).sql
```

### 恢复数据
```bash
# 从备份恢复
wrangler d1 execute cet6_vocabulary --file=backup-20251027.sql
```

## 总结

### 推荐方案
- **开发测试**: 使用 SQL 文件导入（本地）
- **生产部署**: 使用 SQL 文件导入（远程）
- **动态更新**: 使用 API 导入

### NPM 脚本快速参考
```bash
npm run generate-sql        # 生成 SQL 文件
npm run import-data         # 导入到本地数据库
npm run import-data-remote  # 导入到远程数据库
```

---

**建议**: 首次部署使用 SQL 文件导入，速度快且可靠！✨
