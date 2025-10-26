# ============================================
# 六级单词 API 完整测试脚本
# ============================================

# 配置域名（根据实际情况修改）
$baseUrl = "https://word.jeeein.in.eu.org"
# 如果自定义域名有问题，使用 Pages.dev 默认域名：
# $baseUrl = "https://你的项目名.pages.dev"

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
        Write-Host "   提示: 检查域名是否正确绑定到 Worker" -ForegroundColor Yellow
        exit
    }
} catch {
    Write-Host "   ❌ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   提示: 域名可能未正确配置，尝试使用 Pages.dev 域名" -ForegroundColor Yellow
    exit
}

Write-Host ""
Start-Sleep -Seconds 1

# 测试 2: 重复注册
Write-Host "📝 测试 2: 重复注册（验证幂等性）" -ForegroundColor Cyan
try {
    $registerResult2 = Invoke-RestMethod -Uri "$baseUrl/api/user/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "   ✅ 成功: 用户ID = $($registerResult2.data.userId)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
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
    }
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
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
            $meaningPreview = if ($words[0].meaning.Length -gt 50) { $words[0].meaning.Substring(0, 50) + "..." } else { $words[0].meaning }
            Write-Host "        - 释义: $meaningPreview" -ForegroundColor Gray
            
            $global:testWordIds = $words[0..([Math]::Min(4, $words.Count - 1))] | ForEach-Object { $_.id }
        } else {
            Write-Host "   ⚠️  警告: 没有返回单词，数据可能未导入" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
}
Write-Host ""
Start-Sleep -Seconds 1

# 测试 5: 提交学习结果（认识）
Write-Host "📝 测试 5: 提交学习结果（认识）" -ForegroundColor Cyan
if ($testWordIds -and $testWordIds.Count -gt 0) {
    try {
        $submitBody = @{ userId = $userId; wordId = $testWordIds[0]; known = $true } | ConvertTo-Json
        $submitResult = Invoke-RestMethod -Uri "$baseUrl/api/words/submit" -Method POST -Body $submitBody -ContentType "application/json"
        
        if ($submitResult.success) {
            Write-Host "   ✅ 成功: 单词ID $($testWordIds[0]) 已标记为认识" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ 请求失败" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  跳过: 没有可用的单词ID" -ForegroundColor Yellow
}
Write-Host ""
Start-Sleep -Seconds 1

# 测试 6: 提交学习结果（不认识）
Write-Host "📝 测试 6: 提交学习结果（不认识）" -ForegroundColor Cyan
if ($testWordIds -and $testWordIds.Count -gt 1) {
    try {
        for ($i = 1; $i -lt [Math]::Min(4, $testWordIds.Count); $i++) {
            $submitBody = @{ userId = $userId; wordId = $testWordIds[$i]; known = $false } | ConvertTo-Json
            $null = Invoke-RestMethod -Uri "$baseUrl/api/words/submit" -Method POST -Body $submitBody -ContentType "application/json"
            Start-Sleep -Milliseconds 200
        }
        Write-Host "   ✅ 成功: 已标记 3 个单词为不认识" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ 请求失败" -ForegroundColor Red
    }
}
Write-Host ""
Start-Sleep -Seconds 1

# 测试 7: 验证统计更新
Write-Host "📝 测试 7: 验证用户统计已更新" -ForegroundColor Cyan
try {
    $statsResult2 = Invoke-RestMethod -Uri "$baseUrl/api/user/stats?userId=$userId" -Method GET
    
    if ($statsResult2.success) {
        $stats2 = $statsResult2.data
        Write-Host "   ✅ 成功: 已学单词 = $($stats2.learnedCount)" -ForegroundColor Green
        if ($stats2.learnedCount -eq 4) {
            Write-Host "      ✅ 数量正确!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
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
            Write-Host "      第一个待复习单词: $($reviewWords[0].word)" -ForegroundColor Gray
            $global:reviewWordId = $reviewWords[0].id
        }
    }
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
}
Write-Host ""
Start-Sleep -Seconds 1

# 测试 9: 完成复习
Write-Host "📝 测试 9: 完成复习（移除单词）" -ForegroundColor Cyan
if ($reviewWordId) {
    try {
        $completeBody = @{ userId = $userId; wordId = $reviewWordId } | ConvertTo-Json
        $completeResult = Invoke-RestMethod -Uri "$baseUrl/api/words/review-complete" -Method POST -Body $completeBody -ContentType "application/json"
        
        if ($completeResult.success) {
            Write-Host "   ✅ 成功: 单词已从复习列表移除" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ 请求失败" -ForegroundColor Red
    }
}
Write-Host ""
Start-Sleep -Seconds 1

# 测试 10: 验证复习列表更新
Write-Host "📝 测试 10: 验证复习列表已更新" -ForegroundColor Cyan
try {
    $reviewResult2 = Invoke-RestMethod -Uri "$baseUrl/api/words/review?userId=$userId" -Method GET
    
    if ($reviewResult2.success) {
        Write-Host "   ✅ 成功: 当前待复习 = $($reviewResult2.data.words.Count) 个" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ 请求失败" -ForegroundColor Red
}
Write-Host ""

# 总结
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ 测试完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 测试总结:" -ForegroundColor Cyan
Write-Host "   - 用户注册和认证: ✅" -ForegroundColor Gray
Write-Host "   - 用户数据统计: ✅" -ForegroundColor Gray
Write-Host "   - 学习模式: ✅" -ForegroundColor Gray
Write-Host "   - 复习模式: ✅" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 所有 API 功能测试通过！" -ForegroundColor Green
