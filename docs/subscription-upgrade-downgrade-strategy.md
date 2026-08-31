# Subscription Upgrade / Downgrade Strategy

## 1. Background

当前产品的套餐差异只体现在资源额度上：

- 项目数上限
- 总活跃 ASIN 数上限

现阶段所有已有功能都可使用，不做功能分层。因此，订阅系统的核心不是功能开关，而是围绕资源额度建立一套稳定、可自动化的升级/降级规则，并为后续接入真实支付（微信、支付宝、Stripe 等）预留清晰的数据模型和 webhook 处理方式。

本文档定义：

1. 用户升级时何时生效
2. 用户降级时何时生效
3. 套餐切换后若资源超额如何处理
4. 支付成功后如何自动更新订阅与权限
5. 用户端和后台如何展示套餐状态与变更结果

---

## 2. Business goals

这套方案的目标是：

- 让用户在升级时立即获得新额度
- 让降级行为对用户公平、对系统简单
- 不自动删除用户已有项目和 ASIN，避免数据风险
- 后续接入支付后做到“支付成功 → 权限自动更新”
- 让后台运营、前台用户、技术实现三方都能理解同一套规则

---

## 3. Recommended business rules

### 3.1 Upgrade

**推荐规则：升级立即生效，按剩余周期补差价，续费日不变。**

#### Example

用户当前：

- 入门版 ¥19 / 月
- 每月 1 号续费

用户在 15 号升级到：

- 基础版 ¥49 / 月

则：

- 15 号起立刻获得基础版权限
- 项目上限、ASIN 上限立刻提升
- 只收本周期剩余时间对应的差价
- 下一个续费日仍然保持在下月 1 号

#### Why

这是最符合 SaaS 用户预期的方式：

- 付费后立即可用
- 不浪费当前周期剩余价值
- 续费日不混乱，财务与用户都更容易理解

---

### 3.2 Downgrade

**推荐规则：降级不立即生效，到当前周期结束后生效。**

#### Example

用户当前在基础版，当前周期结束时间为 8 月 1 日。用户在 7 月 15 日申请降级到入门版：

- 7 月 15 日到 8 月 1 日之间，继续享受基础版权限
- 8 月 1 日开始切换到入门版

#### Why

降级如果立刻生效，会引入：

- 已付费用如何处理
- 当前超额资源如何即时收缩
- 用户体验差，容易引发投诉

因此大多数 SaaS 的标准策略是：

- Upgrade now
- Downgrade at period end

---

### 3.3 Cancellation

**推荐规则：取消订阅在当前周期结束后失效。**

这和降级逻辑一致：

- 当前已付周期继续有效
- 到期后不再续费
- 过期后切换到默认低配套餐或进入受限状态（由具体产品策略决定）

---

## 4. Over-limit handling after plan change

### 4.1 Core rule

**保留已有资源，禁止新增，不自动删除。**

#### Example

基础版允许：

- 5 个项目
- 100 个 ASIN

入门版允许：

- 2 个项目
- 20 个 ASIN

如果用户降级生效时当前已有：

- 4 个项目
- 75 个 ASIN

系统处理方式：

- 不删除已有项目
- 不删除已有 ASIN
- 将用户标记为“超额状态”
- 超额状态下：
  - 不能新建项目
  - 不能新增 ASIN
  - 提示需要手动清理到额度内，或重新升级套餐

### 4.2 Why

不建议自动删资源，风险太高，容易造成不可恢复的数据损失。SaaS 常见做法都是：

- grandfather existing resources
- block further expansion

即：旧资源保留，新扩张受限。

---

## 5. Subscription state machine

建议使用以下订阅状态：

### `TRIALING`

- 试用中
- 可正常使用对应试用额度
- 到期后转正式订阅或结束

### `ACTIVE`

- 已生效
- 当前订阅正常运行中
- 按当前套餐额度使用

### `PAST_DUE`

- 待处理
- 一般表示支付失败、续费异常或待补款
- 可配置短暂宽限期
- 宽限期内建议允许查看，但禁止继续扩张资源

### `SCHEDULED_DOWNGRADE`

- 待降级
- 当前周期仍按原套餐生效
- 到周期结束时切换到目标低套餐

### `CANCELED`

- 已取消
- 当前订阅已经终止
- 具体回落到免费版、只读状态还是默认套餐，由产品策略决定

### `LEGACY`

- 旧版映射状态
- 仅用于兼容当前 `User.plan`
- 当正式 `UserSubscription` 完整启用后可逐步退出

---

## 6. Data model strategy

当前系统已经有：

- `PlanDefinition`
- `UserSubscription`
- `EntitlementOverride`

在此基础上，建议如下扩展：

### 6.1 PlanDefinition

用于描述套餐目录。

建议关键字段：

- `code`
- `displayName`
- `priceCents`
- `currency`
- `interval`
- `maxProjects`
- `maxTrackedAsins`
- `maxOwnAsinsPerProject`
- `maxCompetitorAsinsPerProject`
- `active`

作用：

- 对内是权益配置源
- 对外可映射支付平台 price id

---

### 6.2 UserSubscription

用于表示用户当前订阅与周期状态。

建议关键字段：

- `userId`
- `planId`
- `status`
- `billingInterval`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `updatedAt`

建议额外扩展：

#### Provider fields

为后续接支付使用：

- `provider`
- `providerCustomerId`
- `providerSubscriptionId`
- `providerPriceId`

#### Scheduled change fields

为“降级下周期生效”使用：

- `scheduledPlanId`
- `scheduledChangeAt`

这样可以清楚表达：

- 当前套餐是基础版
- 但已计划在下一个周期切换到入门版

---

### 6.3 SubscriptionChangeLog

建议新增操作日志表。

建议字段：

- `userId`
- `fromPlanId`
- `toPlanId`
- `changeType`：`UPGRADE | DOWNGRADE | CANCEL | RENEW | MANUAL_OVERRIDE`
- `effectiveAt`
- `createdBy`：`system | webhook | admin`
- `note`
- `createdAt`

作用：

- 后台运营审计
- 用户问题排查
- 财务与客服对账

---

## 7. Entitlement resolution rules

系统统一通过 entitlement resolver 计算最终权限。

### 7.1 Inputs

- 当前订阅记录
- 当前套餐定义
- override
- 当前资源使用量

### 7.2 Outputs

- `maxProjects`
- `maxTrackedAsins`
- `maxOwnAsinsPerProject`
- `maxCompetitorAsinsPerProject`
- 是否超额
- 是否允许新增资源
- 当前套餐与状态说明

### 7.3 Priority

建议优先级：

1. `EntitlementOverride`
2. `UserSubscription.plan`
3. 旧版 `User.plan` fallback

---

## 8. Upgrade flow

### 8.1 User flow

1. 用户在 Billing 页面点击升级
2. 系统创建支付订单 / checkout session
3. 用户完成支付
4. 支付平台 webhook 回调
5. 系统更新 `UserSubscription`
6. entitlement 立即刷新
7. 用户端看到项目数 / ASIN 数上限立刻变化

### 8.2 System actions

支付成功后：

- 更新 `UserSubscription.planId = newPlanId`
- 更新 `status = ACTIVE`
- 清除 `scheduledPlanId` / `scheduledChangeAt`
- 更新 `updatedAt`
- 写入 `SubscriptionChangeLog`

---

## 9. Downgrade flow

### 9.1 User flow

1. 用户在 Billing 页面点击降级
2. 系统不立刻切换 entitlement
3. 只记录“计划变更”
4. 到下一个续费时间点执行真正切换
5. entitlement 刷新

### 9.2 System actions

用户点击降级时：

- 当前 `planId` 保持不变
- `status = SCHEDULED_DOWNGRADE`
- `scheduledPlanId = targetPlanId`
- `scheduledChangeAt = currentPeriodEnd`
- 写入 `SubscriptionChangeLog`

到周期结束时：

- `planId = scheduledPlanId`
- `scheduledPlanId = null`
- `scheduledChangeAt = null`
- `status = ACTIVE`（或 `CANCELED`，视具体动作而定）
- 再写入一次 `SubscriptionChangeLog`

---

## 10. Payment integration strategy

后续正式接支付后，建议所有订阅变更都通过 webhook 落地，不让前端直接修改权限。

### 10.1 Payment success

适用场景：

- 新订阅创建成功
- 升级支付成功
- 周期续费成功

动作：

- 更新 `UserSubscription`
- 写入 `SubscriptionChangeLog`
- 触发 entitlement 刷新

### 10.2 Payment failure

动作：

- 将订阅状态改为 `PAST_DUE`
- 启用宽限期策略（如 3~7 天）
- 宽限期内保留已有资源，但禁止新增

### 10.3 Cancel subscription

动作：

- 设置 `cancelAtPeriodEnd = true`
- 当前周期结束前仍正常使用
- 周期结束后再真正切换状态

---

## 11. UI recommendations

### 11.1 Billing page

建议展示：

- 当前套餐
- 状态 badge
- 当前周期结束时间
- 下周期计划（如果有）
- 已用项目数 / 上限
- 已用 ASIN 数 / 上限
- 是否超额
- 升级 / 降级入口

如果当前是 `SCHEDULED_DOWNGRADE`，应明确提示：

- 当前仍按高套餐生效
- 将于某日切换到更低套餐

---

### 11.2 New project page

建议展示：

- 当前套餐
- 已用项目数 / 上限
- 已用 ASIN 数 / 上限
- 本次创建后预计使用量
- 若超额，明确给出去 Billing 升级的 CTA

如果套餐刚更新：

- 明确提示“套餐已更新并立即生效”
- 当前额度已刷新

---

### 11.3 Project settings page

建议展示：

- 当前套餐
- 当前资源使用情况
- 手动刷新规则
- 若刚完成套餐切换，显示“最新套餐权益已刷新”提示

---

### 11.4 Over-limit copy

统一建议：

#### 项目数超额
- 当前已超过套餐项目额度，已有项目会保留，但暂时不能新建项目

#### ASIN 数超额
- 当前已超过套餐 ASIN 额度，已有 ASIN 会保留，但暂时不能新增 ASIN

---

## 12. Product defaults for current stage

结合当前产品阶段，建议你直接采用下面这套默认策略：

### Upgrade
- 立即生效
- 按剩余周期补差价
- 续费日不变

### Downgrade
- 下周期生效

### Cancellation
- 当前周期结束后失效

### Over-limit handling
- 保留已有资源
- 禁止新增资源
- 页面上明确提示需要清理或重新升级

---

## 13. Recommended implementation order

### Phase 1
先完成规则与数据结构：

- `scheduledPlanId`
- `scheduledChangeAt`
- `SubscriptionChangeLog`
- over-limit handling

### Phase 2
接支付 provider：

- checkout / order creation
- webhook
- 自动升级 / 降级 / 续费 / 取消

### Phase 3
补运营能力：

- 后台操作日志
- 支付异常处理
- 宽限期策略
- 对账与客服查询能力

---

## 14. Final recommendation

对于你现在这种“资源型套餐”产品，最稳妥、也最接近行业通用做法的方案是：

### Upgrade
**立即生效 + 按剩余时间补差价**

### Downgrade
**当前周期结束后生效**

### Over-limit
**保留已有资源，禁止新增资源**

这套方案在用户体验、财务可解释性、工程复杂度之间的平衡最好，也适合作为后续接微信 / 支付宝 / Stripe 的统一基础规则。
