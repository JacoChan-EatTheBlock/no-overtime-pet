# 经济与装扮 UI 视觉 QA

## 对照基线

- 视口：1487 × 1058，设备像素比 1。
- 权威参考：
  - `design/image2-ui-v1/09-wallet-reward-pool.png`
  - `design/image2-ui-v1/10-shop.png`
  - `design/image2-ui-v1/11-wardrobe-hat-stack.png`
- 实现状态：钱包默认态、商店推荐态、衣柜帽子默认叠放态。
- 比较方式：从参考图和实现截图中按相同产品窗口尺寸裁切，左侧参考、右侧实现；Windows 桌面和任务栏不属于产品 UI，不作为还原目标。

## 最终证据

- 钱包实现：`09-wallet-implementation-final.png`
- 钱包并排对照：`09-wallet-comparison-final.png`
- 商店实现：`10-shop-implementation-final.png`
- 商店并排对照：`10-shop-comparison-final.png`
- 衣柜实现：`11-wardrobe-implementation-final.png`
- 衣柜并排对照：`11-wardrobe-comparison-final.png`

## 比较历史

### Pass 1

- P1：线框、圆角和图标过于现代，字体字重偏轻，未形成参考图的像素窗口质感。
- P1：衣柜帽子塔顶端与角色衔接比例不稳定，出现过裁切和缩放偏小。
- P2：商店初始拥有状态与参考图不一致。
- P2：三个产品窗口外缺少参考图中的像素水豚伴随角色。

修正：改为粗描边、硬阴影、像素折角、暖米白分层和更厚的中文标题/数字层级；换用从权威参考中无损提取的像素标题图标；调整帽子塔叠放偏移；修正初始拥有集合；补回仓库现有像素水豚素材。

### Final

- 字体：标题、金额、分区标题、商品名与按钮已按参考图建立明显粗细层级；中文回退链固定为 Microsoft YaHei / PingFang SC / Noto Sans CJK SC。
- 色彩：产品窗口统一使用项目暖米白 token；青绿色选中态、米棕边框、红绿金额语义与参考一致。
- 构图：09、10、11 的产品窗口尺寸、栏目划分、内容密度和主操作位置均保持同构。
- 像素质感：主窗口、卡片、按钮、页签、徽标和弹窗均采用硬边与阶梯折角，不使用渐变、玻璃态或大圆角。
- 素材：角色使用 `public/assets/capybara/idle.png`；商品、帽子、标题图标与奖池宝箱来自仓库权威画面中的无损裁切，来源和坐标登记在 `../assets/asset-sources.json`。
- Mock 边界：所有金额、库存、购买、装备保存状态均明确标注为 UI Mock，未调用真实余额、账本、购买或 appearance API。
- 交互：已验证钱包跳转商店、商品分类筛选、购买确认与本地库存更新、衣柜顺序调整、清空和保存演示。
- 控制台：最终三画面检查无 error / warn。

## 结论

`passed`

- P0：0
- P1：0
- P2：0
- P3：0

## 素材交付缺口

仓库仍缺少可直接用于生产发布的独立透明商品/帽子 PNG，以及角色帽子锚点和动作 Manifest。本次仅使用仓库内权威画面的无损裁切完成高保真 UI 演示；这些裁切在 `asset-sources.json` 中标记为 `prototypeOnly`，不得被误认为生产素材包或真实装扮配置。
