# 监控任务运行手册

更新时间：2026-06-02

## 内部采集 API

用于触发所有到期项目的每日订阅结果采集：

`POST /api/internal/monitoring/run`

可选参数：

- `limit`
  - 示例：`/api/internal/monitoring/run?limit=10`
  - 表示本次最多处理多少个到期项目

## 当前采集语义

当前内部采集任务只做一件事：

- 对项目内已订阅 ASIN 调用 `ASINSubscriptionCollection`

当前调度语义：

- 创建项目时会立即拉取首批快照
- 之后系统只在 `UTC+8 08:00` 之后判定项目是否到期
- 同一天内每个项目最多完成一次项目级拉取

当前不做：

- 项目页手动触发同步
- `ProductRequest` 兜底抓取
- 关键词订阅批量采集

## 鉴权方式

优先使用环境变量：

- `MONITORING_CRON_SECRET`

请求时带任意一种：

```bash
Authorization: Bearer <MONITORING_CRON_SECRET>
```

或：

```bash
x-cron-secret: <MONITORING_CRON_SECRET>
```

如果本地开发环境未设置 `MONITORING_CRON_SECRET`，且 `NODE_ENV != production`，接口允许直接调用。

## 返回结果

返回：

- 扫描项目总数
- 实际处理项目数
- 每个项目是否执行
- 未执行原因

常见原因：

- `no_active_asins`
- `already_running`
- `not_due:x/y`
- `limit_reached`
- `poll_failed`

## 通知重试 API

用于触发所有到期的飞书 / 企业微信 / 邮件投递重试：

`POST /api/internal/notifications/retry`

## 每日摘要发送 API

用于触发项目级每日摘要发送：

`POST /api/internal/digests/run`

当前摘要语义：

- 不是每调用一次都发送全部项目
- 服务端会检查项目是否已经到达自己的日报发送时间
- 同一天内只要还没有 `SUCCESS`，后续 cron 会继续尝试
- 日报正文优先使用 AI 摘要；若模型不可用或失败，会自动回退到规则摘要

## Zeabur 推荐运行节奏

- Sorftime 订阅结果采集：每天 `08:00` 调一次 `POST /api/internal/monitoring/run`
- 每日摘要发送：每 10 分钟调一次 `POST /api/internal/digests/run`
- Webhook 自动重试：每 10 分钟调一次 `POST /api/internal/notifications/retry`

说明：

- `monitoring/run` 是采集任务
- `digests/run` 是日报 due 检查与发送任务
- `notifications/retry` 只负责即时通知失败重试，不负责采集，也不负责 AI 日报生成

## 删除项目约束

删除项目不通过本手册中的 cron 入口执行。

项目删除由业务接口完成，并强制遵循：

1. 先批量解除 Sorftime 订阅
2. 再删除本地项目和历史数据

若解除失败，本地项目必须保留。
