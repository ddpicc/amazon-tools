# 竞品监控台 PRD

更新时间：2026-06-02

## 产品目标

帮助亚马逊卖家围绕 own ASIN 与 competitor ASIN 建立持续监控项目，并通过每日订阅结果采集形成：

- 历史快照
- 异动告警
- 趋势总览
- 每日摘要
- 飞书 / 企业微信 / 邮件通知

## 核心用户流程

### 1. 创建项目

用户在创建页输入：

- 项目名称
- 站点
- own ASIN
- competitor ASIN

点击创建后，系统同步执行：

1. 批量调用 `ASINSubscription`
2. 对项目内每个 ASIN 调用 `ASINSubscriptionCollection`
3. 保存首批 `ProductSnapshot`
4. 创建本地订阅映射与通知渠道
5. 全部完成后跳转项目 dashboard

用户在创建阶段可以看到明确的进度状态：

- 创建项目
- 批量订阅 ASIN
- 拉取首批数据
- 完成

### 2. 日常查看

用户再次打开项目时：

- 只查看本地数据库中的快照、告警、日报与通知历史
- 不重新订阅
- 不即时调用 Sorftime

### 3. 每日系统任务

每天定时执行：

1. 找到到期项目
2. 对项目内 active ASIN 调用 `ASINSubscriptionCollection`
3. 写入新快照
4. 对比上一条快照生成告警
5. 汇总并发送每日报告

## 页面结构

项目页采用单页 dashboard。

左侧菜单：

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

- 每日采集 job
- 日报记录
- 外部通知投递记录
- 告警抑制记录

### 设置

- 每日报告开关
- 飞书 webhook
- 企业微信 webhook
- 邮件配置
- 删除项目

## 删除项目

删除项目必须先解除 Sorftime 订阅。

执行顺序：

1. 批量调用 `ASINSubscription`，使用 `-` 解除项目内 ASIN
2. 全部成功后删除本地项目及其关联数据

默认规则：

- 任一解除失败，则本地项目不删除

## 明确不做

当前版本不作为主流程提供：

- 关键词监控
- 关键词池维护
- 项目页手动同步
- `ProductRequest` 主流程兜底
- 创建后在项目页继续追加监控对象

## Sorftime 接口约定

### ASINSubscription

批量订阅：

```json
{
  "Asins": "+,B0AAA11111,1|+,B0BBB22222,1"
}
```

批量解除：

```json
{
  "Asins": "-,B0AAA11111,1|-,B0BBB22222,1"
}
```

说明：

- `1` 表示每天更新
- 单次最多 100 个 ASIN

### ASINSubscriptionCollection

按已订阅 ASIN 查询：

```json
{
  "Asins": "B0AAA11111"
}
```

### ASINSubscriptionQuery

仅管理员用于查看外部订阅清单，不参与普通用户项目初始化流程。
