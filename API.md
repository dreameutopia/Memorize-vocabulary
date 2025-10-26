# API 接口文档

## 基础信息

- **Base URL (开发)**: `http://localhost:8787`
- **Base URL (生产)**: `https://your-worker.workers.dev`
- **Content-Type**: `application/json`
- **字符编码**: `UTF-8`

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 接口列表

---

## 1. 用户注册

注册新用户或获取已存在用户的ID。

### 请求

- **URL**: `/api/user/register`
- **Method**: `POST`
- **Auth**: 不需要

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备唯一标识符 |

### 请求示例

```json
{
  "deviceId": "device-123456789"
}
```

### 响应示例

**首次注册**:
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**已存在用户**:
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "User already exists"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Device ID is required"
}
```

---

## 2. 获取用户统计

获取用户的学习统计数据。

### 请求

- **URL**: `/api/user/stats`
- **Method**: `GET`
- **Auth**: 需要 userId

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID（URL参数） |

### 请求示例

```
GET /api/user/stats?userId=550e8400-e29b-41d4-a716-446655440000
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "studyDays": 15,
    "learnedCount": 320,
    "remainingCount": 5203
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户ID |
| studyDays | number | 累计学习天数 |
| learnedCount | number | 已学习单词数量 |
| remainingCount | number | 待学习单词数量 |

### 错误响应

```json
{
  "success": false,
  "error": "User not found"
}
```

---

## 3. 获取学习单词

获取接下来要学习的单词列表（最多20个）。

### 请求

- **URL**: `/api/words/learn`
- **Method**: `GET`
- **Auth**: 需要 userId

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID（URL参数） |

### 请求示例

```
GET /api/words/learn?userId=550e8400-e29b-41d4-a716-446655440000
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "words": [
      {
        "id": 1,
        "word": "abandon",
        "phonetic": "/əˈbændən/",
        "meaning": "v. 遗弃；离开；放弃；终止；陷入n. 放任，狂热",
        "example": "",
        "exampleCn": "",
        "memorize": "",
        "learned": 0,
        "reviewCount": 0
      },
      {
        "id": 2,
        "word": "ability",
        "phonetic": "/əˈbɪləti/",
        "meaning": "n. 能力，能耐；才能",
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

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 单词ID |
| word | string | 单词 |
| phonetic | string | 音标 |
| meaning | string | 释义 |
| example | string | 例句（英文） |
| exampleCn | string | 例句（中文） |
| memorize | string | 记忆方法 |
| learned | number | 是否已学习（0/1） |
| reviewCount | number | 复习次数 |
| offset | number | 当前偏移量 |

---

## 4. 提交学习结果

提交单词的学习结果（认识或不认识）。

### 请求

- **URL**: `/api/words/submit`
- **Method**: `POST`
- **Auth**: 需要 userId

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| wordId | number | 是 | 单词ID |
| known | boolean | 是 | 是否认识（true/false） |

### 请求示例

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "wordId": 1,
  "known": false
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "Word result submitted successfully"
  }
}
```

### 业务逻辑

1. 无论 `known` 为 true 还是 false，都会增加用户的 `learned_count`
2. 如果 `known` 为 false，则将该单词添加到用户的复习列表
3. 如果 `known` 为 true，则不添加到复习列表

---

## 5. 获取复习单词

获取需要复习的单词列表（随机最多20个）。

### 请求

- **URL**: `/api/words/review`
- **Method**: `GET`
- **Auth**: 需要 userId

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID（URL参数） |

### 请求示例

```
GET /api/words/review?userId=550e8400-e29b-41d4-a716-446655440000
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "words": [
      {
        "id": 15,
        "word": "abstract",
        "phonetic": "/ˈæbstrækt/",
        "meaning": "adj. 抽象的；深奥的n. 摘要；抽象；抽象的概念vt. 摘要；提取；使抽象化",
        "example": "",
        "exampleCn": "",
        "memorize": "",
        "learned": 0,
        "reviewCount": 0
      }
      // ... 最多20个随机单词
    ],
    "count": 15
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| words | array | 单词列表（随机顺序） |
| count | number | 返回的单词数量 |

### 特殊说明

- 单词顺序每次请求都会随机打乱
- 如果没有需要复习的单词，返回空数组

---

## 6. 完成复习

标记某个单词已经掌握，从复习列表中移除。

### 请求

- **URL**: `/api/words/review-complete`
- **Method**: `POST`
- **Auth**: 需要 userId

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| wordId | number | 是 | 单词ID |

### 请求示例

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "wordId": 15
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "Word removed from review list"
  }
}
```

### 业务逻辑

- 从用户的 `unknown_words` 表中删除该单词记录
- 该单词不会再出现在复习列表中

---

## 7. 初始化数据库（仅用于部署）

导入单词数据到数据库。

### 请求

- **URL**: `/api/init`
- **Method**: `POST`
- **Auth**: 不需要（建议生产环境移除此接口）

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| words | array | 是 | 单词数组 |

### 请求示例

```json
{
  "words": [
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
    // ... 更多单词
  ]
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "message": "Initialized 5523 words"
  }
}
```

### 特殊说明

- 仅在首次部署时使用
- 会自动打乱单词顺序
- 生产环境建议移除或添加认证

---

## 错误代码

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 使用流程示例

### 学习模式流程

```
1. 用户打开应用
   └─> POST /api/user/register (deviceId)
   └─> 获得 userId

2. 获取用户统计
   └─> GET /api/user/stats?userId={userId}
   └─> 显示学习进度

3. 开始学习
   └─> GET /api/words/learn?userId={userId}
   └─> 显示20个单词

4. 用户选择认识/不认识
   └─> POST /api/words/submit (userId, wordId, known)
   └─> 重复步骤3-4
```

### 复习模式流程

```
1. 进入复习模式
   └─> GET /api/words/review?userId={userId}
   └─> 获取需要复习的单词

2. 用户选择
   ├─> 认识: POST /api/words/review-complete (userId, wordId)
   └─> 不认识: 继续下一个

3. 重复步骤1-2
```

## 性能优化建议

1. **批量提交**: 可以在前端累积多个单词结果后批量提交
2. **缓存**: 用户统计信息可以在前端缓存
3. **预加载**: 可以提前加载下一批单词数据
4. **限流**: 建议在前端实现请求限流

## 安全建议

1. **生产环境**: 移除或保护 `/api/init` 接口
2. **认证**: 考虑添加 API Key 或 Token 认证
3. **CORS**: 限制允许的域名（当前为 *）
4. **Rate Limiting**: 在 Cloudflare 中配置速率限制

## 版本历史

- **v1.0.0** (2025-10-27): 初始版本
  - 实现基础学习和复习功能
  - 支持多租户
  - D1 数据库集成
