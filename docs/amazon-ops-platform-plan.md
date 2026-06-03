# 亚马逊竞品监控平台实现说明

更新时间：2026-06-02

## 当前产品范围

当前系统只聚焦一条主链路：

- 用户创建项目
- 项目初始化时批量订阅 ASIN
- 立即拉取首批订阅数据并落库
- 后续每天定时拉取订阅结果
- 基于快照对比生成告警和日报

当前不再使用以下链路作为主流程：

- `ProductRequest`
- `ASINKeywordRanking`
- 关键词订阅监控
- 项目页手动触发同步

## 创建项目流程

用户在创建页填写：

- 项目名称
- marketplace
- 1~3 个 own ASIN
- 5~20 个 competitor ASIN

点击创建后，后端按固定顺序执行：

1. 创建 `Project`、`TrackedAsin`、`ProjectSettings`
2. 调用 `ASINSubscription` 批量注册项目中的全部 ASIN
3. 为每个 ASIN 建立本地 `MonitoringSubscription`
4. 对每个 ASIN 调用 `ASINSubscriptionCollection`
5. 将返回结果写入首批 `ProductSnapshot`
6. 回写 `TrackedAsin` 的当前标题、品牌、类目、图片、最近同步时间
7. 初始化通知渠道
8. 全部完成后才进入项目 dashboard

如果初始化任一步失败：

- 当前创建请求失败
- 本地半成品项目删除
- 已注册的 Sorftime 订阅会尝试批量解除

## Sorftime 接口约定

### 1. 批量订阅与解除订阅

主接口：`ASINSubscription`

请求体字段：

```json
{
  "Asins": "+,B0AAA11111,1|+,B0BBB22222,1"
}
```

规则：

- `+` 表示新增订阅
- `-` 表示解除订阅
- 第二段是 ASIN
- 第三段固定为 `1`，表示每天更新
- 多个 ASIN 使用 `|` 拼接
- 单次最多 100 个 ASIN

### 2. 拉取订阅结果

主接口：`ASINSubscriptionCollection`

请求体字段：

```json
{
  "Asins": "B0AAA11111"
}
```

说明：

- 按已订阅 ASIN 直接查询
- 当前实现按单个 ASIN 查询并落单条快照
- 不再依赖 taskId 查询

### 3. 管理员订阅总览

主接口：`ASINSubscriptionQuery`

用途：

- 查看 Sorftime 当前站点下的已订阅 ASIN 清单
- 用于管理员排查订阅状态
- 不参与普通用户的项目初始化或日常展示逻辑

## 每日采集流程

每日由内部定时任务触发：

1. 找出到期项目
2. 遍历项目中的 active ASIN
3. 调用 `ASINSubscriptionCollection`
4. 写入新的 `ProductSnapshot`
5. 与上一条快照做差异比较
6. 生成告警
7. 汇总项目日报并发送到启用的渠道

项目页重新打开时：

- 只读取数据库
- 不重新订阅
- 不即时拉取 Sorftime 数据

## Dashboard 结构

项目页采用单页 dashboard，左侧菜单切换页面内区块：

- 总览
- 通知历史
- 设置

### 总览

- own / competitor 数量
- 最近采集时间
- 订阅状态
- ASIN 列表
- 最新告警

### 通知历史

- 每日采集 job 记录
- 日报发送记录
- 外部通知投递记录
- 告警抑制记录

### 设置

- 每日报告开关
- 飞书 webhook
- 企业微信 webhook
- 邮件通知
- 删除项目

## 删除项目流程

删除项目时必须先解除 Sorftime 订阅，再删除本地数据。

后端顺序：

1. 找出项目下所有启用中的 ASIN 订阅
2. 调用 `ASINSubscription`，使用 `-` 批量解除
3. 解除全部成功后删除本地 `Project` 及其级联数据

默认策略：

- 任一解除失败，则删除失败
- 不允许“本地删了、Sorftime 还保留订阅”的成功状态

## 重要实现约束

- `MonitoringSubscription` 当前只承载 ASIN 监控
- `MonitoringSubscription` 不再保留额外的外部任务标识，订阅关系仅通过项目、类型和 ASIN 关联
- 文档、页面和接口说明中不能再出现“项目页手动同步”或 “ProductRequest 兜底主流程” 的描述
