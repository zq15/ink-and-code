# Ink & Code

一个使用 Next.js 16 构建的现代博客系统，支持 Markdown 文件和 PostgreSQL 数据库两种内容存储方式。

## 功能特性

- 响应式设计，支持深色/浅色主题
- Markdown 内容渲染（支持 GFM、代码高亮）
- RESTful API 接口
- 文章管理后台 (`/admin`)
- 支持 Vercel 一键部署

## 技术栈

- **框架**: Next.js 16 (App Router)
- **样式**: Tailwind CSS 4
- **数据库**: PostgreSQL (Vercel Postgres)
- **ORM**: Prisma
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 本地开发（使用 Markdown 文件）

无需数据库配置，直接运行：

```bash
pnpm dev
```

文章存放在 `content/posts/` 目录下。

### 3. 使用数据库（可选）

#### 3.1 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库连接（Vercel Postgres 或其他 PostgreSQL）
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host:5432/database?sslmode=require"

# 管理后台 API Key
ADMIN_API_KEY="your-secret-api-key"
```

#### 3.2 初始化数据库

```bash
# 推送 schema 到数据库
pnpm db:push

# （可选）将现有 Markdown 文章迁移到数据库
pnpm db:migrate
```

#### 3.3 使用 Prisma Studio 查看数据

```bash
pnpm db:studio
```

## 部署到 Vercel

### 1. 创建 Vercel 项目

将代码推送到 GitHub，然后在 Vercel 中导入项目。

### 2. 配置数据库

1. 进入 Vercel Dashboard → Storage → Create Database → Postgres
2. 连接到你的项目，环境变量会自动配置

### 3. 配置环境变量

在 Vercel 项目设置中添加：

- `ADMIN_API_KEY`: 你的管理后台密钥

### 4. 部署

Vercel 会自动构建和部署。构建时会自动运行 `prisma generate`。

## API 接口

### 获取所有文章

```
GET /api/posts
GET /api/posts?published=true  # 仅已发布
```

### 获取单篇文章

```
GET /api/posts/[slug]
```

### 创建文章

```
POST /api/posts
Header: x-api-key: YOUR_API_KEY
Body: { title, slug, content, excerpt?, tags?, published? }
```

### 更新文章

```
PUT /api/posts/[slug]
Header: x-api-key: YOUR_API_KEY
Body: { title?, slug?, content?, excerpt?, tags?, published? }
```

### 删除文章

```
DELETE /api/posts/[slug]
Header: x-api-key: YOUR_API_KEY
```

## 目录结构

```
├── app/
│   ├── api/posts/          # API 路由
│   ├── admin/              # 管理后台
│   ├── blog/               # 博客页面
│   └── components/         # 共享组件
├── content/posts/          # Markdown 文章
├── lib/
│   ├── posts.ts            # 文章数据层（支持文件/数据库）
│   └── prisma.ts           # Prisma 客户端
├── prisma/
│   └── schema.prisma       # 数据库模型
└── scripts/
    └── migrate-posts.ts    # 迁移脚本
```

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # 运行 ESLint
pnpm db:push      # 推送数据库 schema
pnpm db:studio    # 打开 Prisma Studio
pnpm db:migrate   # 迁移 Markdown 文章到数据库
```

## License

MIT
