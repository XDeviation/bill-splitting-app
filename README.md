# 记账分账应用

这是一个用于朋友之间记账和分账的 Web 应用，支持多种货币和账单管理功能。

## 技术栈

- 前端: React, Next.js, Ant Design, TailwindCSS
- 后端: Next.js API Routes
- 数据库: MongoDB (使用 Mongoose)

## 功能特性

- 用户管理
- 创建和管理账单
- 支持均分或自定义分账
- 支持多种货币(CNY, JPY)
- 账单状态跟踪
- 自动计算结算方案

## 部署说明

### 本地开发环境

1. 安装依赖:

```bash
npm install
```

2. 创建 `.env.local` 文件并配置:

```
MONGODB_URI=mongodb://localhost:27017/bill-splitting-app
```

3. 确保 MongoDB 服务正在运行

4. 启动开发服务器:

```bash
npm run dev
```

### 生产环境部署

1. 构建应用:

```bash
npm run build
```

2. 启动生产服务器:

```bash
npm start
```

## 数据库配置

应用启动时会自动初始化数据库并创建默认用户。默认用户包括:

- 张三
- 李四
- 王五

## API 接口

### 用户 API

- `GET /api/users` - 获取所有用户
- `POST /api/users` - 创建新用户

### 账单 API

- `GET /api/bills` - 获取所有账单
- `POST /api/bills` - 创建新账单
- `GET /api/bills/:id` - 获取单个账单
- `PUT /api/bills/:id` - 更新账单
- `DELETE /api/bills/:id` - 删除账单
