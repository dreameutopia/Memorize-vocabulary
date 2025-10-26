# 本地测试说明

本文档提供简化的本地测试步骤，无需部署到 Cloudflare 即可验证功能。

## 快速测试（使用本地模式）

### 步骤 1: 安装依赖
```powershell
npm install
```

### 步骤 2: 启动本地开发服务器（使用本地数据库）
```powershell
npx wrangler dev --local
```

这将启动一个本地 Worker，使用本地 SQLite 数据库，无需连接 Cloudflare。

### 步骤 3: 初始化数据库（新终端窗口）

在新的 PowerShell 窗口中运行：

**方式1: 使用 SQL 文件（推荐，更快）**
```powershell
# 生成 SQL 文件（只需运行一次）
python scripts/convert_to_sql.py

# 导入数据到本地数据库
npx wrangler d1 execute cet6_vocabulary --local --file=./data.sql
```

**方式2: 通过 API 导入**
```powershell
# 方式1: 使用脚本导入
node scripts/init-data.js
```

或者

```powershell
# 方式2: 手动测试（使用 PowerShell）
$body = @{
    deviceId = "test-device-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/user/register" -Method POST -Body $body -ContentType "application/json"
```

### 步骤 4: 运行完整测试
```powershell
node test/test.js
```

## 逐步手动测试

如果自动测试脚本有问题，可以手动测试每个接口：

### 1. 注册用户
```powershell
$registerBody = @{
    deviceId = "my-test-device"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:8787/api/user/register" -Method POST -Body $registerBody -ContentType "application/json"
$userId = $result.data.userId
Write-Host "User ID: $userId"
```

### 2. 查看用户统计
```powershell
Invoke-RestMethod -Uri "http://localhost:8787/api/user/stats?userId=$userId" -Method GET
```

### 3. 获取学习单词
```powershell
$words = Invoke-RestMethod -Uri "http://localhost:8787/api/words/learn?userId=$userId" -Method GET
$words.data.words | Format-Table id, word, meaning
```

### 4. 提交学习结果
```powershell
# 标记第一个单词为"不认识"
$wordId = $words.data.words[0].id

$submitBody = @{
    userId = $userId
    wordId = $wordId
    known = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/words/submit" -Method POST -Body $submitBody -ContentType "application/json"
```

### 5. 查看复习单词
```powershell
$reviewWords = Invoke-RestMethod -Uri "http://localhost:8787/api/words/review?userId=$userId" -Method GET
$reviewWords.data.words | Format-Table id, word, meaning
```

### 6. 完成复习
```powershell
$reviewWordId = $reviewWords.data.words[0].id

$completeBody = @{
    userId = $userId
    wordId = $reviewWordId
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/words/review-complete" -Method POST -Body $completeBody -ContentType "application/json"
```

## 使用 curl（如果已安装）

### 注册用户
```powershell
curl -X POST http://localhost:8787/api/user/register -H "Content-Type: application/json" -d '{\"deviceId\":\"test-device\"}'
```

### 获取统计
```powershell
curl "http://localhost:8787/api/user/stats?userId=YOUR_USER_ID"
```

### 获取学习单词
```powershell
curl "http://localhost:8787/api/words/learn?userId=YOUR_USER_ID"
```

## 导入单词数据（如果需要完整数据）

如果本地数据库为空，需要先导入单词：

### 方式1: 使用脚本（推荐）
```powershell
node scripts/init-data.js
```

### 方式2: 使用 PowerShell
```powershell
# 读取单词文件
$vocabulary = Get-Content "vocabulary.json" -Raw | ConvertFrom-Json

# 准备请求
$initBody = @{
    words = $vocabulary
} | ConvertTo-Json -Depth 10

# 发送请求（注意：这可能需要几分钟）
Invoke-RestMethod -Uri "http://localhost:8787/api/init" -Method POST -Body $initBody -ContentType "application/json"
```

## 查看本地数据库

Wrangler 本地模式会创建一个 SQLite 数据库文件在：
```
.wrangler/state/v3/d1/
```

可以使用 SQLite 客户端查看数据：

```powershell
# 安装 SQLite（如果需要）
# 然后查询
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite "SELECT COUNT(*) FROM vocabulary"
```

## 常见问题

### Q: 端口 8787 已被占用
**解决方案**:
```powershell
npx wrangler dev --local --port 8788
```
然后更新测试脚本中的 BASE_URL。

### Q: 找不到数据库
**解决方案**:
确保 `wrangler.toml` 中的 D1 配置正确。本地模式会自动创建数据库。

### Q: 导入数据失败
**解决方案**:
1. 确保开发服务器正在运行
2. 检查 `vocabulary.json` 文件格式
3. 尝试减小批量大小（修改 `init-data.js`）

### Q: 测试脚本报错
**解决方案**:
确保 Node.js 版本 >= 16，并且已安装依赖：
```powershell
node --version
npm install
```

## 清理本地数据

如果需要重置本地数据库：
```powershell
# 停止开发服务器（Ctrl+C）
# 删除本地数据
Remove-Item -Recurse -Force .wrangler
# 重新启动
npx wrangler dev --local
```

## 下一步

本地测试通过后，可以：
1. 部署到 Cloudflare（参考 DEPLOYMENT.md）
2. 开发前端应用
3. 集成到生产环境

## 测试检查清单

- [ ] ✅ 开发服务器启动成功
- [ ] ✅ 可以注册用户并获得 userId
- [ ] ✅ 可以查看用户统计
- [ ] ✅ 可以获取学习单词（20个）
- [ ] ✅ 可以提交学习结果
- [ ] ✅ 可以获取复习单词
- [ ] ✅ 可以完成复习
- [ ] ✅ 所有自动化测试通过

完成所有检查后，表示本地开发环境配置成功！🎉
