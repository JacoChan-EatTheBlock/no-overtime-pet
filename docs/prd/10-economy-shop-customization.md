# 10｜商店、角色与帽子

## 1. 目标

让用户用唯一货币“窝囊费”购买角色和帽子，并通过固定价格窝囊时长保证不同工资用户通过自己的工作获得相同购买力；公共奖励池形成的跨工资福利除外。

## 2. 商品模型

```ts
interface ShopItem {
  schemaVersion: "1.0";
  id: EntityId;
  sku: string;
  type: "CHARACTER" | "HAT";
  displayNameKey: string;
  descriptionKey: string;
  requiredWorkMs: DurationMs;     // 价格窝囊时长，不是第二货币
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC";
  assetId: EntityId;
  assetVersion: string;
  availableFrom?: UTCTimestamp;
  availableUntil?: UTCTimestamp;
  status: "ACTIVE" | "HIDDEN" | "RETIRED";
  catalogVersion: string;
}
```

商品目录只配置 `requiredWorkMs`，不为不同用户写固定金额价。

## 3. 价格显示

客户端或服务端报价接口使用当前有效 `NangFeeRateSnapshot`：

```ts
interface ShopQuote {
  itemId: EntityId;
  requiredWorkMs: DurationMs;
  displayPriceMinor: MoneyMinor;
  currency: "CNY";
  rateSettingsRevision: Revision;
  catalogVersion: string;
  expiresAt: UTCTimestamp;
}
```

显示文案示例：“200 元窝囊费”，不要显示“2 小时币”。可在详情解释“相当于你当前 2 小时的窝囊费”，该时长是定价说明，不是余额或可交易货币。

## 4. 购买事务

```ts
interface PurchaseRequest {
  itemId: EntityId;
  quoteCatalogVersion: string;
  idempotencyKey: IdempotencyKey;
}
```

服务端原子流程：

1. 锁定用户钱包和商品；
2. 校验商品可售、未拥有、目录版本兼容；
3. 校验 `balanceEquivalentMs >= requiredWorkMs`；
4. 写 `PURCHASE_DEBIT = -requiredWorkMs`；
5. 创建 Inventory 记录和成功 Purchase；
6. 提交事务后返回新钱包和物品。

如果决定允许负余额，加班可以把余额变负，但购买仍要求余额足够，不能继续透支购买。

## 5. 防工资套利

攻击场景：先填高日薪获得大量显示窝囊费，再改低日薪以为可低价买。实际不会成功，因为：

- 钱包规范余额始终是等价毫秒；
- 商品实际扣除也是固定 `requiredWorkMs`；
- 日薪变更只同步缩放显示余额和显示价格；
- 报价中的金额不参与最终余额换算。

因此不需要核验工资真实性来维持购买力公平。

### 5.1 奖励池是明确例外

自己的工作收入和商品价格继续按同一费率变化，保证自有工作时间的购买力不受日薪数字影响。但加班奖励池不按等价工作时间分配，而按贡献者实际被扣除的人民币窝囊费分配：

- 高工资贡献者加班，同样时间会向池中贡献更多人民币；
- 领取者拿到确定的人民币金额；
- 低工资领取者因为自己的商品价格较低，会获得更高购买力；
- 该福利在入账时按领取者费率固化为规范购买力，领取者以后修改日薪不会再次放大。

这不是工资填写套利，而是公共池规则有意产生的跨工资福利。明显异常日薪和协同刷池风险仍需服务端审计。

## 6. 库存与装备

```ts
interface InventoryItem extends ContractHeader {
  userId: UserId;
  shopItemId: EntityId;
  acquiredBy: "PURCHASE" | "DEFAULT" | "GRANT" | "REFUND_RESTORE";
  acquiredAt: UTCTimestamp;
}

interface AppearanceLoadout extends ContractHeader {
  userId: UserId;
  characterItemId: EntityId;
  equippedHatItemIds: EntityId[];  // 从下到上
}
```

- MVP 提供 3 个免费默认角色，并以 6 个可购买角色、20 顶帽子作为首轮内容目标。
- 角色同一时刻装备一个。
- 帽子数组顺序即堆叠顺序，允许用户拖动调整。
- 只能装备库存中拥有且资源可用的物品。
- 商品退役不删除已拥有物品；资源仍需长期可获取。

## 7. 帽子叠加

帽子 Manifest 必须提供 `bottomAttach` 与 `topAttach` 锚点。装备预览使用真实角色动作至少检查 `IDLE`、`TYPE_BOTH`、`CELEBRATE` 三种状态。

`[已确认]` 帽子可持续向上叠加，不设置固定装备数量硬上限。超出可见高度后直接进入纵向滚动，不自动缩小角色或帽子塔；实现可缓存静态帽子层，但不得静默少渲染已装备帽子。

## 8. 退款与错误

- MVP 不提供用户主动退款 `[建议]`。
- 事务失败时不得出现扣款成功但未发物品。
- 若资源永久无法使用，可由管理员创建 `REFUND_CREDIT` 和库存状态修正，不修改原购买记录。
- 重复购买已拥有非消耗品返回 `ITEM_ALREADY_OWNED`，不扣款。
- 客户端显示报价过期时重新获取，不以旧显示金额阻断等价时间购买。

## 9. 禁止功能

- 用户转账；
- 物品交易或拍卖；
- 按他人工资定价；
- 现金充值购买窝囊费；
- 客户端修改 `requiredWorkMs`；
- 随机抽奖和概率付费机制。

## 10. 验收条件

1. 不同日薪用户购买同一物品都扣除相同 `requiredWorkMs`。
2. 日薪改变前后，同一余额能购买的商品集合不变。
3. 重放相同购买请求不会重复扣款或重复发货。
4. 并发购买两件物品时不会使余额错误越界。
5. 扣款与发物品在同一事务中成功或失败。
6. 用户界面只出现“窝囊费”钱包，不出现第二货币。
7. 帽子顺序在本地和好友端一致，超高帽子塔不会因客户端性能策略丢层。
8. 已退役商品仍可为旧拥有者加载资源。
9. 高工资用户贡献的人民币奖励不会在池内转换成统一工作时长；低工资获奖者能获得更高购买力。
10. 获奖者领取后再修改日薪，已领取奖励的购买力不会二次放大。
11. 超高帽子塔保持原始可读尺寸并通过纵向滚动查看全部层，不触发自动缩小。

## 11. 已确认项

`[已确认: SHOP-001][2026-08-29]` MVP 以 3 个默认角色、6 个可买角色、20 顶帽子作为首轮内容目标。
`[已确认: SHOP-002][2026-08-29]` 商品详情可解释对应工作时长，钱包页不显示第二余额。
`[已确认: HAT-STACK-001][2026-08-29]` 不自动缩小；超出可见高度直接纵向滚动，静态层可缓存。
`[已确认: SHOP-003][2026-08-29]` MVP 不做限时商品。

## 12. 依赖

- 工作设置和钱包账本；
- 桌宠动作与资产 Manifest；
- API、数据字典和经济测试。
