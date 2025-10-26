# 部署检查清单

## 部署前检查

### ✅ 环境准备
- [ ] Node.js 已安装 (v16+)
- [ ] 已安装 Wrangler CLI: `npm install -g wrangler`
- [ ] 已登录 Cloudflare: `wrangler login`
- [ ] 已安装项目依赖: `npm install`

### ✅ 数据库配置
- [ ] 已创建 D1 数据库: `wrangler d1 create cet6_vocabulary`
- [ ] 已在 `wrangler.toml` 中配置 `database_id`
- [ ] 已执行数据库初始化: `npm run init-db`
- [ ] 验证表结构已创建:
  ```bash
  wrangler d1 execute cet6_vocabulary --command="SELECT name FROM sqlite_master WHERE type='table'"
  ```

### ✅ 本地测试
- [ ] 本地开发服务器可以启动: `npm run dev`
- [ ] 成功导入单词数据: `node scripts/init-data.js`
- [ ] 所有测试通过: `node test/test.js`

### ✅ 代码检查
- [ ] TypeScript 编译无错误: `npm run build`
- [ ] 所有API接口已实现
- [ ] CORS 配置正确
- [ ] 错误处理完善

## 部署步骤

### 1. 首次部署
```bash
npm run deploy
```

### 2. 获取部署URL
部署成功后，你会看到类似输出：
```
Published cet6-vocabulary-backend (x.xx sec)
  https://cet6-vocabulary-backend.your-subdomain.workers.dev
```

### 3. 远程导入数据
更新 `scripts/init-data.js` 中的 `WORKER_URL` 为部署的URL，然后运行：
```bash
node scripts/init-data.js
```

### 4. 验证部署
```bash
# 测试注册接口
curl -X POST https://your-worker.workers.dev/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device"}'
```

## 部署后配置

### ✅ 安全配置
- [ ] 考虑移除 `/api/init` 接口（或添加认证）
- [ ] 在 `src/index.ts` 中更新 CORS 配置，限制特定域名
  ```typescript
  'Access-Control-Allow-Origin': 'https://your-frontend-domain.com'
  ```
- [ ] 在 Cloudflare Dashboard 配置 Rate Limiting

### ✅ 监控配置
- [ ] 在 Cloudflare Dashboard 启用日志
- [ ] 设置告警规则
- [ ] 配置性能监控

### ✅ 域名配置（可选）
- [ ] 在 Cloudflare 添加自定义域名
- [ ] 配置 SSL/TLS
- [ ] 更新前端代码中的 API 地址

## 测试清单

### 功能测试
- [ ] 用户注册功能
- [ ] 用户统计查询
- [ ] 学习单词获取
- [ ] 学习结果提交
- [ ] 复习单词获取
- [ ] 复习完成功能

### 性能测试
- [ ] 单词查询速度 < 100ms
- [ ] 并发用户支持
- [ ] 数据库索引优化验证

### 边界测试
- [ ] 无效 userId 处理
- [ ] 空单词列表处理
- [ ] 重复提交处理
- [ ] 大量用户场景

## 常见问题排查

### 问题1: 部署成功但访问404
**解决方案**:
- 检查路由路径是否正确
- 确认 wrangler.toml 配置正确
- 查看 Worker 日志: `wrangler tail`

### 问题2: 数据库查询失败
**解决方案**:
- 确认 database_id 配置正确
- 检查数据库是否已初始化
- 验证表结构: 
  ```bash
  wrangler d1 execute cet6_vocabulary --command="SELECT * FROM vocabulary LIMIT 1"
  ```

### 问题3: CORS 错误
**解决方案**:
- 检查 handleCORS 函数
- 确认前端请求头正确
- 验证 OPTIONS 请求处理

### 问题4: 性能慢
**解决方案**:
- 检查索引是否创建
- 查看 D1 查询计划
- 优化查询语句

## 数据备份

### 定期备份（推荐每周）
```bash
# 导出数据
wrangler d1 export cet6_vocabulary --output=backup-$(date +%Y%m%d).sql

# 导出用户数据
wrangler d1 execute cet6_vocabulary --command="SELECT * FROM users" --json > users-backup.json
```

### 恢复数据
```bash
wrangler d1 execute cet6_vocabulary --file=backup-20251027.sql
```

## 版本更新

### 更新代码
```bash
# 1. 修改代码
# 2. 本地测试
npm run dev

# 3. 部署新版本
npm run deploy

# 4. 监控日志
wrangler tail
```

### 回滚
如果新版本有问题，在 Cloudflare Dashboard:
1. 进入 Workers & Pages
2. 选择你的 Worker
3. 点击 "Deployments"
4. 选择之前的版本点击 "Rollback"

## 监控指标

### 关键指标
- **请求成功率**: > 99.9%
- **平均响应时间**: < 200ms
- **P95 响应时间**: < 500ms
- **错误率**: < 0.1%
- **D1 查询时间**: < 100ms

### 查看方式
1. Cloudflare Dashboard
2. Workers & Pages > 你的Worker > Metrics
3. 或使用 Cloudflare Analytics API

## 成本估算

### Cloudflare Workers 免费额度
- 请求: 100,000 次/天
- CPU 时间: 10ms/请求
- D1 存储: 5GB
- D1 读取: 5,000,000 次/天
- D1 写入: 100,000 次/天

### 预计成本（1000日活用户）
- 每用户每天约 20 次请求
- 总请求: 20,000 次/天
- 完全在免费额度内 ✅

## 完成确认

部署完成后，确认以下内容：

- [ ] ✅ Worker 可以正常访问
- [ ] ✅ 所有 API 接口响应正常
- [ ] ✅ 数据库包含完整单词数据
- [ ] ✅ 测试用户可以正常学习
- [ ] ✅ 复习功能正常工作
- [ ] ✅ 日志和监控已配置
- [ ] ✅ 备份计划已设置

---

**恭喜！你的六级单词刷词软件后端已成功部署！** 🎉

下一步：开发前端应用，连接到此后端API。
