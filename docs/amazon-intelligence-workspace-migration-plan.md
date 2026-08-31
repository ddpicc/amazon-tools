# Amazon 商品情报工作台改造方案

**状态：方案基线**  
**制定日期：2026-08-26**  
**适用项目：`amazon-tools`**  
**产品阶段：不接入 SP-API 的公开商品情报工具**

## 1. 背景与目标

当前项目已经具备一条可运行的亚马逊商品监控链路：用户创建项目，添加自有或竞品 ASIN，系统进行订阅和数据采集，保存商品快照，展示趋势，并生成日报、通知和评论记录。

与此同时，产品正在逐步扩展到评论分析、关键词研究、Listing 诊断和选品研究。若继续把每一项能力直接做成一个独立页面或独立工具，用户会反复输入 ASIN、站点和竞品，分析结果也会散落在不同功能中，难以形成持续的商品决策记录。

本方案将产品重新组织为：

> **以项目承载长期上下文，以工具发起具体任务，以监控持续发现变化，以分析结果支持运营决策。**

本轮改造的目标：

1. 将现有 `Project` 明确为商品情报工作区，不推倒重建项目模型。
2. 将“持续监控”和“一次性分析”分成两条清晰的数据与交互链路。
3. 将登录后的首页从额度/功能介绍页改造成跨项目行动中心。
4. 将全局菜单从“业务阶段菜单”调整为“工作台、项目、工具、账户”的任务结构。
5. 将项目内菜单从实现术语调整为卖家能理解的工作任务。
6. 为评论洞察、关键词研究、Listing 诊断等工具预留统一的分析运行模型。
7. 保留现有 URL 和数据表，通过兼容路由和增量迁移逐步改造。
8. 明确不接入 SP-API 的能力边界，避免界面和数据模型对用户形成错误承诺。

## 2. 本轮明确不做

以下能力不进入本轮产品主流程、主菜单或数据模型设计：

- 订单、销售额、收入和利润等卖家私有经营数据
- PPC 广告花费、ACOS、ROAS、广告归因和广告报表
- Seller Central 库存、FBA 库存、货件、入仓和补货状态
- 退款、退货率、买家之声等需要卖家账户或报表权限的数据
- 账户健康、绩效通知、买家消息和客服 SLA
- 通过 SP-API 修改 Listing、A+、广告或商品目录
- 团队、Workspace、成员邀请和项目级角色权限
- 复杂 BI、利润核算和企业级数据仓库

这些能力将来可以作为独立的数据接入层加入，但不能在当前页面中以“即将支持私有经营数据”的方式暗示已经可用。

当前产品只承诺以下数据范围：

- Amazon 公开商品页和竞品商品信息
- 价格、评分、评论数、BSR、卖家/变体和 Listing 公共信息
- 供应商提供的销量或需求估算，并明确标注为估算值
- 公开评论正文、评分、验证购买、图片或视频等信息
- 供应商提供的关键词、排名、搜索量或 CPC 信号
- 用户手动输入和用户导入的数据
- 基于上述事实生成的分析、摘要和建议

“自有 ASIN”只表示用户在项目中将该 ASIN 标记为 `OWN`，不表示系统已经验证用户拥有该 Amazon 卖家账户。

## 3. 产品定位与核心概念

产品定位为：

> **面向亚马逊卖家的商品情报工作台，帮助用户持续观察商品和竞品变化，并将公开数据转化为可追溯的运营判断。**

### 3.1 四个核心概念

| 概念 | 定义 | 典型生命周期 |
|---|---|---|
| 工作台 | 用户跨项目查看待处理事项、最近活动和工具入口的地方 | 持续存在 |
| 项目 | 围绕一个商品、机会或市场主题的长期上下文容器 | 创建后持续维护 |
| 监控 | 按计划反复采集商品事实并比较变化 | 定时执行 |
| 工具任务 | 用户主动发起的一次研究或分析 | 启动、运行、完成或失败 |

### 3.2 项目不等于监控订阅组

项目可以从监控开始，但不应被限制为“一个 own ASIN 加一组竞品”的订阅组。推荐的项目示例：

- `US｜Under Sink Organizer｜Listing 增长`
- `US｜Pet Hair Remover｜新品机会研究`
- `DE｜Kitchen Organizer｜竞品研究`

一个项目可以逐步积累：

```text
项目
├── 目标和备注
├── 自有 ASIN
├── 竞品 ASIN
├── 候选 ASIN
├── 关键词
├── 商品快照和历史变化
├── 评论和用户痛点
├── 分析运行结果
├── 告警、日报和通知记录
└── 后续行动和决策备注
```

第一阶段继续使用当前 `Project` 表作为工作区，不立即引入 `Workspace`。当前用户与项目均为用户所有，适合单用户和早期验证阶段。只有在真实出现多人协作、客户隔离或共享项目需求后，再增加 Workspace 和 Membership 层。

## 4. 目标架构

目标架构分为三层：

```text
全局工作台
├── 首页：跨项目行动中心
├── 项目：所有长期工作区
├── 工具箱：发起一次研究或分析
└── 账户：套餐、帮助和通知偏好

项目工作区
├── 项目概览
├── 监控动态
├── 商品对象
├── 评论与用户声音
├── 分析记录
├── 报告与通知
└── 项目设置

分析任务
├── 输入 ASIN / 关键词 / 项目上下文
├── 读取公开数据或项目内事实
├── 记录数据来源和时间
├── 生成结果与证据引用
└── 保存到项目或保持为独立结果
```

核心关系：

```text
工具 = 发起一次任务
监控 = 持续运行的任务
快照/评论/关键词 = 事实观察
分析结果 = 对事实的解释和建议
项目 = 组织事实、分析和后续决策的上下文
日报/通知 = 对监控或分析结果的展示与投递
```

分析建议不能覆盖商品快照，日报也不能成为通用分析结果表。事实、结论和投递必须保持分离。

## 5. 信息架构与菜单

### 5.1 全局菜单

推荐的普通用户全局菜单：

```text
工作台
  首页                         /dashboard
  项目                         /projects

工具箱
  商品 / ASIN 研究             /tools/product
  评论洞察                     /tools/reviews
  关键词研究                   /tools/keywords
  Listing 诊断                 /tools/listing

账户
  通知                         /notifications
  套餐与用量                   /billing
  使用帮助                     /help/webhooks
```

菜单实施原则：

1. “项目”是项目列表，不再命名为“产品监控”。监控是项目内的一项能力。
2. 工具统一放在“工具箱”分组，避免侧边栏随着工具数量增长而失控。
3. 尚未实现的工具不进入正式主菜单。可以在工具箱页面标记“规划中”，但不要放置不可点击的一级菜单。
4. 管理员菜单保持独立，不把 API 成本、订阅对账和内部任务诊断暴露给普通成员。
5. 通知中心是全局入口；项目内的通知配置仍留在项目设置或报告页。
6. 顶部搜索在没有真实搜索行为之前应隐藏。以后只搜索项目、ASIN 和已保存分析结果，不承诺搜索 Amazon 全站。

第一阶段真正开放的工具建议只有：

- 商品 / ASIN 研究
- 评论洞察

关键词研究和 Listing 诊断等数据链路稳定后再开放；选品机会研究可以先作为工具箱中的后续模块，不在没有实现时显示为主菜单。

### 5.2 项目内菜单

推荐的项目内菜单：

```text
项目概览                     /projects/[projectId]
监控动态                     /projects/[projectId]/monitoring
商品对象                     /projects/[projectId]/asins
评论与用户声音               /projects/[projectId]/reviews
分析记录                     /projects/[projectId]/analysis
报告与通知                   /projects/[projectId]/digest
项目设置                     /projects/[projectId]/settings
```

现有路由的兼容映射：

| 目标名称 | 现有路由 | 迁移方式 |
|---|---|---|
| 项目概览 | `/projects/[projectId]` | 保留 |
| 监控动态 | `/projects/[projectId]/trends` | 首阶段保留 URL，修改菜单和页面语义 |
| 商品对象 | `/projects/[projectId]/asins` | 保留 |
| 评论与用户声音 | `/projects/[projectId]/reviews` | 保留并逐步加入分析入口 |
| 分析记录 | 新增 `/projects/[projectId]/analysis` | 第二阶段加入 |
| 报告与通知 | `/projects/[projectId]/digest` | 保留 |
| 项目设置 | `/projects/[projectId]/settings` | 保留 |
| 旧比较页 | `/projects/[projectId]/compare` | 保留兼容跳转，不放入菜单 |
| ASIN 详情 | `/projects/[projectId]/asins/[asinId]` | 应实现详情页或统一改为有效的监控动态链接，不能继续无条件 404 |

术语约定：

- **监控动态**：最近发生了什么变化，以及变化证据
- **商品对象**：系统正在观察哪些 ASIN，以及其角色和同步状态
- **评论与用户声音**：评论列表、低星评论、新增评论和评论分析入口
- **分析记录**：用户主动运行过哪些研究，以及结果是否已保存
- **报告与通知**：日报归档、投递状态和通知渠道

不要把 `Trends`、`Compare`、`Snapshots` 等内部实现术语继续作为主要导航文案。

## 6. 首页改造方案

### 6.1 首页定位

`/dashboard` 应是登录后的工作台首页，不是功能介绍页，也不是简单的项目列表页。

首页第一屏要回答：

1. 今天有什么需要处理？
2. 哪些项目状态异常或数据过期？
3. 我最近正在做什么？
4. 我可以马上启动什么研究？

首页渲染只读取数据库，不在页面渲染期间直接调用外部数据源。外部 Provider 调用必须发生在明确的用户操作或后台任务中。

### 6.2 首页结构

```text
工作台
[新建项目] [开始研究]

组合健康
[活跃项目] [监控 ASIN] [新鲜数据比例] [待处理事项]

需要关注
[按优先级排列的跨项目事项]

我的项目
[项目健康卡片]

最近分析与报告
[可继续查看的结果]

快速开始
[商品研究] [评论洞察] [关键词研究]

账户状态
[套餐与用量]
```

### 6.3 “需要关注”事项

第一阶段优先接入当前已有数据：

- ASIN 同步失败
- 连续采集失败或数据过期
- 新增低星评论
- 日报生成失败
- Webhook/邮件投递失败
- 分析任务失败或分析完成待查看

第二阶段再加入经过验证的快照差异：

- 价格重大变化
- 评分变化
- 评论量异常增长或下降
- BSR 或关键词排名变化
- Listing 公共字段变化

每条事项至少包含：

```text
事项标题
项目名称
ASIN 或工具任务
发生时间
严重程度
下一步动作
```

示例：

```text
竞品 B0XXXXXX 价格下降 8%
Under Sink Organizer · US
今天 08:14
[查看监控动态]
```

当前 `Alert` 表和 `createProjectAlert` 服务已经存在，但不能仅因为存在数据表就假设告警生产链路完整。必须先确认快照差异服务有真实调用方，再把价格、排名变化展示为首页告警。

### 6.4 项目健康卡片

项目卡片应展示行动信息，而不是只有统计数字：

```text
Under Sink Organizer · US
3 个自有商品 · 7 个竞品
最近成功采集：今天 08:12
今日状态：正常
需要处理：2 项
[进入项目]
```

建议字段：

- 项目名称和站点
- 自有/竞品数量
- 最近成功采集时间
- 失败或过期 ASIN 数量
- 未处理告警或低星评论数量
- 今日日报状态
- 主操作按钮

套餐和额度信息保留，但作为辅助信息出现在右上角、账户状态区或创建项目上下文中，不占据首页第一视觉区域。

### 6.5 空状态

空状态必须带下一步动作：

- 没有项目：`创建第一个项目`
- 没有 ASIN：`添加监控对象`
- 没有评论：`等待首次采集`，同时提供 `开始评论洞察`
- 没有分析：`选择一个工具开始研究`
- 没有通知：`配置日报渠道`

## 7. 项目工作区设计

### 7.1 项目概览

项目概览聚合项目当前状态：

- 项目目标、站点和创建时间
- 自有/竞品数量
- 最近成功采集时间
- 数据新鲜度
- 待处理事项
- 最近日报状态
- 最近分析结果
- 进入监控动态、评论洞察和工具箱的快捷操作

概览不应重复完整的 Listing 卡片、ASIN 管理表和日报档案。它负责判断项目健康和下一步动作。

### 7.2 监控动态

监控动态承载当前 `/trends` 的主要内容：

- 最新商品状态
- 自有和竞品对比
- 价格、评分、评论量、BSR 等历史变化
- Listing 公共字段变化
- 变化发生的时间和来源
- 变化对应的快照证据

第一阶段可继续使用 `/trends` URL。后续可增加 `/monitoring` 正式路由，再通过兼容重定向保留旧地址。

### 7.3 商品对象

商品对象页承载当前 `/asins`：

- 添加、暂停和恢复监控对象
- 自有/竞品角色
- 站点和 ASIN
- 最近同步时间
- 同步状态和错误原因
- 进入单个 ASIN 详情

添加 ASIN 后必须明确显示“等待首次采集”或“首次采集失败”，不能在没有快照时显示为正常监控。

### 7.4 评论与用户声音

当前 `/reviews` 先作为事实查看页：

- 评论列表
- 评分、标题、正文、日期和验证状态
- 按 ASIN、星级和新增时间筛选
- 新增低星评论提示
- `开始评论洞察` 按钮

评论分析输出不应直接写回评论事实记录，而应作为分析任务保存。

### 7.5 分析记录

新增 `/analysis` 后用于展示：

- 分析类型
- 关联 ASIN 或关键词
- 运行状态
- 创建时间和数据截止时间
- 结果摘要
- 证据数量
- 重新运行、导出或关联到其他项目

独立工具运行可以先没有项目，完成后允许附加到项目。已经属于项目的运行默认归档在该项目下。

### 7.6 报告与通知

当前 `/digest` 继续承担：

- 日报历史
- 生成状态
- 邮件、飞书、企业微信投递状态
- 监控任务历史
- 失败重试
- 通知渠道配置入口

日报是监控结果的展示和投递，不作为通用分析记录表。

## 8. 工具设计原则

### 8.1 两种启动方式

#### 从工具箱独立启动

用户在 `/tools/reviews` 中输入：

- ASIN 或商品 URL
- Amazon 站点
- 评论范围
- 是否只分析 1-3 星
- 是否关联已有项目

工具完成后提供：

- 查看结果
- 保存到项目
- 重新运行
- 导出结果

#### 从项目内启动

用户在项目中点击评论洞察时，系统自动带入：

- 项目站点
- 项目内自有 ASIN 和竞品 ASIN
- 已保存评论
- 最近商品快照
- 已有关键词观察

默认结果保存到当前项目。

两种入口共享同一套服务和结果模型，不允许工具箱和项目页各自实现一套评论分析逻辑。

### 8.2 工具优先级

推荐顺序：

1. 商品 / ASIN 研究
2. 评论洞察
3. 关键词研究
4. Listing 诊断
5. 选品机会研究

评论洞察也可以优先于独立商品研究实现，因为当前已有 `ProductReview`、低星评论采集和项目上下文。但第一批工具要选择一条链路先做深，不要同时建设五个半成品。

### 8.3 评论洞察第一版输出

第一版不追求复杂的自动化写作，先输出可验证的洞察：

- 1-3 星评论数量和占比
- 高频痛点主题
- 高频卖点主题
- 按变体归类的问题
- 具有代表性的用户原话
- 可能的产品或 Listing 改进方向
- FAQ 和文案方向草案
- 每个结论对应的评论证据

## 9. 数据模型策略

### 9.1 现有监控事实表继续保留

继续使用：

```text
Project
TrackedAsin
ProductSnapshot
ProductKeywordSnapshot
ProductReview
MonitoringSubscription
SyncJob
Alert
ProjectSettings
NotificationChannel
InboxNotification
NotificationDelivery
DailyDigestRun
ApiUsageLog
```

这些表的职责：

- `ProductSnapshot`：商品公共事实的历史观察
- `ProductKeywordSnapshot`：关键词和排名的历史观察
- `ProductReview`：观察到的评论记录
- `MonitoringSubscription`：持续监控关系
- `SyncJob`：采集运行记录
- `Alert`：由事实变化派生的提醒
- `DailyDigestRun`：日报生成和投递结果

不要把 AI 建议写入 `ProductSnapshot`，也不要把一次性分析伪装成 `SyncJob`。

### 9.2 第二阶段新增 `AnalysisRun`

建议新增通用分析运行表：

```text
AnalysisRun
├── id
├── userId
├── projectId，可为空
├── trackedAsinId，可为空
├── toolKey / analysisType
├── marketplace
├── status
├── inputJson
├── resultJson
├── provider
├── model
├── promptVersion
├── inputFingerprint
├── sourceAsOf
├── requestedAt
├── startedAt
├── completedAt
└── errorCode / errorMessage
```

初始的 `resultJson` 采用 JSON，避免在尚未验证用户流程前创建过多专用结果表。只有当某类结果需要长期筛选、比较、统计或导出时，才增加类型化子表。

建议的分析类型：

```text
PRODUCT_LOOKUP
REVIEW_INSIGHTS
KEYWORD_RESEARCH
LISTING_DIAGNOSIS
MARKET_OPPORTUNITY
COMPETITOR_COMPARE
```

### 9.3 `AnalysisEvidence`

为保证分析可追溯，后续增加证据关联：

```text
AnalysisEvidence
├── id
├── analysisRunId
├── productSnapshotId，可为空
├── keywordSnapshotId，可为空
├── productReviewId，可为空
├── alertId，可为空
├── label
├── excerpt
├── fieldPath
└── observedAt
```

分析结果中出现“尺寸问题是主要差评原因”时，应能追溯到具体评论或评论集合，而不是只保存不可验证的自然语言。

### 9.4 `DataCapture` 后续加入

在分析运行模型稳定后，再增加统一的数据来源记录：

```text
DataCapture
├── id
├── userId / projectId / trackedAsinId
├── marketplace
├── provider
├── apiName
├── sourceKind
├── requestedAt
├── receivedAt
├── capturedAt
├── normalizerVersion
├── schemaVersion
├── status
├── rawPayload，服务端保存
└── error metadata
```

新产生的快照、关键词和评论增加可为空的 `captureId`。旧数据不强行推断来源，标记为历史数据或未知来源。

`sourceKind` 至少包括：

```text
LIVE_PROVIDER
MOCK
IMPORT
USER_INPUT
DERIVED
LEGACY_UNKNOWN
```

所有结果页逐步展示：来源、采集时间、新鲜度、是否估算和数据限制。Mock 数据必须显式标记，不能伪装成真实 Amazon 数据。

## 10. Provider 边界

当前可以将现有 Sorftime 适配层作为主要 Provider；未来也可以接入 Canopy 等公开数据 API，但业务服务不应直接依赖某一家 Provider 的原始字段。

建议在服务层分出两类接口：

```text
MonitoringProvider
├── subscribeAsins
├── unsubscribeAsins
└── collectMonitoredAsin

ResearchProvider
├── lookupProduct
├── fetchReviews
├── researchKeywords
└── researchMarket
```

两类接口可以共享 HTTP、鉴权和字段归一化代码，但生命周期必须分离：

- 监控接口可以建立或更新订阅关系。
- 研究接口只能执行一次性查询，不能隐式创建 `MonitoringSubscription`。
- 工具失败不能改变项目的监控状态。
- 监控失败不能覆盖已有成功事实。

## 11. 需要优先校准的现有技术契约

### 11.1 `ProductRequest` 与 `ASINSubscriptionCollection`

现有文档描述的日常监控链路是 `ASINSubscriptionCollection`，但同步服务中仍存在 `ProductRequest` 调用路径。需要明确：

1. 哪个接口是日常监控的正式来源。
2. `ProductRequest` 是否只用于一次性研究或创建时兜底。
3. 两者返回字段如何统一到 `ProductSnapshot`。
4. 页面中的来源和新鲜度如何反映真实接口。
5. Mock 与 live 的测试数据如何区分。

相关文件：

- `server/services/sync-tracked-asin.ts`
- `server/services/project-lifecycle.ts`
- `server/services/poll-monitoring-subscriptions.ts`
- `server/sorftime/adapter.ts`
- `server/sorftime/product.ts`
- `docs/monitoring-runbook.md`

### 11.2 添加 ASIN 后的首次采集

添加监控对象后，系统需要明确执行或展示以下状态：

```text
创建监控关系
→ 请求首次采集
→ 写入首条 ProductSnapshot
→ 更新 lastSyncedAt / lastSuccessAt
→ 成功或失败
```

如果产品策略是等待下一个定时任务，则必须在 UI 明确显示“等待首次采集”，不能显示“监控正常”。

### 11.3 告警生产链路

目前存在 `Alert` 和通知派发基础设施，但要确认快照比较服务有明确调用方。建议先建立可测试的：

```text
上一条快照 + 当前快照
→ 标准化 diff
→ 规则判断
→ Alert
→ InboxNotification / 外部投递
```

在调用链稳定前，首页只展示同步失败、低星评论和投递失败等已有事实，不把尚未生成的价格或排名变化称为实时告警。

### 11.4 评论项目关联

`ProductReview` 同时存在通过 `TrackedAsin` 访问项目和可为空的 `projectId` 关系，容易造成同步写入和日报查询不一致。应选定一条权威关系，修复同步、日报和评论页的查询方式，并为重复数据增加测试。

### 11.5 Marketplace 规范化

ASIN、站点和 Provider domain 必须使用统一的规范化函数，避免同一个项目产生 `US`、`amazon.com`、`www.amazon.com` 等不同值。规范化应在 API 输入、项目创建、Provider 调用和数据库写入前统一执行。

### 11.6 旧文档与当前工作区的差异

仓库中较早的 PRD 和实现说明仍然描述“当前版本不支持”的能力，但当前工作区已经出现了相应实现。后续开发应以代码和本方案共同确认后的产品契约为准，不应直接照搬旧文档中的排除项。

当前已实现或已暴露的行为包括：

- 项目创建后可以通过 `POST /api/projects/[projectId]/asins` 追加或恢复 ASIN，项目内也有 `AddAsinForm`。因此“创建后不能追加监控对象”不再是当前产品约束；后续应补齐追加后的首次采集和失败状态，而不是删除该能力。
- 监控对象页和接口仍提供受限的“手动同步”，并按 ASIN/日期控制频率。旧 runbook 写的是“项目页不提供手动同步”，需要在阶段 0 明确它是正式能力、管理员能力还是兼容能力。
- 当前初始化和日常同步会调用 `syncListingKeywords`，并且 `/trends` 会显示关键词快照。旧文档中“关键词监控完全不做”的描述已经过时；应把它定义为当前的附带观察能力，还是暂时隐藏并停止采集，不能保持文档与代码双重语义。
- 代码中存在 `fetchAsinSubscriptionCollection`，但 `syncTrackedAsin` 的实际路径仍调用 `fetchProductRequest`。在选择正式监控接口前，不能声称日常采集已经完全遵循 `ASINSubscriptionCollection`。
- 当前成员界面是多路由项目工作区，包含 `/trends`、`/asins`、`/digest`、`/reviews` 和 `/settings`；较早文档描述的单页 dashboard 只能视为历史设计，不应作为本次改造的页面约束。
- 当前实现的项目总 ASIN 上限为 10 个，旧计划中的自有 1-3 个、竞品 5-20 个分角色范围尚未被同等执行。套餐和 ASIN 限额应在单独的产品计费规则中确认，本方案不把旧数字当作实现要求。

当前仓库存在较多未提交的导航、计费、评论、Listing intelligence 和 Prisma 变更。本方案以当前工作区作为迁移参考基线，但不把未提交改动视为已发布版本；实施前应记录实际采用的 commit 或 release 标识。

## 12. 分阶段实施路线

### 阶段 0：契约校准

**状态：** 已完成首轮增量实施（2026-08-27）；输入规范化和自动化测试作为后续收尾。

**目标：** 确保现有监控数据可信。

交付内容：

- 已确定 `ASINSubscriptionCollection` 是日常监控唯一正式来源；`ProductRequest` 不再属于常规监控主路径。
- 已将项目初始化和追加 ASIN 的首采统一收敛到 `syncTrackedAsin(..., { jobType: "initial_sync" })`。
- 已保留手动同步作为正式的受限成员能力，并将首采从手动刷新额度中豁免。
- 已修复评论同步写入 `projectId`，并将日报评论范围查询改为权威的 `trackedAsin.projectId` 关系。
- 需要后续补充 marketplace/domain 全入口规范化和 Provider adapter 自动化测试。
- 用户路由的项目所有权校验继续作为验收项。

验收标准：

- 文档、服务和页面对监控来源的描述一致。
- 新 ASIN 的等待、成功和失败状态可区分。
- 旧监控任务行为不因菜单改造而改变。

### 阶段 1：信息架构和首页

**状态：** 已完成首轮增量实施（2026-08-27）；工具箱、全局通知列表和分析任务留待后续阶段。

**目标：** 先改变用户理解方式，不改核心事实表。

交付内容：

- 全局导航已调整为工作台、项目、账户；未实现的工具和选品入口暂不展示。
- `/projects` 已按项目列表重新命名和组织。
- `/dashboard` 已改成跨项目行动中心，读取本地监控事实。
- 项目菜单已改为项目概览、监控动态、商品对象、评论与用户声音、报告与通知、项目设置。
- 登录、注册和普通用户重定向已统一到 `/dashboard`。
- `/compare` 等旧路径继续作为兼容入口。
- 旧 ASIN 详情链接已做所有权校验后重定向到有效的监控动态页面。
- 顶栏无功能搜索已移除，通知入口不再点击即全部标记已读。
- 项目列表和商品对象页已补充最近成功采集、失败、过期和首采状态。

验收标准：

- 用户从首页能找到项目、工具和待处理事项。
- 首页不调用外部 Provider。
- 每个菜单项都有真实页面或明确的后续状态。
- 现有项目 URL 和日报入口仍可访问。

本轮已验证：`npx prisma validate`、`npx tsc --noEmit`、`git diff --check` 与 `npm run build` 均通过；受保护路由在未认证状态下会重定向到 `/login`。

### 阶段 2：数据来源和新鲜度

**状态：** 已完成首轮增量实施（2026-08-27）。`DataCapture` 已落库并关联新的商品快照、关键词快照和评论采集；历史记录继续保留空 `captureId`，页面按“历史数据（来源未知）”呈现。后续可按实际 Provider 增加更细的字段级来源追踪。

**目标：** 让每条事实都能说明来源和时间。

交付内容：

- 增加 `DataCapture` 或等价的采集运行记录。
- 新采集结果双写 capture 元数据。
- 为旧数据标记历史/未知来源。
- 在商品详情、监控动态和日报中显示来源、新鲜度和估算限制。
- 统一 Provider adapter 的返回结构。

验收标准：

- 页面不会把 Mock 数据显示成 Live 数据。
- 可以定位某个快照由哪个 Provider 操作产生。
- 采集失败不会生成伪造的成功快照。

### 阶段 3：分析运行基础设施

**状态：** 已完成首轮增量实施（2026-08-27）。已新增 `AnalysisRun`、`AnalysisEvidence` 与产品事实查询工具；支持独立启动、结果关联项目、失败原因展示与重试。评论洞察、关键词研究和 Listing 诊断仍在后续阶段接入。

**目标：** 建立工具的统一执行和保存方式。

交付内容：

- 增加 `AnalysisRun`。
- 增加 `/tools` 工具箱和工具详情页。
- 增加项目内 `/analysis` 列表和详情页。
- 支持无项目启动，完成后关联到项目。
- 保存输入、状态、结果、Provider、模型、提示词版本和数据截止时间。
- 对失败任务提供重试，不修改监控事实。

验收标准：

- 同一种工具只有一套执行服务。
- 工具可以从全局和项目内启动。
- 独立分析可以保存到项目。
- 任务失败有明确原因并可重试。

### 阶段 4：评论洞察

**状态：** 已完成首轮实现（2026-08-28）。评论洞察使用 Canopy REST 评论接口进行一次性采集，结果和原话写入 `AnalysisRun` / `AnalysisEvidence`；缺少 `CANOPY_API_KEY` 时明确失败，不回退到模拟评论。

**目标：** 实现第一个完整的分析工具。

交付内容：

- 复用现有 `ProductReview` 数据。
- 支持项目评论和独立 ASIN 评论分析。
- 输出痛点、卖点、变体问题、用户原话和建议。
- 写入 `AnalysisRun` 和 `AnalysisEvidence`。
- 在项目概览显示最近评论分析结果。

验收标准：

- 每个主题结论都能查看证据。
- 结果显示数据截止时间。
- 低星评论筛选和新增评论逻辑可验证。
- 分析结果不会改变原始评论数据。

### 阶段 5：关键词与 Listing 诊断

**状态：** 已完成首轮增量实施（2026-08-28）。关键词研究可独立按 ASIN 运行并保存 Provider 估算与限制；Listing 诊断可从项目分析页读取本地快照和关键词观察后运行。评论洞察仍受 Canopy 的评论分页接口可用性限制。

**目标：** 将评论、关键词、快照组合为运营建议。

交付内容：

- 关键词研究工具。
- 关键词结果保存和项目关联。
- Listing 健康诊断。
- 基于评论痛点、关键词信号和商品变化生成建议。
- 支持结果导出或复制。

验收标准：

- 建议能指出使用的数据来源。
- 估算指标与事实指标有清晰区分。
- 诊断结果可回看、重跑和比较。

### 阶段 6：后续平台能力

仅在真实需求出现后考虑：

- 后台任务队列和长任务状态
- 原始数据保留与归档策略
- 用户导入数据
- Workspace、团队成员和共享项目
- SP-API 或其他卖家账户私有数据接入

## 13. 关键目录与实现边界

信息架构和页面：

- `app/(app)/(global)/layout.tsx`
- `app/(app)/(global)/dashboard/page.tsx`
- `app/(app)/(global)/projects/page.tsx`
- `app/(app)/(project)/projects/[projectId]/layout.tsx`
- `app/(app)/(project)/projects/[projectId]/page.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/top-bar.tsx`

监控和 Provider：

- `server/sorftime/adapter.ts`
- `server/sorftime/product.ts`
- `server/sorftime/reviews.ts`
- `server/sorftime/subscriptions.ts`
- `server/services/project-lifecycle.ts`
- `server/services/sync-tracked-asin.ts`
- `server/services/poll-monitoring-subscriptions.ts`
- `server/services/daily-digests.ts`
- `server/services/alert-notifications.ts`

数据模型：

- `prisma/schema.prisma`
- `prisma/migrations/`
- `server/services/api-usage.ts`
- `server/services/entitlements.ts`

工具和分析：

- 后续新增 `app/(app)/(global)/tools/`
- 后续新增 `app/(app)/(project)/projects/[projectId]/analysis/`
- 后续新增 `server/services/analysis/`
- 后续新增 `server/services/analysis-runs.ts`

服务边界要求：

1. 页面 Server Component 只查询本地数据库。
2. 外部 Provider 只从明确的 action、route 或后台任务调用。
3. Provider 原始字段在 adapter 层归一化，不向页面泄漏。
4. 分析任务不复用带订阅副作用的监控同步服务。
5. 数据库事实、AI 结论、通知投递分别保存。

## 14. 兼容、风险与回滚策略

### 14.1 增量迁移

当前工作区存在较多未提交改动，包括计费、评论、Listing intelligence、导航和 Prisma 变更。后续实施必须以当前工作区为基线，避免使用大范围回退或覆盖命令。

数据库变更采用 additive migration：

- 新字段先允许为空。
- 新旧代码在过渡期双读或双写。
- 旧 URL 保留 redirect 或 alias。
- 旧事实表继续作为监控主数据源。
- 分析结果先使用 JSON，验证工作流后再类型化。

### 14.2 主要风险

- 监控接口契约漂移导致新鲜度和成功状态不可信。
- 添加 ASIN 后未产生首条快照，首页误显示正常。
- Alert 表存在但没有实际生成调用方，首页出现空告警或错误告警。
- 评论通过两条项目关系查询，日报和评论页结果不一致。
- Provider 原始字段变化导致分析结果不可复现。
- 过早开放多个工具，用户无法判断每个工具的输入和结果边界。
- 未来引入团队或 SP-API 时，当前用户所有模型需要升级。

### 14.3 回滚策略

- 阶段 1 的菜单调整可以通过保留旧路由和旧页面标题快速回滚。
- 阶段 2 的来源字段均为可空字段，删除展示逻辑不影响旧事实。
- 阶段 3 的 `AnalysisRun` 与监控表分离，停用工具不会影响监控任务。
- 新工具采用 feature flag 或权限能力控制，失败时可以隐藏入口而不删除历史结果。

## 15. 验收清单

### 产品与导航

- [ ] 首页明确展示跨项目待处理事项。
- [ ] `/projects` 被用户理解为项目列表，而不是单一监控功能。
- [ ] 工具入口集中在工具箱，不创建重复的独立 ASIN 管理。
- [ ] 项目内菜单使用概览、监控动态、商品对象、评论、分析、报告等任务语言。
- [ ] 未实现能力不作为可点击主菜单。
- [ ] 登录、注册和普通用户重定向路径一致。
- [ ] 所有可见详情链接都指向有效页面。

### 数据可信度

- [ ] 监控接口来源和文档一致。
- [ ] 添加 ASIN 后的首次采集状态可见。
- [ ] Mock、Live、Import 和 Unknown 数据有明确标识。
- [ ] 快照、评论、关键词观察保留原始事实，不被 AI 建议覆盖。
- [ ] 告警有真实生产调用方或不在首页宣称已支持。
- [ ] 日报查询不会漏掉新采集评论。

### 工具与分析

- [ ] 工具可独立启动，也可从项目上下文启动。
- [ ] 分析结果可保存或关联到项目。
- [ ] 分析运行状态、失败原因和数据截止时间可查看。
- [ ] 关键结论可追溯到评论、快照或关键词证据。
- [ ] 工具调用不会隐式创建监控订阅。
- [ ] 第一批工具中至少有一个完成从输入到保存结果的完整闭环。

## 16. 文档维护规则

本文件是产品架构基线，不是每次实现细节的变更日志。后续维护遵循：

1. 菜单、路由、核心实体或数据来源边界变化时更新本文件。
2. 具体接口字段和运行命令写入对应的 PRD、runbook 或 API 文档。
3. 每次完成一个阶段，在对应阶段下补充实际完成日期、实现路径和未完成事项。
4. 如果未来接入 SP-API，先单独编写数据接入方案和权限模型，再修改本文件的“不做范围”。
5. 如果引入团队协作，先单独编写 Workspace/Membership 方案，不直接把成员字段散落到现有 Project 查询中。
6. 任何分析工具都必须说明输入、输出、数据来源、数据截止时间和限制。

## 17. 最终决策

当前产品采用以下架构决策：

```text
Amazon 商品情报工作台
├── 首页：今天需要处理什么
├── 项目：围绕商品或机会长期积累上下文
├── 监控：持续采集公开商品事实并发现变化
├── 工具：按需运行评论、商品、关键词和 Listing 分析
└── 结果：保存为可追溯的项目资产
```

当前不采用：

```text
监控工具 + 评论工具 + 关键词工具 + 选品工具
```

这种彼此隔离的产品结构，也不提前为 SP-API、团队协作和完整 ERP 能力增加复杂抽象。

实施顺序固定为：

```text
先校准监控事实
→ 再调整首页和菜单
→ 再增加 AnalysisRun
→ 先完成评论洞察
→ 再扩展关键词和 Listing 诊断
```
