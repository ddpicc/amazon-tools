# Sorftime 亚马逊 API 文档

> 整理自 https://seller.sorftime.com/api  
> 整理日期：2026-05-30  
> 适用平台：亚马逊（支持14大站点）

---

## 通用说明

### 认证方式
所有接口均需在 Header 中传入认证信息：

```
Authorization: BasicAuth {Account-SK}
Content-Type: application/json;charset=UTF-8
```

### 站点参数 `domain`

| 值 | 站点 |
|---|---|
| 1 | us（美国） |
| 2 | gb（英国） |
| 3 | de（德国） |
| 4 | fr（法国） |
| 5 | in（印度） |
| 6 | ca（加拿大） |
| 7 | jp（日本） |
| 8 | es（西班牙） |
| 9 | it（意大利） |
| 10 | mx（墨西哥） |
| 11 | ae（阿联酋） |
| 12 | au（澳大利亚） |
| 13 | br（巴西） |
| 14 | sa（沙特） |

### 通用响应字段（ResponseObject）

| 字段 | 类型 | 说明 |
|---|---|---|
| RequestLeft | Integer | 剩余请求数 |
| RequestConsumed | Integer | 本次请求消耗请求数 |
| Code | Integer | 响应代码 |
| Message | String | 响应信息 |
| Data | Object/Array | 返回数据，各接口不同 |

### CLI 调用方式
```bash
$ sorftime api {接口名} '{Body JSON}' --domain {站点值}
```

---

## 一、类目市场

---

### 1. 获取类目树 `CategoryTree`

**描述：** 获取亚马逊类目树结构。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/CategoryTree?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategoryTree '{}' --domain 1
```

**Body 参数：** 无必填参数

**Response Data：** `Array<CategoryTreeObject>`

每个节点包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| Id | Integer | 内部ID |
| ParentId | Integer | 父节点内部ID |
| NodeId | String | 亚马逊类目节点ID（用于其他接口查询） |
| Name | String | 类目英文名称 |
| CNName | String | 类目中文名称 |
| URL | String | 亚马逊类目页面URL |

---

### 2. 查询类目 Best Seller Top100 产品 `CategoryRequest`

**描述：** 查询类目 Best Seller Top100 产品。

- 实时类目数据支持14大站点
- 历史回看支持最长2年数据（暂不支持回看的站点：5:in | 11:ae | 12:au | 14:sa）
- 注：排除不适合三方卖家的类目，如：app、音像、书籍、音乐、食品、数字游戏等

**组合数据说明：**
- 数据样本：选定时间范围内每天Top100按ParentAsin去重后组合
- 产品销量：取产品在时间范围内的最后一日统计的近30日销量
- 历史回看时request消耗：每3天跨度消耗10（天跨度向上取整）。例：查询3天消耗10，查询4天消耗20

**消耗 Request：** 5（实时）；历史回看每3天跨度消耗10

**POST：** `https://standardapi.sorftime.com/api/CategoryRequest?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategoryRequest '{ "NodeId": "3743561" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 需要查找的NodeId |
| QueryStart | String | 否 | 格式：yyyy-MM-dd，历史组合查询开始时间，最长可查近2年，天跨度有效范围3-40天 |
| QueryDate | String | 否 | 格式：yyyy-MM-dd，历史组合查询结束时间，最近至昨日可查距当前日期2日前，天跨度有效范围3-40天 |
| QueryDays | Integer | 否 | （老版本兼容）从指定queryDate日期向前N天组合Top100产品 |

**Response Data：** `CategoryObject`

#### CategoryObject 结构

`Products: Array` — 产品列表，每个元素字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| Title | String | 产品名称 |
| Photo | Array | 产品主图URL列表 |
| EBCPhoto | Array | A+页面中的图片 |
| StoreName | String | 店铺名称 |
| ListingSalesVolumeOfDaily | Integer | listing日销量（不区分子体）。-1表示无法预估 |
| ListingSalesOfDaily | Integer | listing日销售额。-1表示无法预估。单位：当地货币最小单位（如美国站单位为美分），例：1999 = $19.99 |
| ListingSalesVolumeOfMonth | Integer | listing月销量（近30日，不区分子体）。**评估产品销量建议使用此值**。-1表示无法预估 |
| ListingSalesOfMonth | Integer | listing预估月销售额。-1表示无法预估。单位：最小货币单位，例：1999 = $19.99 |
| ASIN | String | 产品ASIN |
| ParentAsin | String | 父ASIN。有子体时为父级ASIN，无子体时为null |
| Price | Integer | ASIN销售价（未扣除coupon）。单位：最小货币单位 |
| ListPrice | Integer | ASIN原价（划线价）。单位：最小货币单位 |
| ProductType | String | 产品所属分类 |
| Coupon | Integer | coupon政策。大于0时为抵扣金额（最小货币单位）；小于0时为折扣百分比，如-10表示10%折扣 |
| SalesPrice | Integer | 实际销售价（扣除coupon后）。单位：最小货币单位 |
| Brand | String | 产品品牌 |
| BuyboxSeller | String | 获得黄金购物车（buybox）的卖家名称 |
| BuyboxSellerId | String | 获得buybox的卖家Id |
| BuyboxSellerAddress | String | buybox卖家国籍/地区。亚马逊自营时为null。格式：国家二字码，如CN/US/GB |
| IsFBA | Boolean | buybox卖家物流方式是否为FBA |
| FbaFee | Integer | FBA物流时的FBA费用。单位：最小货币单位 |
| FbaDetetail | Array | FBA费用组成明细。格式如：["475","1-9:5","10-12:15"]，第一个为配送费，后续为月份:仓储费。-1表示不计算 |
| ShipCost | Integer | FBM时的配送费（无配送费显示时为0）。单位：最小货币单位 |
| PlatformFee | Integer | 平台佣金。单位：最小货币单位 |
| Profit | Integer | 产品毛利（实际价格 - FBA费用 - 平台佣金，非FBA时FBA费用记0）。单位：最小货币单位 |
| ProfitRate | Number | 毛利率（毛利/实际价格×100），例：25.83 表示25.83% |
| OnlineDate | String | 上架日期，格式：yyyy-MM-dd |
| OnlineDays | Integer | 上架日期距今天数 |
| RatingsCount | Integer | ratings数量 |
| Category | Array | 所属大类，长度为2的字符串数组：["大类名称","大类nodeid"]，如["Clothing, Shoes & Jewelry","fashion"] |
| BsrCategory | Array | 所属细分类目，二维数组：[["类目名称","NodeId","细分类目排名"],...] |
| Rank | Integer | 大类排名，例：1467 |
| Ratings | Number | 评分星级，例：4.8 |
| VariationASINCount | Integer | 子体数量 |
| SellerCount | Integer | 卖家数量 |
| HasVideo | Boolean | 是否有主图视频 |
| APlus | Boolean | 是否有A+页面 |
| HasBrandStore | Boolean | 是否有品牌旗舰店 |
| Size | Array | 外包装尺寸["最长边","第二长边","最短边"]，单位cm，例：["11.10","7.91","2.56"] |
| Weight | Integer | 重量，单位g（1 pound ≈ 453.6g），例：1500 |
| ExtraSavings | Array | 关联促销内容及关联ASIN，如：[{"Asin":"B0BZS461JG","Text":"Save 5% on..."}] |
| BrandPromotion | String | brand promotion优惠内容 |
| DealType | String | 产品促销标签（Deal标签） |

---

### 3. 获取类目产品 `CategoryProducts`

**描述：** 获取类目下的产品列表（非仅限Top100），按月销量倒序。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/CategoryProducts?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategoryProducts '{ "NodeId": "3743561", "Page": 1, "Range": 100 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 需要查找的 NodeId |
| Page | Integer | 否 | 分页查询，每页最多100个产品，默认为1（从1开始，非0） |
| Range | Integer | 否 | 按月销量倒序返回的产品数量范围（不限制为Top100，可返回更多产品） |

**Response Data：** `ProductListObject`

同附录 ProductObject/CategoryObject.Products 通用字段结构。

---

### 4. 按名称搜索类目 `CategorySearchFromName`

**描述：** 通过类目名称关键词搜索相关类目节点，最多返回5个相关类目。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/CategorySearchFromName?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategorySearchFromName '{ "Name": "蓝牙耳机" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Name | String | 是 | 需要搜索的类目名词（支持中英文） |

**Response Data：** `Array`

返回最多5个相关类目，格式：
```json
[
  { "NodeId": "...", "CategoryName": "..." },
  ...
]
```

---

### 5. 查询市场历史趋势 `CategoryTrend`

**描述：** 用于查询该类目市场近2年历史趋势。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/CategoryTrend?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategoryTrend '{ "NodeId": "3743561", "TrendIndex": 0 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 需要查找的NodeId |
| TrendIndex | Integer | 是 | 所需要查询的历史趋势类型（见下方枚举值） |

**TrendIndex 枚举值：**

| 值 | 趋势类型 |
|---|---|
| 0 | 销量趋势 |
| 1 | 品牌数量趋势 |
| 2 | 卖家数量趋势 |
| 3 | 平均售价趋势 |
| 4 | 平均评价数趋势 |
| 5 | 平均星级趋势 |
| 6 | 1个月新品占比趋势 |
| 7 | 3个月新品占比趋势 |
| 8 | 6个月新品占比趋势 |
| 9 | 亚马逊自营占比趋势 |
| 10 | FBM产品数占比趋势 |
| 11 | A+产品数占比趋势 |
| 12 | 平均单次产品利润趋势 |
| 13 | 平均跟卖数量趋势 |
| 14 | top100产品占有率趋势 |
| 15 | 平均大类排名趋势 |
| 16 | 1个月新品平均星级趋势 |
| 17 | 3个月新品平均星级趋势 |
| 18 | 6个月新品平均星级趋势 |
| 19 | 1个月新品平均评价数趋势 |
| 20 | 3个月新品平均评价数趋势 |
| 21 | 6个月新品平均评价数趋势 |
| 22 | 1个月新品最高评价数趋势 |
| 23 | 3个月新品最高评价数趋势 |
| 24 | 6个月新品最高评价数趋势 |
| 25 | 1个月新品最低评价数趋势 |
| 26 | 3个月新品最低评价数趋势 |
| 27 | 6个月新品最低评价数趋势 |
| 28 | 前3 Listing垄断系数趋势 |
| 29 | 前5 Listing垄断系数趋势 |
| 30 | 前10 Listing垄断系数趋势 |
| 31 | 前20 Listing垄断系数趋势 |
| 32 | 前3品牌垄断系数趋势 |
| 33 | 前5品牌垄断系数趋势 |
| 34 | 前10品牌垄断系数趋势 |
| 35 | 前20品牌垄断系数趋势 |
| 36 | 前3卖家垄断系数趋势 |
| 37 | 前5卖家垄断系数趋势 |
| 38 | 前10卖家垄断系数趋势 |
| 39 | 前20卖家垄断系数趋势 |

**Response Data：** `Array`

最长返回近2年 Top100 类目市场趋势。

- 货币趋势时，值的单位为当地货币最小单位（例如在美国站：15.99美元，返回1599）
- 百分比趋势时，单位为百分比（例如：50%，返回50）
- 格式：`[202010, 1000, 202011, 1010, 202012, 1050, ...]`
- 每个数组：下标 % 2 = 0 为月份（如202010），下标 % 2 = 1 为对应数据值

---

## 二、产品

---

### 6. 产品详情（含产品趋势） `ProductRequest`

**描述：** 产品（Listing）详情查询。

- 支持多 ASIN 批量查询（最多10个）
- 计算 request 消耗时，按实际调用的 ASIN 数量扣费（2个 ASIN 按2倍，3个按3倍，以此类推）
- 注：当 ASIN 不存在或链接变狗时不会返回数据，但 request 仍会消耗

**消耗 Request：** 1（单个 ASIN，不含历史趋势或趋势 ≤15 天）；趋势 >15 天消耗 2；多 ASIN 按倍数扣费

**POST：** `https://standardapi.sorftime.com/api/ProductRequest?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductRequest '{ "ASIN": "B0CVM8TXHP", "Trend": 1, "QueryTrendStartDt": "", "QueryTrendEndDt": "" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 需要查询的ASIN。支持多ASIN查询（最多10个），多个ASIN按数量倍数扣费 |
| Trend | Integer | 否 | 结果是否包含趋势数据（1：包含，默认；2：不包含）。趋势字段见 ProductObject 中以 trend 结尾的字段 |
| QueryTrendStartDt | String | 否 | 选填，当 Trend=1 时，指定趋势起始日期，格式 yyyy-MM-dd。默认仅返回近15天趋势；超过15天时消耗 request=2 |
| QueryTrendEndDt | String | 否 | 选填，当 QueryTrendStartDt 有值时有效，指定趋势截止日期，格式 yyyy-MM-dd。查询天数 ≤15 天消耗 1，>15 天消耗 2 |

**Response Data：** `ProductObject`

字段与附录中的 ProductObject/CategoryObject.Products 通用字段相同，额外包含以 `trend` 结尾的趋势字段，如：

| 字段 | 类型 | 说明 |
|---|---|---|
| PriceTrend | Array | 价格趋势，格式：[日期, 价格, ...]（每组2个元素） |
| RankTrend | Array | BSR 排名趋势 |
| RatingsCountTrend | Array | 评论数趋势 |
| RatingsTrend | Array | 评分趋势 |
| SalesVolumeTrend | Array | 销量趋势 |
| （其他 xxxTrend 字段） | Array | 各类历史趋势数据，格式统一为 [日期, 值, ...] |

---

### 7. 产品搜索 `ProductSearch`

**描述：** 多维度查产品。支持按品牌、卖家、关键词、类目、价格、月销量、上架时间、星级、评论数、排名、子体数等多维度筛选。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/ProductSearch?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductSearch '{ "Page": 1, "Brand": "anker", "PeakSellingSeason":"2,3,4,5,6", "PriceRangeMin":20, "MonthSaleVolumeRangeMin":10, "StarRangeMax": 4.5 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| QueryMonth | String | 否 | 回看历史月份产品数据，最长支持2024年1月起最多2年内数据。格式：yyyy-MM，不指定表示查实时数据，小于当月月份时为回看。AU BR IN暂不支持回看；US GB DE支持"不限"模式回看，其余站点支持Top100产品回看 |
| Page | Integer | 否 | 分页查询，每页最多100个产品，默认为1（从1开始，非0） |
| ASIN | String | 否 | 基于ASIN查询同类产品（注意：并非只查这个ASIN，查单个ASIN请用ProductRequest接口）。示例：B0CVM8TXHP |
| NodeId | String | 否 | 基于类目查询（不限为细分类目）。示例：3743561 |
| Brand | String | 否 | 查询品牌热销产品。示例：Anker |
| SellerName | String | 否 | 基于卖家名称查询热销产品。示例：AnkerDirect |
| SellerId | String | 否 | 基于卖家SellerId查询热销产品。示例：A294P4X9EWVXLJ |
| Keyword | String | 否 | 基于ABA关键词查热销产品（暂仅支持ABA关键词）。示例：Power Bank |
| AttributeName | String | 否 | 基于产品标题或产品属性包含词查产品（匹配标题/产品属性中包含特定词的产品）。示例：10000mAh |
| PeakSellingSeason | String | 否 | 限定查询季节性产品，仅返回所查询月份的季节性产品。多月份用逗号分隔。示例：2,3,4 |
| ShippingType | String | 否 | 限定发货方式查产品。示例：FBA |
| PriceRangeMin | Number | 否 | 限定销售价最小值（val >= 设定值）。示例：20.00 |
| PriceRangeMax | Number | 否 | 限定销售价最大值（val <= 设定值）。示例：50.00 |
| MonthSaleVolumeRangeMin | Integer | 否 | 限定月销量最小值（val >= 设定值）。示例：500 |
| MonthSaleVolumeRangeMax | Integer | 否 | 限定月销量最大值（val <= 设定值）。示例：1000 |
| OnlineDateRangeMin | String | 否 | 限定上架时间起始时间，格式：yyyy-MM-dd。示例：2025-01-01 |
| OnlineDateRangeMax | String | 否 | 限定上架时间截止时间，格式：yyyy-MM-dd。示例：2026-01-01 |
| StarRangeMin | Number | 否 | 限定星级最小值。示例：4.0 |
| StarRangeMax | Number | 否 | 限定星级最大值。示例：4.8 |
| CommentCountRangeMin | Integer | 否 | 限定评论数量最小值。示例：50 |
| CommentCountRangeMax | Integer | 否 | 限定评论数量最大值。示例：500 |
| SubCategoryRankRangeMin | Integer | 否 | 限定小类排名最小值（第1名值为1）。示例：1 |
| SubCategoryRankRangeMax | Integer | 否 | 限定小类排名最大值（第100名值为100）。示例：100 |
| VariationCountRangeMin | Integer | 否 | 限定子体数最小值。示例：1 |
| VariationCountRangeMax | Integer | 否 | 限定子体数最大值。示例：10 |
| CategoryRankRangeMin | Integer | 否 | 限定大类排名最小值（第1名值为1）。示例：1 |
| CategoryRankRangeMax | Integer | 否 | 限定大类排名最大值（第100名值为100）。示例：100 |

**Response Data：** `ProductListObject`

同 CategoryObject.Products 通用字段结构（见附录）。

---

### 8. 按名称搜索产品 `ProductSearchFromName`

**描述：** 通过产品名称关键词搜索产品。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/ProductSearchFromName?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductSearchFromName '{ "Name": "anker power bank" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Name | String | 是 | 产品名称关键词（支持中英文） |

**Response Data：** `ProductSummeryObject`（注意原文拼写）

返回匹配的产品摘要列表，包含 ASIN、标题、图片、品牌、价格、评分、评论数等基础字段。

---

### 9. 产品官方公布子体销量 `AsinSalesVolume`

**描述：** 查询产品官方公布的子体销量历史数据。

- 以下站点最早数据自 **2023-07** 开始：13:br | 12:au | 10:mx | 8:es | 7:jp | 6:ca | 3:de | 2:uk | 1:us
- 以下站点最早数据自 **2023-08** 开始：11:ae | 9:it | 5:in | 4:fr
- 以下站点最早数据自 **2023-10** 开始：14:sa

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/AsinSalesVolume?domain=1`

**CLI 示例：**
```bash
$ sorftime api AsinSalesVolume '{ "ASIN": "B0CVM8TXHP", "Page":1, "QueryDate": "2024-11-01", "QueryEndDate": "2024-12-01" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 需要查询的ASIN |
| Page | Integer | 否 | 分页查询，默认从 1 开始，每页最多返回100条数据 |
| QueryDate | String | 否 | 查询开始时间，格式：yyyy-MM-dd，最早支持2023年09月01日。默认（不传或无效时）返回近30日数据 |
| QueryEndDate | String | 否 | 查询结束时间，格式：yyyy-MM-dd。默认（不传或无效时）返回截止当前时间数据 |

**Response Data：** `Two-Dimensional Array`

每条记录格式：`[记录日期, 销量记录, 类型]`

- 类型 1：**周销量**
- 类型 2：**月销量**

示例：`[["2024-11-01", 1200, 2], ["2024-10-25", 280, 1], ...]`

---

### 10. 产品子体变化历史数据查询 `ProductVariationHistory`

**描述：** 查询产品子体（变体）的历史变化记录。可用于监控竞品是否新增或删除变体。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/ProductVariationHistory?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductVariationHistory '{ "ASIN": "B0CVM8TXHP" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 父ASIN 或 子ASIN |

**Response Data：** `Two-Dimensional Array`

每条记录格式：`[记录子体数据时间, 父级ASIN, 子体ASIN1, 子体ASIN2, ...]`

- 每个数组第一个元素为记录时间，第二个为父级ASIN，后续均为当时的子体ASIN列表
- 通过对比相邻两条记录，可以判断哪些子体是新增的、哪些是被删除的

示例：
```json
[
  ["2024-11-01", "B0PARENT", "B0CHILD1", "B0CHILD2"],
  ["2024-11-08", "B0PARENT", "B0CHILD1", "B0CHILD2", "B0CHILD3"]
]
```
> 上例说明：11月8日新增了子体 B0CHILD3

---

### 11. 产品实时数据查询 `ProductRealtimeRequest`

**描述：** 查询产品（Listing）实时数据。

- 如果产品在设定时间内未更新过，则实时抓取一次产品信息，并消耗 **1积分**（日本站消耗2积分）
- 如果产品已在设定时间内更新过，则直接返回产品数据，消耗 **0积分**
- 抓取成功后，通过 `ProductRequest` 接口查询该 ASIN 的详情数据
- 可通过 `ProductRealtimeRequestStatusQuery` 接口检查完成状态

**消耗 Request：** 0（产品已更新时）或 1（需要实时抓取时，日本站为2）

**POST：** `https://standardapi.sorftime.com/api/ProductRealtimeRequest?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductRealtimeRequest '{ "ASIN": "B0CVM8TXHP", "Update": 24 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 需要查询的ASIN |
| Update | Integer | 否 | 在设定时间内未更新则立即更新，否则直接返回产品。单位：小时。默认24，有效值范围 1-120。例如：48，表示在查询时间的48小时内，如果产品未更新，则立即更新 |

**Response Data：** `Object`（`ProductObject` 结构）

同附录 ProductObject 通用字段，返回产品最新详情数据。

---

### 12. 产品实时数据查询状态查询 `ProductRealtimeRequestStatusQuery`

**描述：** 查询产品实时采集任务的状态。搭配 `ProductRealtimeRequest` 使用，采集完成后再通过 `ProductRequest` 拉取详情。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductRealtimeRequestStatusQuery?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductRealtimeRequestStatusQuery '{ "ASINs": ["B0CVM8TXHP", "B0D3DL6PXQ"] }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASINs | Array | 是 | 需要查询状态的 ASIN 列表（字符串数组） |

**Response Data：** `Array`

格式：`["<产品ASIN>:<状态>:<完成时间>", "<产品ASIN>:<状态>:<完成时间>", ...]`

**状态说明：**

| 状态值 | 含义 |
|---|---|
| 0 | 查询中（采集进行中） |
| 1 | 完成 |
| 3 | 采集失败 |
| 4 | 积分不够 |
| 5 | ASIN不存在 |

- **完成时间**：状态为成功（1）时显示采集完成时间，其他状态显示 `--`

示例：`["B0CVM8TXHP:1:2024-11-01 14:30:00", "B0D3DL6PXQ:0:--"]`

---

### 13. 实时采集产品评论 `ProductReviewsCollection`

**描述：** 发起产品评论实时采集任务。采集成功后，通过 `ProductReviewsQuery` 拉取评论数据。

- 相同产品采集成功后，**2小时内不能重复采集**
- 实际采集完成时间：**最快2小时，最长7日**内完成
- ⚠️ 每成功采集**10条评论消耗2积分**
- 当 `Star` 参数为 `1,2,3,4,5` 且 `Page=10` 时，将分别采集1-5星评论，每页成功采集10条（无论产品是否有足够评论，系统均会执行采集任务），则会扣费

**消耗 Request：** 按采集评论数量扣费（每成功采集10条 = 2积分）

**POST：** `https://standardapi.sorftime.com/api/ProductReviewsCollection?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductReviewsCollection '{ "ASIN": "B0CVM8TXHP", "Page": 1, "CollectType": 0, "Star": "1,2,3,4,5" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |
| Page | Integer | 否 | 采集页数（每页约10条评论）。不传时默认采集第1页 |
| CollectType | Integer | 否 | 采集方式。`0`：top reviews模式（默认）；`1`：most recent模式 |
| Star | String | 否 | 采集评论时按星级筛选。不传时表示不使用星级筛选方式采集评论。需要按星级筛选时传入星级，支持多筛选（使用逗号','分割）：`1`筛选1星，`2`筛选2星，`3`筛选3星，`4`筛选4星，`5`筛选5星，`10`消极评论（1-3星），`11`积极评论（4-5星）。例如：`1,2,3,4,5` 表示1-5星分别独立采集页数 |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| Data | String | 任务ID（用于 `ProductReviewsCollectionStatusQuery` 查询状态） |

---

### 14. 评论实时查询任务状态查询 `ProductReviewsCollectionStatusQuery`

**描述：** 查询评论采集任务的状态。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductReviewsCollectionStatusQuery?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductReviewsCollectionStatusQuery '{ "QueryDate": "2024-11-01" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| QueryDate | String | 否 | 基于创建采集任务的日期查询，返回该日期全部任务。格式：yyyy-MM-dd |

**Response Data：** `Array`

格式：`["<ASIN>:<状态>:<完成时间>", ...]`

状态与 `ProductRealtimeRequestStatusQuery` 相同：0=查询中，1=完成，3=采集失败，4=积分不够，5=ASIN不存在

---

### 15. 产品评论查询 `ProductReviewsQuery`

**描述：** 拉取已采集的产品评论数据。需要先通过 `ProductReviewsCollection` 触发采集后再使用本接口。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/ProductReviewsQuery?domain=1`

**CLI 示例：**
```bash
$ sorftime api ProductReviewsQuery '{ "ASIN": "B0CVM8TXHP", "Page": 1, "Star": 1 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |
| Page | Integer | 否 | 分页查询，每页最多100条，默认从1开始 |
| Star | Integer | 否 | 按星级筛选评论（1-5），不传则返回全部星级 |

**Response Data：** `Array<ReviewObject>`

每条评论包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| ReviewId | String | 评论唯一ID |
| Title | String | 评论标题 |
| Content | String | 评论正文内容 |
| Star | Integer | 星级（1-5） |
| IsVerified | Boolean | 是否为购买验证评论（Verified Purchase） |
| ReviewDate | String | 评论日期（格式：yyyy-MM-dd） |
| ReviewerName | String | 评论者昵称 |
| HelpfulCount | Integer | 有帮助点赞数 |
| ImageUrls | Array | 评论图片URL列表 |
| CollectedAt | String | 采集时间 |

---

### 16. 图搜相似产品 `SimilarProductRealtimeRequest`

**描述：** 通过产品图片实时搜索亚马逊平台上相似产品。

- 建议搜索的产品在图片中比例大于80%，且背景尽量干净
- 实时抓取预计耗时 **5分钟**，抓取成功后通过 `SimilarProductRealtimeRequestCollection` 接口查询结果
- 预计返回 **20+** 个相似产品

**消耗 Request：** 5（日本站消耗6积分）

**POST：** `https://standardapi.sorftime.com/api/SimilarProductRealtimeRequest?domain=1`

**CLI 示例：**
```bash
$ sorftime api SimilarProductRealtimeRequest '{ "Image": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..." }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Image | String | 是 | 图片 Base64 编码字符串（格式：`data:image/jpeg;base64,/9j/...`） |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| Data | String | 查询任务ID（TaskId）。TaskId > 0 表示任务创建成功 |

---

### 17. 图搜相似产品任务状态查询 `SimilarProductRealtimeRequestStatusQuery`

**描述：** 查询图搜任务的状态。采集完成后再调用 `SimilarProductRealtimeRequestCollection` 获取结果。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/SimilarProductRealtimeRequestStatusQuery?domain=1`

**CLI 示例：**
```bash
$ sorftime api SimilarProductRealtimeRequestStatusQuery '{ "Update": 48 }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Update | Integer | 否 | 数据有效范围 1-240；检查在距当前时间 1-240 小时内的图搜相似产品采集任务状态。例：48，表示检查在距当前时间48小时内的任务状态 |

**Response Data：** `Array`

JSON Array 格式，每条记录包含：

| 字段 | 说明 |
|---|---|
| taskId | `SimilarProductRealtimeRequest` 接口返回的任务Id |
| status | 任务状态：`0`=采集完成；`4`=积分余额不足；`11`=没有采集任务；`97`=ASIN不存在；`98`=采集失败；`99`=采集中 |

示例：
```json
[
  { "taskId": 123456, "status": 0 },
  { "taskId": 123457, "status": 99 }
]
```

---

### 18. 图搜相似产品结果查询 `SimilarProductRealtimeRequestCollection`

**描述：** 获取图搜相似产品的结果。需要任务状态为完成后调用。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/SimilarProductRealtimeRequestCollection?domain=1`

**CLI 示例：**
```bash
$ sorftime api SimilarProductRealtimeRequestCollection '{ "TaskId": "123456" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 图搜任务ID |

**Response Data：** `Array<ProductObject>`

相似产品列表，字段同附录 ProductObject 通用结构，预计返回20+个相似产品。

---

## 三、关键词

---

### 19. 关键词查询 `KeywordQuery`

**描述：** 查询关键词列表数据（搜索量、CPC、趋势等摘要信息）。支持分页，每页最小20条，最大200条。

**消耗 Request：** 待补充（需购买Request次数后调用）

**POST：** `https://standardapi.sorftime.com/api/KeywordQuery?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| PageIndex | Integer | 否 | 返回查询结果页码索引，默认为第1页 |
| PageSize | Integer | 否 | 每页多少条数据，最小20，默认20，最大200 |

**Response Data：** `Object`（`KeywordSummeryObject`，注意原文拼写）

返回关键词摘要列表，包含关键词、搜索量、CPC等字段。

---

### 20. 关键词（近15日）搜索结果产品 `KeywordSearchResults`

**描述：** 查询某关键词近15日搜索结果中的产品列表（含自然排名和广告排名）。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/KeywordSearchResults?domain=1`

**CLI 示例：**
```bash
$ sorftime api KeywordSearchResults '{ "Keyword": "power bank" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keyword | String | 是 | 关键词 |

**Response Data：** `ProductListObject`

产品列表，字段同附录 ProductObject 通用结构。

---

### 21. 关键词详情（含搜索量、CPC趋势）`KeywordRequest`

**描述：** 关键词详情查询，返回关键词搜索量、CPC 及历史趋势数据。

- 各站点支持词量：US=200万，GB/DE=30万，IT/FR/JP=15万，ES/CA/MX=10万，AU=5万，其他站点为ABA公布全部词

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/KeywordRequest?domain=1`

**CLI 示例：**
```bash
$ sorftime api KeywordRequest '{ "Keyword": "power bank" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keyword | String | 是 | 查询的关键词 |

**Response Data：** `Object`（`KeywordObject`）

| 字段 | 类型 | 说明 |
|---|---|---|
| Keyword | String | 关键词 |
| SearchVolume | Integer | 月均搜索量 |
| CPC | Integer | 点击单价（最小货币单位） |
| SearchVolumeTrend | Array | 搜索量历史趋势，格式：[月份, 数值, ...]（如 202010=2020年10月） |
| CPCTrend | Array | CPC历史趋势，同上格式 |
| ProductCount | Integer | 搜索结果产品总数 |
| （其他字段） | — | 视API版本而定 |

---

### 22. 关键词搜索结果产品趋势 `KeywordSearchResultTrend`

**描述：** 关键词搜索结果前3页产品统计数据趋势。各站点支持词量：US=200万，GB/DE=30万，IT/FR/JP=15万，ES/CA/MX=10万，AU=5万，其他站点为ABA公布全部词。

**消耗 Request：** 10

**POST：** `https://standardapi.sorftime.com/api/KeywordSearchResultTrend?domain=1`

**CLI 示例：**
```bash
$ sorftime api KeywordSearchResultTrend '{ "Keyword": "power bank", "QueryStart": "2024-01", "QueryEnd": "2024-12" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keyword | String | 是 | 关键词 |
| QueryStart | String | 否 | 趋势数据查询起始月份，最早支持2024年1月起数据；FR、IT 两站支持2025年1月起数据。选填，数据格式：yyyy-MM，默认：2024-01 |
| QueryEnd | String | 否 | 趋势数据查询截止月份。选填，数据格式：yyyy-MM |

**Response Data：** `Object`（`KeywordSearchResultItem`）

关键词搜索结果的历史趋势数据，包含每月搜索量、产品排名变化等时间序列信息。

---

### 23. 类目反查关键词 `CategoryRequestKeyword`

**描述：** 通过类目NodeId反查该类目下的关键词池（基于ABA数据）。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/CategoryRequestKeyword?domain=1`

**CLI 示例：**
```bash
$ sorftime api CategoryRequestKeyword '{ "NodeId": "3743561" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 类目NodeId |

**Response Data：** `Array<KeywordSummeryObject>`

关键词列表，每条包含关键词、搜索量、CPC、趋势等摘要信息。

---

### 24. ASIN反查关键词 `ASINRequestKeyword`

**描述：** 通过ASIN反查该产品覆盖的关键词及排名（基于ABA数据）。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/ASINRequestKeyword?domain=1`

**CLI 示例：**
```bash
$ sorftime api ASINRequestKeyword '{ "ASIN": "B0CVM8TXHP" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |

**Response Data：** `Array<KeywordSummeryObject>`

关键词列表，含关键词、搜索量、CPC、该ASIN在该词下的排名等。

---

### 25. 关键词历史搜索结果产品 `KeywordProductRanking`

**描述：** 查询某关键词在历史某日的搜索结果产品排名列表。

**消耗 Request：** 5

**POST：** `https://standardapi.sorftime.com/api/KeywordProductRanking?domain=1`

**CLI 示例：**
```bash
$ sorftime api KeywordProductRanking '{ "Keyword": "power bank", "Date": "2024-11-01" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keyword | String | 是 | 关键词 |
| Date | String | 否 | 查询历史日期，格式：yyyy-MM-dd。不传时返回近15日数据 |

**Response Data：** `ProductListObject`

历史某日该关键词搜索结果产品列表，字段同 ProductObject 通用结构。

---

### 26. ASIN在关键词下排名趋势 `ASINKeywordRanking`

**描述：** 查询某ASIN在指定关键词下的历史排名趋势。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/ASINKeywordRanking?domain=1`

**CLI 示例：**
```bash
$ sorftime api ASINKeywordRanking '{ "ASIN": "B0CVM8TXHP", "Keyword": "power bank" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |
| Keyword | String | 是 | 关键词 |

**Response Data：** `Array`

每条记录为 `[日期, 自然排名, 广告排名]`，例如：
```json
[
  ["2024-11-01", 12, 3],
  ["2024-11-02", 10, 2]
]
```
- 自然排名：产品在该关键词下的自然搜索排名（1=第一名）
- 广告排名：产品在该关键词下的广告排名（0=无广告）

---

### 27. 查延伸关键词 `KeywordExtends`

**描述：** 根据种子关键词拓展相关联想词和长尾词。

**消耗 Request：** 1

**POST：** `https://standardapi.sorftime.com/api/KeywordExtends?domain=1`

**CLI 示例：**
```bash
$ sorftime api KeywordExtends '{ "Keyword": "power bank" }' --domain 1
```

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keyword | String | 是 | 种子关键词 |

**Response Data：** `Array<String>`

相关延伸关键词列表（字符串数组），例如：`["portable charger", "power bank 10000mah", "fast charging power bank", ...]`

---

### 28. 添加关键词到我的词库 `FavoriteKeyword`

**描述：** 将关键词添加到账户的自定义词库中，便于后续批量管理和监控。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/FavoriteKeyword?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keywords | Array | 是 | 要添加到词库的关键词列表（字符串数组） |
| GroupName | String | 否 | 词库分组名称，不传则加入默认分组 |

**Response Data：** 添加结果，包含成功/失败的关键词列表

---

### 29. 移动/删除词库关键词 `ChangeFavoriteKeyword`

**描述：** 移动词库关键词到其他分组，或从词库中删除关键词。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ChangeFavoriteKeyword?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keywords | Array | 是 | 要操作的关键词列表 |
| Action | String | 是 | 操作类型：`move`（移动分组）或 `delete`（删除） |
| GroupName | String | 否 | 目标分组名称（Action=move时必填） |

**Response Data：** 操作结果

---

### 30. 查询词库关键词 `GetFavoriteKeyword`

**描述：** 查询账户词库中的关键词列表，支持按分组筛选。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/GetFavoriteKeyword?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| GroupName | String | 否 | 按分组名称筛选，不传则返回全部词库 |
| Page | Integer | 否 | 页码，默认1 |

**Response Data：** `Array<KeywordSummeryObject>`

词库中的关键词列表，含关键词、搜索量、CPC等摘要信息。

---

## 四、数据监控

---

### 31. 关键词监控注册 `KeywordBatchSubscription`

**描述：** 批量注册关键词监控任务，系统定期采集指定关键词的排名数据。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/KeywordBatchSubscription?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Keywords | Array | 是 | 关键词列表 |
| ASINs | Array | 否 | 需要追踪的ASIN列表 |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | 监控任务ID |

---

### 32. 关键词监控任务查询 `KeywordTasks`

**描述：** 查询已注册的关键词监控任务列表。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/KeywordTasks?domain=1`

**Body 参数：** 无

**Response Data：** 任务列表，含TaskId、关键词、状态、创建时间

---

### 33. 修改关键词监控任务 `KeywordBatchTaskUpdate`

**描述：** 更新关键词监控任务配置。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/KeywordBatchTaskUpdate?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |
| Keywords | Array | 否 | 更新的关键词列表 |

---

### 34. 查询关键词监控任务执行批次 `KeywordBatchScheduleList`

**描述：** 查询关键词监控任务的历次执行批次。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/KeywordBatchScheduleList?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |

**Response Data：** 执行批次列表，含BatchId、执行时间、状态

---

### 35. 提取关键词监控产品列表详细数据 `KeywordBatchScheduleDetail`

**描述：** 获取某次执行批次的关键词排名详情结果。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/KeywordBatchScheduleDetail?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |
| BatchId | String | 是 | 执行批次ID |

**Response Data：** 各关键词×ASIN的排名结果，包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| Keyword | String | 关键词 |
| ASIN | String | 产品ASIN |
| Rank | Integer | 自然排名 |
| Page | Integer | 所在页码 |
| SponsoredRank | Integer | 广告排名 |

---

### 36. 榜单监控任务注册 `BestSellerListSubscription`

**描述：** 注册类目Best Seller榜单持续监控任务。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/BestSellerListSubscription?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 类目NodeId |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | 榜单监控任务ID |

---

### 37. 榜单监控任务查询 `BestSellerListTask`

**描述：** 查询已注册的榜单监控任务列表。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/BestSellerListTask?domain=1`

**Body 参数：** 无

**Response Data：** 监控任务列表

---

### 38. 榜单监控任务删除 `BestSellerListDelete`

**描述：** 删除指定榜单监控任务。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/BestSellerListDelete?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 榜单监控任务ID |

---

### 39. 榜单监控数据提取 `BestSellerListDataCollect`

**描述：** 提取榜单监控任务采集到的数据。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/BestSellerListDataCollect?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 榜单监控任务ID |
| Date | String | 否 | 查询日期 |

**Response Data：** 榜单产品列表（CategoryObject.Products结构）

---

### 40. 跟卖&库存监控 `ProductSellerSubscription`

**描述：** 注册产品的跟卖卖家和库存监控任务。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/ProductSellerSubscription?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | 跟卖库存监控任务ID |

---

### 41. 跟卖&库存监控任务查询 `ProductSellerTasks`

**描述：** 查询已注册的跟卖库存监控任务。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductSellerTasks?domain=1`

**Body 参数：** 无

**Response Data：** 监控任务列表，含TaskId、ASIN、状态

---

### 42. 修改跟卖&库存监控任务 `ProductSellerTaskUpdate`

**描述：** 更新跟卖库存监控任务配置（如修改监控频率）。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductSellerTaskUpdate?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |
| Enabled | Boolean | 否 | 是否启用 |

---

### 43. 查询跟卖&库存监控任务执行批次 `ProductSellerTaskScheduleList`

**描述：** 查询跟卖库存监控任务的历次执行记录。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductSellerTaskScheduleList?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |

**Response Data：** 执行批次列表，含BatchId、执行时间

---

### 44. 提取跟卖&库存监控执行结果详细数据 `ProductSellerTaskScheduleDetail`

**描述：** 获取某次跟卖库存监控执行的详细数据。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ProductSellerTaskScheduleDetail?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | 监控任务ID |
| BatchId | String | 是 | 执行批次ID |

**Response Data：** 卖家列表，每个卖家包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| SellerId | String | 卖家ID |
| SellerName | String | 卖家名称 |
| Price | Integer | 卖家当前价格（最小货币单位） |
| Inventory | Integer | 库存数量 |
| IsFBA | Boolean | 是否FBA |
| IsBuybox | Boolean | 是否获得Buybox |
| SellerAddress | String | 卖家国籍/地区（国家二字码） |
| CapturedAt | String | 采集时间 |

---

### 45. ASIN更新订阅 `ASINSubscription`

**描述：** 注册或解除 ASIN 持续更新订阅，系统在设定时间范围内自动更新订阅 ASIN 的产品数据。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/ASINSubscription?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Asins | String | 是 | 批量订阅字符串，格式：`+,ASIN,1|+,ASIN,1` 或 `-,ASIN,1|-,ASIN,1` |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | 订阅任务ID |

说明：

- `+` 表示添加订阅
- `-` 表示删除订阅
- 第二段为 ASIN
- 第三段固定为 `1`，表示每天更新
- 多个 ASIN 使用 `|` 拼接
- 单次最多 100 个 ASIN

---

### 46. ASIN订阅查询 `ASINSubscriptionQuery`

**描述：** 查询ASIN订阅任务列表。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ASINSubscriptionQuery?domain=1`

**Body 参数：** 无

**Response Data：** 订阅任务列表，含TaskId、ASIN、状态

---

### 47. ASIN订阅结果数据查询 `ASINSubscriptionCollection`

**描述：** 获取当前有效订阅 ASIN 的最新产品数据。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/ASINSubscriptionCollection?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Asins | String | 是 | 已订阅 ASIN，多个 ASIN 使用英文逗号分隔，单次最多 100 个 |

**Response Data：** `AsinSummaryObject`

#### AsinSummaryObject 结构

| 字段 | 类型 | 说明 |
|---|---|---|
| Title | String | 产品名称 |
| Photo | Array | 此产品的主图，URL 格式 |
| EBCPhoto | Array | 此产品 A+ 中的图片 |
| StoreName | String | 店铺名称 |
| AsinSalesCount | Integer | 如果有公布 ASIN 月销量，则显示页面公布的月销量 |
| ASIN | String | 此产品的 ASIN |
| ParentAsin | String | 父 ASIN；无子体时为 null |
| Price | Integer | ASIN 原价（划线价），单位为当地货币最小单位 |
| ListPrice | Integer | ASIN 销售价（未扣除 coupon），单位为当地货币最小单位 |
| ListingSaleCount | Integer | Listing 月销量 |
| ListingSaleCountOfDaily | String | 估算 Listing 日销量，Json 格式：`["yyyy-MM-dd","<估算Listing日销量>"]` |
| Coupon | Integer | coupon 政策。大于 0 为具体抵扣金额，小于 0 为折扣百分比 |
| SalesPrice | Integer | 实际销售价（扣除 coupon 后），单位为当地货币最小单位 |
| Brand | String | 当前产品品牌 |
| Description | String | 当前产品的五点描述 |
| BuyboxSeller | String | 当前获得 Buy Box 的卖家 |
| BuyboxSellerId | String | 当前获得 Buy Box 的卖家 ID |
| IsFBA | Boolean | 当前 Buy Box 卖家是否为 FBA |
| ShipCost | Integer | FBM 时配送费，单位为当地货币最小单位 |
| OnlineDate | String | 上架日期，格式：yyyy-MM-dd |
| OnlineDays | Integer | 上架距今天数 |
| RatingsCount | Integer | ratings 数量 |
| Category | Array | 所属大类，格式：`["类目名称","nodeid"]` |
| BsrCategory | Array | 所属细分类目，格式：`[["类目名称","NodeId","细分类目排名"], ...]` |
| Rank | Integer | 大类排名 |
| Ratings | Number | 评分星级 |
| VariationASINCount | Integer | 子体数量 |
| SellerCount | Integer | 卖家数量 |
| HasVideo | Boolean | 是否有主图视频 |
| APlus | Boolean | 是否有 A+ 页面 |
| HasBrandStore | Boolean | 是否有品牌旗舰店 |
| Size | Array | 外包装尺寸，单位 cm |
| Weight | Integer | 重量，单位 g |
| ExtraSavings | Array | 关联促销内容及关联 ASIN |
| Property | Array | 产品属性列表，包含变体可选属性和属性说明 |

#### 当前项目中的落库映射

当前项目把 `ASINSubscriptionCollection` 的返回结果映射到 `ProductSnapshot`，主要规则为：

- `storeName` ← `StoreName`
- `asinSalesCount` ← `AsinSalesCount`
- `parentAsin` ← `ParentAsin`
- `price` ← `SalesPrice`，若为空则回退 `ListPrice`，再回退 `Price`
- `listPrice` ← `Price`，若为空则回退 `ListPrice`
- `listingSaleCount` ← `ListingSaleCount`
- `listingSaleCountOfDaily` ← `ListingSaleCountOfDaily`
- `coupon` ← `Coupon`
- `rating` ← `Ratings`
- `reviewCount` ← `RatingsCount`
- `bsr` ← `Rank`
- `bsrCategory` ← `BsrCategory`
- `variantCount` ← `VariationASINCount`
- `stockStatus` ← `SellerCount > 0 ? "in_stock" : "unknown"`
- `title` ← `Title`
- `photoUrls` ← `Photo`
- `ebcPhotoUrls` ← `EBCPhoto`
- `brand` ← `Brand`
- `description` ← `Description`
- `buyboxSeller` ← `BuyboxSeller`
- `buyboxSellerId` ← `BuyboxSellerId`
- `isFBA` ← `IsFBA`
- `shipCost` ← `ShipCost`
- `onlineDate` ← `OnlineDate`
- `onlineDays` ← `OnlineDays`
- `category` ← `Category[0]`，若无则回退 `ProductType`
- `categoryNodeId` ← `Category[1]`
- `imageUrl` ← `Photo[0]`
- `hasVideo` ← `HasVideo`
- `aPlus` ← `APlus`
- `hasBrandStore` ← `HasBrandStore`
- `packageSize` ← `Size`
- `weightGrams` ← `Weight`
- `extraSavings` ← `ExtraSavings`
- `properties` ← `Property`
- 完整原始返回保存在 `rawPayload`

说明：

- 当前系统已改成**每天同步时都落一条 `ProductSnapshot`**
- 是否生成异常事件，仍然依赖“最新快照 vs 上一条快照”的字段对比
- 当前实现使用 `ASINSubscription` 做批量订阅与解除订阅
- 当前实现调用 `ASINSubscriptionCollection` 时按 `Asins` 查询，不再依赖 taskId

---

## 五、Sorftime Agent（AI 智能分析）

---

### 48. AI解读产品 `ProductAssistant`

**描述：** 对指定产品发起 AI 智能分析，生成产品洞察报告。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/ProductAssistant?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ASIN | String | 是 | 产品ASIN |
| Question | String | 否 | 自定义分析问题 |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | AI分析任务ID |

---

### 49. AI解读类目市场 `CategoryAssistant`

**描述：** 对指定类目发起 AI 智能分析。

**消耗 Request：** 待补充

**POST：** `https://standardapi.sorftime.com/api/CategoryAssistant?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| NodeId | String | 是 | 类目NodeId |
| Question | String | 否 | 自定义分析问题 |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| TaskId | String | AI分析任务ID |

---

### 50. AI执行进度查询（流式） `AIResultQuery`

**描述：** 查询AI分析任务的实时进度（流式返回）。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/AIResultQuery?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | AI分析任务ID |

**Response Data：** 流式文本内容

---

### 51. AI解读分析结果查询 `AIResult`

**描述：** 获取AI分析任务的完整结果。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/AIResult?domain=1`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| TaskId | String | 是 | AI分析任务ID |

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| Status | String | 任务状态（pending/done/failed） |
| Content | String | AI分析报告全文（Markdown格式） |

---

## 六、其他

---

### 52. 本月剩余积分查询 `CoinQuery`

**描述：** 查询当前账户本月剩余积分（Request次数）。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/CoinQuery`

**Body 参数：** 无

**Response Data：**

| 字段 | 类型 | 说明 |
|---|---|---|
| CoinLeft | Integer | 本月剩余积分数量 |
| CoinTotal | Integer | 本月总积分数量 |
| ResetDate | String | 下次重置日期 |

---

### 53. 积分使用明细查询 `CoinStream`

**描述：** 查询积分使用明细记录（按时间流水）。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/CoinStream`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Page | Integer | 否 | 页码 |
| StartDate | String | 否 | 开始日期 |
| EndDate | String | 否 | 结束日期 |

**Response Data：** 积分消耗明细列表，包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| ApiName | String | 调用的接口名称 |
| CoinConsumed | Integer | 消耗积分数 |
| CalledAt | String | 调用时间 |
| Domain | Integer | 站点 |
| RequestParam | String | 请求参数摘要 |

---

### 54. 月度 Request 使用明细查询 `RequestStreamMonth`

**描述：** 查询本月 API Request 使用情况按接口汇总。

**消耗 Request：** 0

**POST：** `https://standardapi.sorftime.com/api/RequestStreamMonth`

**Body 参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Month | String | 否 | 查询月份，格式：yyyy-MM（默认当月） |

**Response Data：** 接口使用量汇总列表，包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| ApiName | String | 接口名称 |
| RequestTotal | Integer | 本月总消耗Request数 |
| CallCount | Integer | 调用次数 |

---

## 附录：接口快速索引

| 编号 | 接口名 | 分类 | 消耗 | 说明 |
|---|---|---|---|---|
| 1 | CategoryTree | 类目市场 | 1 | 获取类目树 |
| 2 | CategoryRequest | 类目市场 | 5+ | 查询类目Best Seller Top100 |
| 3 | CategoryProducts | 类目市场 | - | 获取类目产品列表 |
| 4 | CategorySearchFromName | 类目市场 | - | 按名称搜索类目 |
| 5 | CategoryTrend | 类目市场 | - | 类目市场趋势 |
| 6 | ProductRequest | 产品 | - | 产品详情（含趋势） |
| 7 | ProductSearch | 产品 | - | 产品搜索 |
| 8 | ProductSearchFromName | 产品 | - | 按名称搜产品 |
| 9 | AsinSalesVolume | 产品 | - | 产品官方公布子体销量 |
| 10 | ProductVariationHistory | 产品 | - | 产品子体变化历史 |
| 11 | ProductRealtimeRequest | 产品 | - | 发起产品实时数据采集 |
| 12 | ProductRealtimeRequestStatusQuery | 产品 | 0 | 查询实时采集任务状态 |
| 13 | ProductReviewsCollection | 产品 | - | 发起评论实时采集 |
| 14 | ProductReviewsCollectionStatusQuery | 产品 | 0 | 查询评论采集任务状态 |
| 15 | ProductReviewsQuery | 产品 | - | 查询产品评论 |
| 16 | SimilarProductRealtimeRequest | 产品 | - | 图搜相似产品（发起任务） |
| 17 | SimilarProductRealtimeRequestStatusQuery | 产品 | 0 | 图搜任务状态查询 |
| 18 | SimilarProductRealtimeRequestCollection | 产品 | - | 图搜结果获取 |
| 19 | KeywordQuery | 关键词 | - | 关键词查询（分页，最多200条/页） |
| 20 | KeywordSearchResults | 关键词 | 5 | 关键词近15日搜索结果产品 |
| 21 | KeywordRequest | 关键词 | 1 | 关键词详情（搜索量、CPC趋势） |
| 22 | KeywordSearchResultTrend | 关键词 | 10 | 关键词搜索结果产品趋势 |
| 23 | CategoryRequestKeyword | 关键词 | 5 | 类目反查关键词 |
| 24 | ASINRequestKeyword | 关键词 | 5 | ASIN反查关键词 |
| 25 | KeywordProductRanking | 关键词 | 5 | 关键词历史搜索结果产品 |
| 26 | ASINKeywordRanking | 关键词 | 1 | ASIN在关键词下排名趋势 |
| 27 | KeywordExtends | 关键词 | 1 | 查延伸关键词 |
| 28 | FavoriteKeyword | 关键词 | 0 | 添加关键词到词库 |
| 29 | ChangeFavoriteKeyword | 关键词 | 0 | 移动/删除词库关键词 |
| 30 | GetFavoriteKeyword | 关键词 | 0 | 查询词库关键词 |
| 31 | KeywordBatchSubscription | 数据监控 | - | 关键词监控注册 |
| 32 | KeywordTasks | 数据监控 | 0 | 关键词监控任务查询 |
| 33 | KeywordBatchTaskUpdate | 数据监控 | 0 | 修改关键词监控任务 |
| 34 | KeywordBatchScheduleList | 数据监控 | 0 | 关键词监控执行批次列表 |
| 35 | KeywordBatchScheduleDetail | 数据监控 | 0 | 提取关键词监控详细数据 |
| 36 | BestSellerListSubscription | 数据监控 | - | 榜单监控注册 |
| 37 | BestSellerListTask | 数据监控 | 0 | 榜单监控任务查询 |
| 38 | BestSellerListDelete | 数据监控 | 0 | 榜单监控任务删除 |
| 39 | BestSellerListDataCollect | 数据监控 | - | 榜单监控数据提取 |
| 40 | ProductSellerSubscription | 数据监控 | - | 跟卖&库存监控注册 |
| 41 | ProductSellerTasks | 数据监控 | 0 | 跟卖&库存监控任务查询 |
| 42 | ProductSellerTaskUpdate | 数据监控 | 0 | 修改跟卖&库存监控任务 |
| 43 | ProductSellerTaskScheduleList | 数据监控 | 0 | 跟卖&库存监控执行批次列表 |
| 44 | ProductSellerTaskScheduleDetail | 数据监控 | 0 | 提取跟卖&库存监控详细数据 |
| 45 | ASINSubscription | 数据监控 | - | ASIN更新订阅注册 |
| 46 | ASINSubscriptionQuery | 数据监控 | 0 | ASIN订阅任务查询 |
| 47 | ASINSubscriptionCollection | 数据监控 | 0 | ASIN订阅结果数据查询 |
| 48 | ProductAssistant | Sorftime Agent | 5 | AI解读产品 |
| 49 | CategoryAssistant | Sorftime Agent | 5 | AI解读类目市场 |
| 50 | AIResultQuery | Sorftime Agent | 0 | AI执行进度查询（流式） |
| 51 | AIResult | Sorftime Agent | 0 | AI解读分析结果查询 |
| 52 | CoinQuery | 其他 | 0 | 本月剩余积分查询 |
| 53 | CoinStream | 其他 | 0 | 积分使用明细查询 |
| 54 | RequestStreamMonth | 其他 | 0 | 月度Request使用明细查询 |

---

## 附录：核心数据结构

### ProductObject / CategoryObject.Products 通用字段

> 此结构在 CategoryRequest、ProductRequest、BestSellerListDataCollect、SimilarProductRealtimeRequestCollection 等多个接口中复用。

| 字段 | 类型 | 说明 |
|---|---|---|
| Title | String | 产品名称 |
| Photo | Array | 主图URL列表 |
| EBCPhoto | Array | A+页面图片 |
| StoreName | String | 店铺名称 |
| ASIN | String | 产品ASIN |
| ParentAsin | String | 父ASIN（无子体时为null） |
| Price | Integer | 销售价（未扣coupon，最小货币单位） |
| ListPrice | Integer | 原价/划线价（最小货币单位） |
| SalesPrice | Integer | 实际销售价（扣coupon后，最小货币单位） |
| Coupon | Integer | Coupon：>0为抵扣金额，<0为折扣百分比 |
| Brand | String | 品牌 |
| ProductType | String | 所属分类 |
| ListingSalesVolumeOfDaily | Integer | 日销量（-1=无法预估） |
| ListingSalesOfDaily | Integer | 日销售额（最小货币单位，-1=无法预估） |
| ListingSalesVolumeOfMonth | Integer | **月销量（近30日，推荐用于销量评估，-1=无法预估）** |
| ListingSalesOfMonth | Integer | 月销售额（最小货币单位，-1=无法预估） |
| BuyboxSeller | String | Buybox卖家名称 |
| BuyboxSellerId | String | Buybox卖家ID |
| BuyboxSellerAddress | String | Buybox卖家国籍（国家二字码，亚马逊自营时为null） |
| IsFBA | Boolean | Buybox卖家是否FBA |
| FbaFee | Integer | FBA配送费（最小货币单位） |
| FbaDetetail | Array | FBA费用明细：["配送费","月份:仓储费",...] |
| ShipCost | Integer | FBM配送费（最小货币单位） |
| PlatformFee | Integer | 平台佣金（最小货币单位） |
| Profit | Integer | 毛利（实际价-FBA费-平台佣金，最小货币单位） |
| ProfitRate | Number | 毛利率（毛利/实际价×100，如25.83表示25.83%） |
| OnlineDate | String | 上架日期（yyyy-MM-dd） |
| OnlineDays | Integer | 上架天数 |
| Ratings | Number | 评分星级（如4.8） |
| RatingsCount | Integer | ratings数量 |
| Rank | Integer | 大类BSR排名 |
| Category | Array | 所属大类：["大类名","nodeid"] |
| BsrCategory | Array | 细分类目：[["类目名","NodeId","排名"],...] |
| VariationASINCount | Integer | 子体数量 |
| SellerCount | Integer | 卖家数量 |
| HasVideo | Boolean | 是否有主图视频 |
| APlus | Boolean | 是否有A+页面 |
| HasBrandStore | Boolean | 是否有品牌旗舰店 |
| Size | Array | 外包装尺寸：["最长边","第二长边","最短边"]（单位cm） |
| Weight | Integer | 重量（单位g） |
| ExtraSavings | Array | 关联促销：[{"Asin":"...","Text":"..."},...] |
| BrandPromotion | String | Brand Promotion优惠内容 |
| DealType | String | 促销标签（Deal类型） |

### 货币单位说明

> 所有价格/金额字段单位均为**当地货币最小单位**。
> 
> - 美国站（us）：单位为美分（cent），例：1999 = $19.99
> - 日本站（jp）：单位为日元（yen），例：1999 = ¥1999

---

*文档整理自 Sorftime Enterprise Solutions APIs，如有变更请以官方文档为准。*
*⚠️ 注意：Account-SK 为账户密钥，请勿放入前端代码、Git仓库或公开日志中，仅应存储在服务端环境变量或密钥管理系统中。*
