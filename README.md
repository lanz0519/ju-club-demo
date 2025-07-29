# JSON File Sharing System

## 项目简介

基于 Nuxt 3 构建的安全 JSON 文件分享系统，支持文件上传、链接分享、过期管理和用户标识简化方案。用户可以通过浏览器上传 JSON 文件，系统生成可配置过期时间的分享链接，支持树状视图和源码视图的 JSON 展示。

### 核心架构
- **前端**: Nuxt 3 + Vue 3 组合式 API，Tailwind CSS 样式，Pinia 状态管理
- **后端**: Nuxt 3 服务器 API 路由，MySQL + Prisma ORM 数据层
- **用户标识**: 基于 localStorage 的 UUID 简化方案，无需注册登录
- **分享机制**: CUID 生成唯一分享链接，支持 1/7/30 天或永久有效期

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **核心框架** |
| Nuxt | ^3.14.1 | 全栈框架 |
| Vue | ^3.5.17 | 前端框架 |
| TypeScript | ^5.8.3 | 类型安全 |
| **数据库** |
| Prisma | ^6.12.0 | ORM 工具 |
| MySQL | 8.0.38 | 数据库 |
| mysql2 | ^3.14.2 | MySQL 驱动 |
| **状态管理** |
| Pinia | ^3.0.3 | 状态管理 |
| @pinia/nuxt | ^0.11.2 | Nuxt 集成 |
| **UI/工具** |
| @nuxtjs/tailwindcss | ^6.14.0 | CSS 框架 |
| vue-json-pretty | ^2.5.0 | JSON 树状展示 |
| uuid | ^11.1.0 | UUID 生成 |
| **测试** |
| Jest | ^30.0.5 | 测试框架 |
| ts-jest | ^29.4.0 | TypeScript 测试 |
| @types/jest | ^30.0.0 | Jest 类型定义 |

## 数据库 Schema 设计

### JsonShare 表结构
```sql
CREATE TABLE json_shares (
  id          VARCHAR(25)   PRIMARY KEY,      -- CUID 主键
  content     JSON          NOT NULL,         -- JSON 文件内容
  shareId     VARCHAR(25)   UNIQUE NOT NULL,  -- 分享链接 ID (CUID)
  userId      VARCHAR(36)   NOT NULL,         -- 用户标识 (UUID)
  expiresAt   DATETIME      NULL,             -- 过期时间 (NULL=永不过期)
  createdAt   DATETIME      DEFAULT NOW(),    -- 创建时间
  updatedAt   DATETIME      ON UPDATE NOW()   -- 更新时间
);

-- 索引设计
CREATE UNIQUE INDEX idx_share_id ON json_shares(shareId);
CREATE INDEX idx_user_id ON json_shares(userId);
CREATE INDEX idx_expires_at ON json_shares(expiresAt);
```

### 字段说明
- **id**: Prisma CUID 主键，确保全局唯一性
- **content**: JSON 类型存储文件内容，支持任意 JSON 结构
- **shareId**: 分享链接唯一标识，用于 URL 路由
- **userId**: 用户标识，通过 localStorage UUID 实现简化用户系统
- **expiresAt**: 可选过期时间，支持定时清理机制

## 用户标识简化方案

### 实现原理
采用**客户端 UUID + localStorage**的轻量级用户标识方案，避免传统注册登录的复杂性：

```typescript
// composables/useUser.ts
export const useUser = () => {
  const getUserId = (): string => {
    let userId = localStorage.getItem('json-share-user-id')
    if (!userId) {
      userId = uuidv4()  // 生成 UUID v4
      localStorage.setItem('json-share-user-id', userId)
    }
    return userId
  }
}
```

### 方案特点
- **免注册**: 首次访问自动生成用户 ID
- **数据隔离**: 每个浏览器环境独立的用户标识
- **隐私保护**: 不收集个人信息，仅用于数据关联
- **持久性**: localStorage 确保浏览器刷新后 ID 保持一致

### 安全考虑
- 用户 ID 通过 `X-User-ID` 请求头传递
- 服务端验证用户 ID 格式和存在性
- 不同用户无法访问他人的分享数据

## 本地开发环境设置

### 1. 环境准备
```bash
# 克隆项目
git clone <repository-url>
cd ju-club-demo

# 安装依赖
bun install
```

### 2. 数据库配置
```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 设置数据库连接
DATABASE_URL="mysql://root:123456@localhost:3306
/json_share_db"
```

### 3. 数据库初始化
```bash
# 启动 MySQL 容器
docker-compose up -d mysql

# 等待数据库就绪，然后推送 schema
bunx prisma db push

# 生成 Prisma 客户端
bunx prisma generate

# (可选) 打开数据库管理界面
bunx prisma studio
```

### 4. 启动开发服务器
```bash
# 开发模式
bun run dev

# 访问 http://localhost:3000
```

## Docker Compose 完整部署

### 一键启动应用
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app
```

### 服务架构
- **MySQL**: 端口 3307，数据持久化到 Docker volume
- **应用**: 端口 3000，依赖 MySQL 健康检查
- **健康检查**: MySQL 启动后自动启动应用服务

### 生产环境配置
```yaml
# docker-compose.yml 核心配置
services:
  mysql:
    image: mysql:8.0.38
    environment:
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: json_share_db
    
  app:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://root:123456@mysql:3306/json_share_db
```

## API 端点说明

### 文件上传
```http
POST /api/upload
Content-Type: multipart/form-data
X-User-ID: <user-uuid>

Body:
- file: JSON 文件 (最大 50MB)
- expiryDays: "1"|"7"|"30"|"permanent"

Response:
{
  "success": true,
  "data": {
    "shareId": "cuid-string",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 获取分享内容
```http
GET /api/share/{shareId}

Response:
{
  "success": true,
  "data": {
    "content": { /* JSON 内容 */ },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 用户分享列表
```http
GET /api/my-shares
X-User-ID: <user-uuid>

Response:
{
  "success": true,
  "data": [
    {
      "id": "share-id",
      "shareId": "cuid-string",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 错误响应格式
```http
HTTP 400/404/410/500
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|NOT_FOUND|EXPIRED|SERVER_ERROR",
    "message": "错误描述",
    "details": "详细信息(开发环境)"
  }
}
```

## 测试说明

### 测试命令
```bash
# 运行所有测试
bun run test

# 监视模式运行测试
bun run test:watch

# 生成覆盖率报告
bun run test:coverage
```

### 测试结构
```
tests/
├── setup.ts                    # 测试环境配置
├── api/
│   └── shares.integration.test.ts  # API 集成测试
└── utils/
    ├── expiryValidation.test.ts    # 过期验证单元测试
    └── shareCreation.test.ts       # 分享创建单元测试
```

### 测试配置
- **框架**: Jest + ts-jest
- **覆盖率**: 收集 `server/**/*.ts` 代码覆盖率
- **环境**: Node.js 测试环境
- **别名**: 支持 `~/` 和 `@/` 路径别名

## 中等大小 JSON 预览性能优化

### 问题分析
处理 5-10MB JSON 文件时面临的性能挑战：
- **解析开销**: 大 JSON 文件解析耗时
- **渲染阻塞**: 大量 DOM 节点影响页面响应
- **内存占用**: 完整对象树占用大量内存

### 已实现的优化方案

#### 1. 分段加载策略
```typescript
// stores/share.ts - 带进度的数据获取
const fetchShareData = async (shareId: string) => {
  setLoadingProgress(20)
  const response = await fetchWithProgress(`/api/share/${shareId}`)
  setLoadingProgress(70)
  // 数据预处理
  setLoadingProgress(90)
  setShareData(response)
  setLoadingProgress(100)
}
```

#### 2. 客户端预验证
```typescript
// stores/upload.ts - 大文件上传前验证
if (fileSizeMB > 5) {
  setUploadProgress(10)
  await validateJsonFile(selectedFile.value)  // 异步验证
  setUploadProgress(20)
}
```

#### 3. 双视图切换优化
- **树状视图**: 使用 `vue-json-pretty` 组件，支持折叠展开
- **源码视图**: 纯文本展示，减少 DOM 复杂度
- **懒加载**: 用户切换视图时才渲染对应内容

### 建议的进一步优化

#### 1. 虚拟滚动
```typescript
// 建议引入 vue-virtual-scroller
import { VirtualList } from 'vue-virtual-scroller'

// 对大数组进行虚拟滚动
<VirtualList :items="largeJsonArray" />
```

#### 2. 分页展示
```typescript
// 对象属性分页显示
const paginatedKeys = computed(() => {
  const keys = Object.keys(jsonData.value)
  return keys.slice((currentPage - 1) * pageSize, currentPage * pageSize)
})
```

#### 3. Worker 线程处理
```typescript
// 在 Web Worker 中处理大 JSON
const jsonWorker = new Worker('/workers/json-processor.js')
jsonWorker.postMessage({ json: largeJsonString })
```

#### 4. 服务端预处理
```typescript
// API 支持摘要模式
GET /api/share/{id}?mode=summary&limit=100

// 返回截断的预览数据
{
  "content": { /* 前100个属性 */ },
  "truncated": true,
  "totalSize": "8.5MB",
  "properties": 15420
}
```
