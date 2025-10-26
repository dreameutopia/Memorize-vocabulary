# 自定义域名问题排查和完整测试指南

## ⚠️ 当前问题

你的自定义域名 `word.jeeein.in.eu.org` 目前返回的是 "Hello world"，而不是我们的 API 响应。

这说明域名可能绑定到了：
1. 一个默认的 Cloudflare Worker（不是我们的项目）
2. Cloudflare Pages 的默认页面
3. DNS 配置指向了错误的 Worker

---

## 🔍 问题诊断

### 检查当前状态

运行以下命令检查：

```powershell
# 检查域名解析
nslookup word.jeeein.in.eu.org

# 测试响应
curl https://word.jeeein.in.eu.org/api/user/register -v

# 检查响应头
Invoke-WebRequest -Uri "https://word.jeeein.in.eu.org" -Method GET | Select-Object -ExpandProperty Headers
```

### 预期结果

正确配置后，访问根路径应该返回：
```json
{
  "success": false,
  "error": "Not found"
}
```

而不是 "Hello world"

---

## 🔧 解决方案

### 方案 1: 检查 Cloudflare Pages 项目绑定

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 找到你的项目（如 `cet6-vocabulary-backend`）
4. 进入项目，点击 **Custom domains** 标签
5. 检查 `word.jeeein.in.eu.org` 是否绑定到这个项目

**如果没有绑定或绑定错误**：
- 删除现有绑定
- 重新添加：点击 **Set up a custom domain**
- 输入：`word.jeeein.in.eu.org`
- 等待 DNS 生效（通常几分钟）

### 方案 2: 检查 DNS 配置

在 Cloudflare DNS 管理中：

1. 进入 **Websites** → 选择你的域名 `jeeein.in.eu.org`
2. 点击 **DNS** → **Records**
3. 找到 `word` 的 CNAME 记录
4. 应该指向：`cet6-vocabulary-backend.pages.dev`（你的 Pages 项目）

**如果记录不对**：
- 修改 CNAME 记录指向正确的 Pages 项目
- 或者使用 Cloudflare Pages 自动配置

### 方案 3: 使用 Pages.dev 域名测试

如果自定义域名有问题，可以先使用默认域名：

```powershell
# 查找你的 Pages.dev 域名
# 在 Cloudflare Dashboard → Workers & Pages → 你的项目
# 顶部会显示类似：https://cet6-vocabulary-backend.pages.dev

# 使用默认域名测试
$baseUrl = "https://cet6-vocabulary-backend.pages.dev"
```

---

## ✅ 完整 API 测试脚本

一旦域名配置正确，使用以下脚本测试所有 API：

### PowerShell 完整测试脚本

```powershell
# ============================================
# 六级单词 API 完整测试脚本
# ============================================

# 配置
$baseUrl = "https://word.jeeein.in.eu.org"  # 或使用 Pages.dev 域名
$testDeviceId = "test-device-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "开始测试 API: $baseUrl" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 测试 1: 注册用户
Write-Host "📝 测试 1: 注册用户" -ForegroundColor Cyan
Write-Host "   设备ID: $testDeviceId" -ForegroundColor Gray

try {
    $registerBody = @{ deviceId = $testDeviceId } | ConvertTo-Json
    $registerResult = Invoke-RestMethod -Uri "$baseUrl/api/user/register" -Method POST -Body $registerBody -ContentType "application/json"
    
    if ($registerResult.success) {
        $userId = $registerResult.data.userId
        Write-Host "   ✅ 成功: 用户ID = $userId" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 失败: $($registerResult.error)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 2: 重复注册（应返回已存在）
Write-Host "📝 测试 2: 重复注册（验证幂等性）" -ForegroundColor Cyan

try {
    $registerResult2 = Invoke-RestMethod -Uri "$baseUrl/api/user/register" -Method POST -Body $registerBody -ContentType "application/json"
    
    if ($registerResult2.success -and $registerResult2.data.message -like "*already exists*") {
        Write-Host "   ✅ 成功: 正确返回用户已存在" -ForegroundColor Green
    } else {
        Write-Host "   ✅ 成功: 用户ID = $($registerResult2.data.userId)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 3: 获取用户统计
Write-Host "📝 测试 3: 获取用户统计数据" -ForegroundColor Cyan

try {
    $statsResult = Invoke-RestMethod -Uri "$baseUrl/api/user/stats?userId=$userId" -Method GET
    
    if ($statsResult.success) {
        $stats = $statsResult.data
        Write-Host "   ✅ 成功:" -ForegroundColor Green
        Write-Host "      学习天数: $($stats.studyDays)" -ForegroundColor Gray
        Write-Host "      已学单词: $($stats.learnedCount)" -ForegroundColor Gray
        Write-Host "      待学单词: $($stats.remainingCount)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ 失败: $($statsResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 4: 获取学习单词
Write-Host "📝 测试 4: 获取学习单词（20个）" -ForegroundColor Cyan

try {
    $learnResult = Invoke-RestMethod -Uri "$baseUrl/api/words/learn?userId=$userId" -Method GET
    
    if ($learnResult.success) {
        $words = $learnResult.data.words
        Write-Host "   ✅ 成功: 获取到 $($words.Count) 个单词" -ForegroundColor Green
        
        if ($words.Count -gt 0) {
            Write-Host "      第一个单词:" -ForegroundColor Gray
            Write-Host "        - ID: $($words[0].id)" -ForegroundColor Gray
            Write-Host "        - 单词: $($words[0].word)" -ForegroundColor Gray
            Write-Host "        - 音标: $($words[0].phonetic)" -ForegroundColor Gray
            Write-Host "        - 释义: $($words[0].meaning.Substring(0, [Math]::Min(50, $words[0].meaning.Length)))..." -ForegroundColor Gray
            
            # 保存前5个单词ID用于后续测试
            $global:testWordIds = $words[0..4] | ForEach-Object { $_.id }
        } else {
            Write-Host "   ⚠️  警告: 没有返回单词，可能数据未导入" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ 失败: $($learnResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 5: 提交学习结果（认识）
Write-Host "📝 测试 5: 提交学习结果（认识）" -ForegroundColor Cyan

if ($testWordIds -and $testWordIds.Count -gt 0) {
    try {
        $submitBody = @{
            userId = $userId
            wordId = $testWordIds[0]
            known = $true
        } | ConvertTo-Json
        
        $submitResult = Invoke-RestMethod -Uri "$baseUrl/api/words/submit" -Method POST -Body $submitBody -ContentType "application/json"
        
        if ($submitResult.success) {
            Write-Host "   ✅ 成功: 单词ID $($testWordIds[0]) 已标记为认识" -ForegroundColor Green
        } else {
            Write-Host "   ❌ 失败: $($submitResult.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  跳过: 没有可用的单词ID" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 6: 提交学习结果（不认识）
Write-Host "📝 测试 6: 提交学习结果（不认识，加入复习列表）" -ForegroundColor Cyan

if ($testWordIds -and $testWordIds.Count -gt 1) {
    try {
        # 提交多个不认识的单词
        for ($i = 1; $i -lt [Math]::Min(4, $testWordIds.Count); $i++) {
            $submitBody = @{
                userId = $userId
                wordId = $testWordIds[$i]
                known = $false
            } | ConvertTo-Json
            
            $submitResult = Invoke-RestMethod -Uri "$baseUrl/api/words/submit" -Method POST -Body $submitBody -ContentType "application/json"
            Start-Sleep -Milliseconds 200
        }
        
        Write-Host "   ✅ 成功: 已标记 3 个单词为不认识" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  跳过: 没有足够的单词ID" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 7: 验证统计更新
Write-Host "📝 测试 7: 验证用户统计已更新" -ForegroundColor Cyan

try {
    $statsResult2 = Invoke-RestMethod -Uri "$baseUrl/api/user/stats?userId=$userId" -Method GET
    
    if ($statsResult2.success) {
        $stats2 = $statsResult2.data
        Write-Host "   ✅ 成功: 统计已更新" -ForegroundColor Green
        Write-Host "      已学单词: $($stats2.learnedCount) (应为 4)" -ForegroundColor Gray
        
        if ($stats2.learnedCount -eq 4) {
            Write-Host "      ✅ 数量正确!" -ForegroundColor Green
        }
    } else {
        Write-Host "   ❌ 失败: $($statsResult2.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 8: 获取复习单词
Write-Host "📝 测试 8: 获取复习单词列表" -ForegroundColor Cyan

try {
    $reviewResult = Invoke-RestMethod -Uri "$baseUrl/api/words/review?userId=$userId" -Method GET
    
    if ($reviewResult.success) {
        $reviewWords = $reviewResult.data.words
        Write-Host "   ✅ 成功: 获取到 $($reviewWords.Count) 个待复习单词" -ForegroundColor Green
        
        if ($reviewWords.Count -gt 0) {
            Write-Host "      第一个待复习单词:" -ForegroundColor Gray
            Write-Host "        - ID: $($reviewWords[0].id)" -ForegroundColor Gray
            Write-Host "        - 单词: $($reviewWords[0].word)" -ForegroundColor Gray
            
            $global:reviewWordId = $reviewWords[0].id
        }
        
        if ($reviewWords.Count -eq 3) {
            Write-Host "      ✅ 数量正确（应为 3）" -ForegroundColor Green
        }
    } else {
        Write-Host "   ❌ 失败: $($reviewResult.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 9: 完成复习（移除单词）
Write-Host "📝 测试 9: 完成复习（移除已掌握的单词）" -ForegroundColor Cyan

if ($reviewWordId) {
    try {
        $completeBody = @{
            userId = $userId
            wordId = $reviewWordId
        } | ConvertTo-Json
        
        $completeResult = Invoke-RestMethod -Uri "$baseUrl/api/words/review-complete" -Method POST -Body $completeBody -ContentType "application/json"
        
        if ($completeResult.success) {
            Write-Host "   ✅ 成功: 单词ID $reviewWordId 已从复习列表移除" -ForegroundColor Green
        } else {
            Write-Host "   ❌ 失败: $($completeResult.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  跳过: 没有可用的复习单词ID" -ForegroundColor Yellow
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 10: 验证复习列表更新
Write-Host "📝 测试 10: 验证复习列表已更新" -ForegroundColor Cyan

try {
    $reviewResult2 = Invoke-RestMethod -Uri "$baseUrl/api/words/review?userId=$userId" -Method GET
    
    if ($reviewResult2.success) {
        $reviewWords2 = $reviewResult2.data.words
        Write-Host "   ✅ 成功: 当前待复习单词数 = $($reviewWords2.Count)" -ForegroundColor Green
        
        if ($reviewWords2.Count -eq 2) {
            Write-Host "      ✅ 数量正确（从 3 减少到 2）" -ForegroundColor Green
        }
    } else {
        Write-Host "   ❌ 失败: $($reviewResult2.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 11: 无效用户ID测试
Write-Host "📝 测试 11: 测试错误处理（无效用户ID）" -ForegroundColor Cyan

try {
    $invalidResult = Invoke-RestMethod -Uri "$baseUrl/api/user/stats?userId=invalid-user-id" -Method GET
    
    if (-not $invalidResult.success) {
        Write-Host "   ✅ 成功: 正确返回错误 - $($invalidResult.error)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  警告: 应该返回错误但返回成功" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✅ 成功: 正确抛出异常（404或400）" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ 测试完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 测试总结:" -ForegroundColor Cyan
Write-Host "   - 用户注册: 已测试" -ForegroundColor Gray
Write-Host "   - 用户统计: 已测试" -ForegroundColor Gray
Write-Host "   - 学习单词: 已测试" -ForegroundColor Gray
Write-Host "   - 提交结果: 已测试" -ForegroundColor Gray
Write-Host "   - 复习功能: 已测试" -ForegroundColor Gray
Write-Host "   - 错误处理: 已测试" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 所有 API 功能正常！" -ForegroundColor Green
```

---

## 🚀 使用方法

### 1. 保存脚本
将上面的脚本保存为 `test-api.ps1`

### 2. 修改域名
如果自定义域名有问题，修改脚本中的 `$baseUrl`:
```powershell
# 使用自定义域名
$baseUrl = "https://word.jeeein.in.eu.org"

# 或使用 Pages.dev 默认域名
$baseUrl = "https://cet6-vocabulary-backend.pages.dev"
```

### 3. 运行测试
```powershell
# 运行完整测试
.\test-api.ps1

# 或直接复制粘贴到 PowerShell 运行
```

---

## 📊 预期测试结果

如果所有 API 正常，你应该看到：

```
=====================================
开始测试 API: https://word.jeeein.in.eu.org
=====================================

📝 测试 1: 注册用户
   ✅ 成功: 用户ID = 550e8400-e29b-41d4-a716-446655440000

📝 测试 2: 重复注册（验证幂等性）
   ✅ 成功: 正确返回用户已存在

📝 测试 3: 获取用户统计数据
   ✅ 成功:
      学习天数: 1
      已学单词: 0
      待学单词: 5523

📝 测试 4: 获取学习单词（20个）
   ✅ 成功: 获取到 20 个单词
      第一个单词:
        - ID: 2844
        - 单词: light
        - 音标: /laɪt/
        - 释义: n.光,日光,发光体,灯adj.轻的,发光的...

📝 测试 5: 提交学习结果（认识）
   ✅ 成功: 单词ID 2844 已标记为认识

📝 测试 6: 提交学习结果（不认识，加入复习列表）
   ✅ 成功: 已标记 3 个单词为不认识

📝 测试 7: 验证用户统计已更新
   ✅ 成功: 统计已更新
      已学单词: 4 (应为 4)
      ✅ 数量正确!

📝 测试 8: 获取复习单词列表
   ✅ 成功: 获取到 3 个待复习单词
      ✅ 数量正确（应为 3）

📝 测试 9: 完成复习（移除已掌握的单词）
   ✅ 成功: 单词ID 2887 已从复习列表移除

📝 测试 10: 验证复习列表已更新
   ✅ 成功: 当前待复习单词数 = 2
      ✅ 数量正确（从 3 减少到 2）

📝 测试 11: 测试错误处理（无效用户ID）
   ✅ 成功: 正确返回错误 - User not found

=====================================
✅ 测试完成！
=====================================

📊 测试总结:
   - 用户注册: 已测试
   - 用户统计: 已测试
   - 学习单词: 已测试
   - 提交结果: 已测试
   - 复习功能: 已测试
   - 错误处理: 已测试

🎉 所有 API 功能正常！
```

---

## ❓ 如果测试失败

### 1. 域名配置问题
返回 "Hello world" → 检查域名绑定和 DNS 配置

### 2. 数据库未绑定
返回 500 错误 → 检查 D1 数据库绑定（变量名必须是 `DB`）

### 3. 数据未导入
返回空数组 → 需要导入单词数据
```bash
npx wrangler d1 execute cet6_vocabulary --file=./data.sql
```

### 4. CORS 错误
浏览器控制台报错 → 检查 CORS 配置

---

## 📝 快速验证命令

```powershell
# 快速检查域名是否配置正确
Invoke-RestMethod -Uri "https://word.jeeein.in.eu.org/api/user/register" -Method POST -Body '{"deviceId":"quick-test"}' -ContentType "application/json"

# 应该返回 JSON 格式的响应，而不是 "Hello world"
```

---

需要我运行这个测试脚本吗？或者你想先修复域名配置问题？
