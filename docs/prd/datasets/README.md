# 数据集与策略样例

## 1. 用途

本目录预定义 AI、排程、活动识别、商店和动画资源之间交换的数据格式。所有文件都是结构样例，不是生产配置或训练数据。

## 2. 文件清单

| 文件 | 用途 | 主要消费方 |
|---|---|---|
| `task-category-catalog.example.json` | 任务类别、基准时长和拆分建议 | AI 分析 |
| `activity-category-catalog.example.json` | 信号到宏观活动类别的策略 | 本地/视觉识别 |
| `safe-status-templates.example.json` | 好友可见安全文案 | Desktop/Realtime |
| `schedule-policy-v1.example.json` | 排程排序、块长和缓冲策略 | Scheduling |
| `shop-catalog.example.json` | 固定价格窝囊时长商品 | Commerce/Desktop |
| `character-action-manifest.example.json` | 128×128 透明 GIF 角色动作资源 | Asset Runtime |
| `hat-asset-manifest.example.json` | 帽子锚点资源 | Asset Runtime |
| `activity-evaluation-sample.example.jsonl` | 活动识别评估记录 | AI Evaluation |
| `economy-settlement-scenarios.example.json` | 人民币金额池守恒、均分与跨工资福利用例 | Economy Tests |

## 3. 通用字段

- `schemaVersion`：结构兼容版本；
- `catalogVersion`：目录内容版本；
- `policyVersion`：决策策略版本；
- `assetVersion`：不可覆盖的资源版本；
- `locale`：文案地区；
- `contentHashSha256`：正式发布时必须是真实文件 hash。

## 4. 发布规则

1. 样例变成生产数据前必须通过对应 JSON Schema。
2. 目录版本不可覆盖；任何语义变更发布新版本。
3. 枚举必须来自 `01-shared-contracts.md`。
4. 排程和识别阈值不能散落在客户端代码。
5. 商店只配置 `requiredWorkMs`，不得配置用户固定金额价。
6. 评估数据不得包含原始截图、任务全文、具体按键、日薪或身份标识。
7. 资产 hash 在本样例为占位值，生产发布必须替换。
8. 加班奖励池样例的币种固定 `CNY`，贡献、份额和结余均使用人民币分，不得替换成等价时间字段。
9. 角色动作样例中一个 `PetAction` 对应一个 128×128 透明 GIF；状态切换时从目标 GIF 首帧播放。

## 5. 合并要求

- 修改策略数据时同时更新评估报告或测试快照。
- 修改 Manifest 时同时更新资产运行时契约测试。
- 修改商品 `requiredWorkMs` 属于经济变更，要保留旧目录版本及购买审计。
- 修改安全文案需检查是否可能泄露应用、网站或任务语义。
