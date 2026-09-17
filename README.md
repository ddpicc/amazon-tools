# Amazon Tools

面向 Amazon 卖家的商品情报工作台：按站点和项目管理自有商品与竞品，查看商品变化、关键词和评论，并通过告警与日报跟进需要处理的事项。

## 功能

- 项目工作区：管理自有 ASIN 和竞品 ASIN，查看商品快照、趋势、对比和 Listing 信息。
- 监控与跟进：查看采集状态、变化记录和告警，配置站内通知、飞书、企业微信或邮件通知。
- 评论与关键词：查看评论、评论洞察和关键词数据，并将分析任务关联到项目。
- 分析工具：提供商品事实查询、评论洞察、关键词研究和 Listing 诊断。
- 每日摘要：按项目配置摘要时间，通过站内通知或已配置的外部渠道接收摘要。
- 账户与管理：支持注册和登录、反馈墙、套餐用量及管理员用户和订阅管理。

商品与评论等外部数据取决于相应的数据服务配置。没有配置真实数据服务时，Sorftime 适配器默认使用模拟数据；界面和记录会标注数据来源。分析结果应结合其数据来源和采集时间阅读。

## 技术栈

- Next.js 14、React 18、TypeScript、Tailwind CSS
- PostgreSQL、Prisma
- Auth.js 凭据登录
- 可选集成：Sorftime、Reveyes、OpenAI 兼容接口和 Resend

## 本地运行

需要 Node.js、npm 和可连接的 PostgreSQL 数据库。

```bash
npm install
cp .env.example .env
```

编辑 `.env`，至少设置 `DATABASE_URL`、`NEXTAUTH_URL` 和 `NEXTAUTH_SECRET`。本地 PostgreSQL 示例连接串见 `.env.example`；按实际数据库地址修改。

初始化数据库并启动开发服务器：

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

访问 <http://localhost:3000>。如需先更新 Prisma Client，可运行：

```bash
npm run prisma:generate
```

本地 seed 默认创建 `admin@example.com` 和 `demo@example.com`，两者默认密码均为 `password123`。请只在本地开发环境使用这些默认值；通过 `ADMIN_USER_EMAIL`、`ADMIN_USER_PASSWORD`、`DEMO_USER_EMAIL` 和 `DEMO_USER_PASSWORD` 设置本地账号。生产环境应使用独立的强随机凭据，不要沿用示例密码。

## 环境变量

基础变量和 Sorftime、邮件及 AI 摘要变量可在 `.env.example` 中查看。

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串，必需 |
| `NEXTAUTH_URL` | 应用访问地址；本地通常为 `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth.js 会话与令牌签名密钥；部署时设置为强随机值 |
| `SORFTIME_API_BASE_URL` | Sorftime API 地址；未设置时使用代码内默认地址 |
| `SORFTIME_ACCOUNT_SK` | Sorftime 账户凭据；兼容旧变量 `SORFTIME_API_KEY` |
| `SORFTIME_USE_MOCK` | 设为 `false` 才会尝试真实 Sorftime API；同时必须配置账户凭据。默认使用模拟数据 |
| `REVEYES_API_KEY` | 项目评论同步及评论洞察所需的评论数据服务凭据 |
| `REVEYES_API_BASE_URL` | Reveyes API 地址，可选；默认地址见 `server/reveyes/reviews.ts` |
| `OPENAI_URL`、`OPENAI_KEY`、`OPENAI_MODEL` | OpenAI 兼容接口配置，用于支持 AI 总结和深度分析的功能；模型默认值见 `.env.example` |
| `EMAIL_PROVIDER`、`RESEND_API_KEY`、`EMAIL_FROM` | 配置 Resend 邮件投递 |
| `MONITORING_CRON_SECRET` | 保护内部采集、摘要和通知重试接口的共享密钥 |

`EMAIL_FROM_NAME`、`AUTH_EMAIL_FROM`、`AUTH_EMAIL_FROM_NAME`、`DIGEST_EMAIL_FROM` 和 `DIGEST_EMAIL_FROM_NAME` 可用于设置通用、验证邮件或日报邮件的发件人信息。飞书和企业微信通知地址在项目通知设置中配置。

## 生产构建

确保生产环境变量和 PostgreSQL 已配置，再应用数据库迁移并构建：

```bash
npx prisma migrate deploy
npm run build
npm run start
```

部署平台需要将应用进程持续运行，并单独设置定时任务。采集、日报和通知重试接口的鉴权、调用方式和调度建议见 [`docs/monitoring-runbook.md`](docs/monitoring-runbook.md)。

## 常用命令

```bash
npm run dev                # 本地开发
npm run lint               # ESLint / Next.js 检查
npm run build              # Prisma Client 生成并构建应用
npm run start              # 启动生产构建
npm run prisma:generate    # 生成 Prisma Client
npm run prisma:migrate     # 本地开发迁移
npx prisma db seed         # 初始化套餐和本地账号
```

仓库暂未配置自动化测试脚本。
