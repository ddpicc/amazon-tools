# Amazon Tools 设计 Spec

更新时间：2026-06-02

## 1. 目标

为当前的亚马逊竞品监控产品定义一套可直接用于 Stitch 生成和后续 UI 实现的设计规格。

当前产品已收口为以下形态：

- 产品以 `Project` 为核心组织单元
- 外层是项目入口，内层是单个项目的工作台
- 监控对象分为 own ASIN 和 competitor ASIN
- Sorftime 数据按天更新
- 系统每天运行一次数据拉取
- 飞书 / 企业微信 / 邮件默认只发日报
- 日报需要有发送记录和内容存档
- 普通用户只看业务结果和通知配置，不看成本和系统内部状态

这意味着视觉和交互重点不是“配置复杂规则”，而是：

- 每个项目的数据今天是否已同步
- 每个项目的日报是否已发送
- own ASIN 与 competitor ASIN 今天横向相比怎么样
- 单个 ASIN 过去 7 天 / 30 天纵向怎么变化
- 用户能否方便地管理监控 ASIN 和通知渠道

## 2. 设计方向

推荐风格：`Warm Data Editorial`

关键词：

- Supabase-inspired project workspace
- editorial analytics
- market intelligence
- premium SaaS
- warm dark graphite
- gold + cyan accents
- high-contrast charts
- structured but not generic admin

设计目标：

- 信息架构参考 Supabase 的“项目入口 + 项目工作台”，但不要照搬 Supabase 的浅色技术后台视觉
- 看起来像“运营情报台”，不是传统 ERP 后台
- 第一屏先给结论，再给列表
- 图表和卡片强调对比关系，而不是纯 KPI 数字
- 横向对比和纵向趋势要明确分工

## 3. 视觉系统

### 3.1 色彩

基础色：

- `Graphite 950`：主背景，接近 `#0B0D10`
- `Graphite 900`：卡片背景，接近 `#11151A`
- `Graphite 800`：边框和分割线，接近 `#1D232B`
- `Fog 300`：弱文案，接近 `#A7B0BC`
- `Fog 50`：主文字，接近 `#F5F7FA`

强调色：

- `Amber Signal`：主强调色，接近 `#F5B942`
- `Cyan Data`：趋势和对比辅助色，接近 `#4CC9F0`
- `Emerald Positive`：正向信号，接近 `#22C55E`
- `Rose Risk`：风险与失败，接近 `#FB7185`
- `Violet Secondary`：次级对比线，接近 `#A78BFA`

使用规则：

- 页面主 CTA 用 `Amber Signal`
- own 数据优先用 `Amber Signal`
- competitor 数据优先用 `Cyan Data`
- 风险、失败、异常用 `Rose Risk`
- 成功、已投递、系统正常用 `Emerald Positive`

### 3.2 字体

推荐组合：

- 标题：`Manrope`
- 正文：`IBM Plex Sans`
- 数字 / 技术字段：`IBM Plex Sans` 或 `JetBrains Mono`

原因：

- `Manrope` 更适合做情报台式标题，现代但不空泛
- `IBM Plex Sans` 信息密度高，适合表格、注释、图表标签

### 3.3 形态

- 卡片圆角：`20px - 24px`
- 输入框 / 按钮圆角：`12px - 16px`
- 边框统一偏细，减少厚重感
- 不使用高饱和大面积纯色底
- 背景可以有轻微渐变或噪点感，但不能抢内容

### 3.4 图表风格

- 背景透明，嵌入卡片内
- 网格线细而弱
- 线宽略粗，强调趋势走势
- 横向对比图中 own 和 competitor 必须视觉区分明显
- 纵向趋势图中重点突出单个 ASIN 的历史变化
- Tooltip 统一深色浮层

## 4. 信息架构

第一版产品拆成 2 层：

1. `Projects Overview`：所有项目的入口
2. `Project Workspace`：进入单个项目后的工作台

项目工作台左侧菜单保持简化：

1. `Overview` / `今日摘要`
2. `Trends` / `趋势`
3. `ASINs` / `监控对象`
4. `Digest` / `日报`
5. `Settings` / `通知设置`

暂不在第一版左侧菜单中加入：

- Alerts
- Admin Ops
- API usage
- 复杂规则配置

这些能力可以后续扩展，但不要在第一版干扰用户理解主流程。

## 5. 核心页面

## 5.1 Projects Overview

页面定位：

- 用户登录后的总入口
- 看所有项目的基础状态
- 点击项目进入对应工作台

页面结构：

### A. 顶部 Hero

内容：

- 页面标题：`项目总览`
- 副标题：说明这是亚马逊竞品监控项目入口
- 主按钮：`新建项目`

视觉：

- 左侧文字，右侧按钮
- 背景保持简洁，避免过度装饰
- 整体像 Supabase 的项目入口，但视觉仍是 Warm Data Editorial

### B. 项目卡片网格

每张项目卡片展示：

- 项目名称
- marketplace
- own ASIN 数量
- competitor ASIN 数量
- 日报状态：`已发送` / `未发送` / `发送失败`
- 今日同步状态：`今日数据已拉取` / `等待拉取` / `拉取失败`

明确不展示：

- 今日变化数量
- 累计告警数
- 复杂运营指标

交互：

- 点击卡片进入项目工作台 Overview
- 卡片右上角可以有轻量状态标签，例如：
  - `日报已发送`
  - `等待同步`
  - `同步失败`

设计要求：

- 每张卡片像“情报项目卡”，但信息保持克制
- 重点是让用户快速知道项目是否完成了今天的数据拉取和日报发送
- own / competitor 数量应该并列显示，形成项目规模感

## 5.2 Project Workspace Shell

页面定位：

- 单个项目的统一工作台框架
- 所有项目内页面共享同一套左侧菜单和顶部项目上下文

布局：

- 左侧固定 sidebar
- 右侧主内容区
- 顶部显示项目名称、marketplace、同步状态、日报状态

左侧菜单：

- `Overview` / `今日摘要`
- `Trends` / `趋势`
- `ASINs` / `监控对象`
- `Digest` / `日报`
- `Settings` / `通知设置`

设计要求：

- sidebar 借鉴 Supabase 的工作台结构
- 菜单数量保持少，让用户一眼知道产品主流程
- 当前菜单项用 amber 高亮
- 不把管理员能力、API 成本、内部任务状态放进普通用户工作台

## 5.3 Overview / 今日摘要

页面定位：

- 项目主页面
- 回答“今天 own ASIN 和 competitor ASIN 横向相比怎么样”
- 这是横向对比页面，不是历史趋势页面

页面结构：

### A. 顶部摘要 Hero

展示内容：

- 项目名称
- marketplace
- own ASIN 数量
- competitor ASIN 数量
- 今日同步状态
- 今日日报状态
- 1 到 3 条重点结论

重点结论示例：

- `竞品组平均价格低于 own 8.4%`
- `own 平均评分高于竞品，但评论量落后`
- `竞品组评论增长更快，建议关注头部 ASIN`
- `今日日报已发送到飞书和邮件`

### B. 横向对比指标区

建议展示 4 张核心对比卡：

- own 平均价格 vs competitor 平均价格
- own 平均评分 vs competitor 平均评分
- own 总评论数 vs competitor 总评论数
- own 最佳 BSR vs competitor 最佳 BSR

设计要求：

- 每张卡不是单一数字，要体现 own 与 competitor 的对比关系
- 可以使用左右分栏、比例条、迷你柱状图或双线 sparkline
- own 使用 amber，competitor 使用 cyan
- 摘要文案要直接说明谁领先、谁落后、差距是多少

### C. 对比图表区

推荐图表：

- `价格分布对比`：own 与 competitor 当前价格区间
- `评论数对比`：own 与 competitor 评论总量或均值
- `评分对比`：own 与 competitor 平均评分
- `BSR 对比`：own 与 competitor 当前排名表现

原则：

- 这是当前状态的横向对比
- 不默认展示长周期历史线图
- 不把“今天新增变化数”作为项目主指标

### D. 重点对象区

展示最值得关注的 own / competitor ASIN：

- 价格差距明显的 ASIN
- 评论数增长明显的 ASIN
- 评分异常的 ASIN
- BSR 表现突出的 ASIN

设计要求：

- 更像“建议关注对象”，不是纯表格
- 每张对象卡片显示 ASIN、标题、own / competitor 标签、当前核心指标、同步状态

## 5.4 Trends / 趋势

页面定位：

- 查看单个 ASIN 的历史走势
- 回答“这个 ASIN 最近 7 天 / 30 天和它过去相比怎么样”
- 这是纵向对比页面，不是 own vs competitor 的主页面

页面结构：

### A. ASIN 选择与页头

内容：

- 返回项目 Overview
- 当前 ASIN
- own / competitor 标签
- marketplace
- 标题或简短描述
- 时间范围切换：`7 天` / `30 天`

### B. 当前状态与历史变化

展示：

- 当前价格 + 与上周期对比
- 当前评分 + 与上周期对比
- 当前评论数 + 与上周期对比
- 当前 BSR + 与上周期对比

设计要求：

- 强调“相对过去的变化”
- 可以显示 `较 7 天前 +12%`、`较 30 天前下降 0.2`
- 不需要默认同时画 own 与 competitor 两组线

### C. 趋势图区

图表 1：`价格趋势`

- 单个 ASIN 的价格历史线
- 可标出最近一次变化点

图表 2：`评论数趋势`

- 单个 ASIN 的评论数历史线
- 强调增长速度

图表 3：`评分趋势`

- 单个 ASIN 的评分历史线
- 标出明显下滑或恢复

图表 4：`BSR 趋势`

- 单个 ASIN 的 BSR 历史线
- 注意 BSR 数值越低通常越好，视觉文案要避免误导

设计要求：

- 图表区域要大
- 每张图都是独立卡片
- 默认展示近 30 天，也支持切换到 7 天
- 页面主色可以根据 ASIN 类型使用 amber 或 cyan

## 5.5 ASINs / 监控对象

页面定位：

- 管理项目下的 own ASIN 和 competitor ASIN
- 支持增加、删除、查看同步状态

页面结构：

### A. 顶部操作区

内容：

- 页面标题：`监控对象`
- 简短说明：管理 own 与 competitor ASIN
- 主按钮：`添加 ASIN`

### B. own ASIN 分组

每个对象展示：

- ASIN
- 标题
- marketplace
- 品牌
- 当前价格
- 当前评分
- 当前评论数
- 最近同步状态
- 操作：`查看趋势`、`删除`

### C. competitor ASIN 分组

结构与 own ASIN 一致，但视觉使用 cyan 作为识别色。

设计要求：

- own 和 competitor 分组要清楚
- 删除操作要低调但可发现
- 添加 ASIN 表单保持简单：ASIN、类型、marketplace
- 不在这里做复杂阈值配置

## 5.6 Digest / 日报

页面定位：

- 日报发送记录和日报内容存档
- 用户可以回看每次日报内容和渠道投递结果

页面结构：

### A. 日报记录列表

每条记录展示：

- 日期
- 日报标题
- 发送状态：`已发送` / `部分失败` / `发送失败` / `未生成`
- 投递渠道：飞书、企业微信、邮件
- 生成时间

### B. 日报内容预览

展示选中日报的内容：

- 今日摘要
- own vs competitor 重点对比
- 值得关注的 ASIN
- 风险或异常
- 投递结果

### C. 投递状态详情

展示：

- 飞书投递状态
- 企业微信投递状态
- 邮件投递状态
- 失败原因简述

设计要求：

- 这个页面像“日报档案馆”
- 内容阅读体验要比表格更重要
- 失败状态用 rose，但不要让页面变成系统错误页

## 5.7 Settings / 通知设置

页面定位：

- 配置项目的通知渠道和日报发送策略
- 不配置复杂监控阈值

页面结构：

### A. 日报设置

内容：

- 是否启用每日摘要
- 日报发送时间
- 默认接收渠道

### B. 飞书配置

内容：

- 是否启用
- webhook 地址
- 测试发送按钮
- 最近一次发送状态

### C. 企业微信配置

内容：

- 是否启用
- webhook 地址
- 测试发送按钮
- 最近一次发送状态

### D. 邮件配置

内容：

- 是否启用
- 收件人列表
- 测试发送按钮
- 最近一次发送状态

设计原则：

- 设置区保持简单
- 强调“外部渠道只发日报”
- 不出现价格阈值、评分阈值、复杂规则配置

## 6. 导航结构

建议导航：

- `/projects`
- `/projects/[projectId]`
- `/projects/[projectId]/trends`
- `/projects/[projectId]/asins`
- `/projects/[projectId]/digest`
- `/projects/[projectId]/settings`

后续可扩展：

- `/projects/[projectId]/asins/[asinId]`
- `/projects/[projectId]/digests/[date]`
- `/admin/ops`

## 7. 关键组件清单

需要统一设计的组件：

- Project card
- Project workspace shell
- Sidebar navigation
- Daily summary hero
- Own vs competitor comparison card
- Comparison chart
- ASIN selector
- ASIN trend chart
- ASIN management row / card
- Digest record item
- Digest content panel
- Delivery status item
- Notification settings card
- Status badge
- Empty state

组件原则：

- 同一种卡片只变数据，不频繁换样式
- own / competitor 的色彩映射必须保持一致
- 横向对比组件服务 Overview
- 纵向趋势组件服务 Trends
- 设置组件保持克制，不要显得像复杂规则引擎

## 8. 数据映射

本设计需要映射到当前数据模型。

### Projects Overview 数据

- `Project`
- `TrackedAsin`
- `DailyDigestRun`
- `MonitoringSubscription`

聚合规则：

- own ASIN 数：当前项目下 type = own 的 `TrackedAsin` 数量
- competitor ASIN 数：当前项目下 type = competitor 的 `TrackedAsin` 数量
- 日报状态：取当日 `DailyDigestRun` 或投递记录状态
- 今日同步状态：取当日项目数据拉取 / subscription 结果状态

### Overview 横向对比数据

- `TrackedAsin`
- `ProductSnapshot`

聚合规则：

- own 平均价格：当日 own ASIN 价格均值
- competitor 平均价格：当日 competitor ASIN 价格均值
- own 平均评分：当日 own ASIN 评分均值
- competitor 平均评分：当日 competitor ASIN 评分均值
- own 评论数：当日 own ASIN 评论数汇总或均值
- competitor 评论数：当日 competitor ASIN 评论数汇总或均值
- own BSR：当日 own ASIN 中最佳 BSR
- competitor BSR：当日 competitor ASIN 中最佳 BSR

### Trends 纵向趋势数据

- `TrackedAsin`
- `ProductSnapshot`

聚合规则：

- 选中单个 ASIN
- 默认展示 30 天，支持切换 7 天
- 价格、评分、评论数、BSR 都按天展示该 ASIN 的历史快照
- 与上周期或起始日做 delta 对比

### ASINs 数据

- `Project`
- `TrackedAsin`
- `ProductSnapshot`

用途：

- 展示 own / competitor 分组
- 添加 ASIN
- 删除 ASIN
- 查看最近同步状态

### Digest 数据

- `DailyDigestRun`
- `NotificationDelivery`

用途：

- 展示日报记录
- 展示日报正文或摘要内容
- 展示飞书 / 企业微信 / 邮件投递状态

### Settings 数据

- `MonitoringSubscription`
- `NotificationDelivery`
- 项目通知配置相关字段

用途：

- 配置日报开关
- 配置飞书、企业微信、邮件渠道
- 展示最近一次测试发送或日报发送状态

## 9. 文案原则

- 不写技术术语给普通用户看
- 不出现 `TaskId`、`SubscriptionCollection` 这类内部概念
- 不把“系统做了什么”放在第一位
- Overview 先说“今天 own 和竞品相比怎么样”
- Trends 先说“这个 ASIN 最近相对过去怎么变”

推荐文案风格：

- `竞品组平均价格低于 own 8.4%`
- `own 评分略高，但评论规模落后`
- `该 ASIN 近 30 天评论数增长 12%`
- `今日日报已发送到飞书和邮件`
- `今日数据已拉取`

避免的文案风格：

- `同步任务执行成功`
- `监控对象数`
- `拉取订阅结果成功`
- `Webhook 调用完成`

这些可以保留在操作按钮、状态详情或系统面板里，但不能占主视觉。

## 10. Stitch 生成建议

如果后续用 Stitch 生成，推荐先做：

1. `Projects Overview`
2. `Project Workspace - Overview`
3. `Project Workspace - Trends`
4. `Project Workspace - ASINs`
5. `Project Workspace - Digest`
6. `Project Workspace - Settings`

推荐的生成提示词方向：

`Design a premium Amazon competitor intelligence product with a Supabase-inspired project structure and a warm dark editorial analytics visual style. The outer Projects Overview should show simple project cards with marketplace, own ASIN count, competitor ASIN count, daily digest status, and today's sync status only. Inside a project, use a simplified left sidebar with Overview, Trends, ASINs, Digest, and Settings. Overview focuses on horizontal own-vs-competitor comparison for price, reviews, rating, and BSR. Trends focuses on one selected ASIN compared against its own 7-day or 30-day historical data. ASINs manages adding and removing monitored ASINs. Digest is an archive of daily digest deliveries and content. Settings configures Feishu, WeCom, Email, and daily digest schedule only. Use graphite backgrounds, amber for own metrics, cyan for competitor metrics, emerald for success, rose for failure, rounded premium cards, high-contrast charts, and concise Chinese UI copy.`

## 11. 第一版落地优先级

优先做：

1. 项目总览项目卡重构
2. 项目工作台 shell 与简化左侧菜单
3. Overview 横向对比页
4. Trends 单 ASIN 纵向趋势页
5. ASINs 监控对象管理页

第二优先级：

6. Digest 日报存档页
7. Settings 通知设置页

后续再做：

8. 单个 ASIN 深度详情页
9. 管理员独立运营页
10. 告警独立页面

## 12. 结论

这套产品的设计核心，不是“让用户配置复杂监控”，而是“让用户每天快速看懂自己的 ASIN 和竞品相比怎么样，并能回看单个 ASIN 的历史走势”。

因此，设计上必须坚持：

- 项目入口简单
- 工作台导航克制
- Overview 做横向对比
- Trends 做纵向趋势
- ASINs 负责监控对象管理
- Digest 负责日报记录和内容存档
- Settings 只负责通知渠道

如果后续 Stitch 认证恢复，这份 spec 可以直接作为生成输入和人工校对基准。
