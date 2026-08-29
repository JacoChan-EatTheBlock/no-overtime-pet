# 不要加班：桌宠核心动画资源包 v1

## 资源包定位

这是“不要加班”macOS MVP 的独立桌宠动画交付包，只包含客户端接入和视觉评审需要的核心成品，不包含源视频、绿幕输入、生成提示词、付费任务锁或其他生成中间文件。

资源包固定包含：

- 3 个角色：水豚、鹈鹕、暹罗猫；
- 每个角色 3 套基础动作：`WORK_NORMAL / SLACKING / TYPE_FRENZY`；
- 2 套共享特效：`COIN_OUT / COIN_IN_GLOW`；
- 合计 11 套核心动画资产。

## 目录结构

```text
characters/
  capybara/
  pelican/
  siamese-cat/
effects/
  coin-out/
  coin-in-glow/
qa/
asset-pack-manifest.json
README.md
```

每套角色动作包含：

- 动作 Sprite Sheet；
- 8 张透明 PNG 序列帧；
- 透明评审 GIF；
- 动作 Manifest；
- Contact Sheet；
- QA 记录。

每套特效包含：

- 独立金币或金光轨道；
- 8 张透明 PNG 预览帧；
- 透明评审 GIF；
- 特效 Manifest；
- 三个角色的叠加预览；
- Contact Sheet 与 QA 记录。

## 运行时边界

- GIF 仅用于快速评审，正式运行时读取 Sprite Sheet、轨道纹理与 Manifest。
- `COIN_OUT` 和 `COIN_IN_GLOW` 是可叠加 `PetEffect`，不得复制成“角色动作 + 金币”的组合动作。
- 金币轨道位于角色前层；`COIN_IN_GLOW` 的金光轨道位于角色后层。
- 当前资源为原型资产；接入客户端、真实 macOS 渲染和 AI 资产商业许可复核不在本交付包的已验证范围内。

## QA 入口

- `qa/11-asset-contact-sheet.png`：11 套核心资源总览；
- `qa/qa-report.json`：整包自动与人工检查记录；
- `qa/package-integrity.json`：从本独立目录执行的路径、哈希、GIF 和中间文件排除检查；
- 各动作或特效目录内的 `qa.json`：单项后处理检查结果。

