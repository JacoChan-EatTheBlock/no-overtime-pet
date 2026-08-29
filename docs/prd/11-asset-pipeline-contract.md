# 11｜像素角色与动作资产管线契约

## 1. 目标

定义离线像素动画生成管线与产品运行时之间唯一稳定交界，使资产可由现有管线或人工制作，但运行时代码只消费标准产物。

## 2. 已确认边界

- 生成管线不进入产品代码，也不随客户端运行。
- 角色使用预制角色与动作包。
- `COIN_OUT` 与 `COIN_IN_GLOW` 使用跨角色共享特效包，通过语义锚点叠加，不烘焙进角色动作。
- GIF 可用于预览和评审，但正式运行时优先 Sprite Sheet / WebP Sheet + Manifest。
- 登录页右侧预留 `ui/login-coin-hit`“金币砸脑壳”循环装饰动画；GIF 或静态关键帧只用于视觉评审，运行时仍遵循标准纹理与 Manifest 契约。
- 产品不依赖特定生成模型、去背工具或外部工作流存活。

## 3. 可参考的现有管线

本机已有项目可作为资产生产思路参考：

- `D:\TM\docs\TM_文字生成角色与动作资产管线_PRD.md`
- `D:\TM\apps\ai-service\app\animation_processing.py`
- `D:\TM\apps\web\src\components\CharacterAnimationPlayer.tsx`

可借鉴流程：关键帧/视频生成 → FFmpeg 抽帧 → 去背 → 锚点与循环 QA → Sprite Sheet/Manifest → PixiJS 播放。该引用不代表可直接复制代码或资产；接入前必须核对许可证和实际输出。

## 4. 交付目录

```text
assets/
  characters/{characterId}/{assetVersion}/
    character.manifest.json
    actions/{actionId}.webp
    previews/{actionId}.gif
    thumbnail.webp
  effects/{effectId}/{assetVersion}/
    effect.manifest.json
    tracks/{trackId}.webp
    preview.gif
  hats/{hatId}/{assetVersion}/
    hat.manifest.json
    texture.webp
    thumbnail.webp
```

运行时只要求 Manifest 和正式纹理；预览 GIF 可不随客户端打包。

## 5. 角色 Manifest

样例见 `datasets/character-action-manifest.example.json`。

```ts
interface CharacterManifest {
  schemaVersion: "1.0";
  characterId: string;
  assetVersion: string;
  canvas: { width: number; height: number };
  scaleMode: "NEAREST";
  anchors: {
    feet: { x: number; y: number };
    head: { x: number; y: number };
    bodyCenter: { x: number; y: number };
    ground: { x: number; y: number };
    backGlow: { x: number; y: number };
    keyboard?: { x: number; y: number };
  };
  actions: Record<string, {
    texture: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    fps: number;
    loop: boolean;
    loopStartFrame?: number;
    fallbackAction: PetAction;
    eventFrames?: Record<string, number[]>;
    contentHashSha256: string;
  }>;
}
```

坐标使用纹理像素坐标。每个动作必须共享相同逻辑画布和脚底锚点。`bodyCenter` 是金币进出身体的目标点，`ground` 是金币落地消失点，`backGlow` 是角色后方金光中心；三者必须逐角色人工确认，运行时不得通过透明边界猜测。

## 6. 共享特效 Manifest

金币样式、路径和金光属于共享特效，不因角色不同复制纹理。角色只通过 Manifest 提供语义锚点。
样例见 `datasets/pet-effect-manifest.example.json`。

```ts
type CharacterEffectAnchor = "bodyCenter" | "ground" | "backGlow";

interface EffectManifest {
  schemaVersion: "1.0";
  effectId: PetEffect;
  assetVersion: string;
  scaleMode: "NEAREST";
  durationMs: DurationMs;
  tracks: Array<{
    trackId: string;
    layer: "BEHIND_CHARACTER" | "IN_FRONT_OF_CHARACTER";
    texture: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    fps: number;
    loop: false;
    attachTo?: CharacterEffectAnchor;
    motion?: {
      from: CharacterEffectAnchor | "CANVAS_TOP_CENTER";
      to: CharacterEffectAnchor;
      easing: "LINEAR" | "EASE_IN";
    };
    contentHashSha256: string;
  }>;
}
```

- `COIN_OUT`：金币轨道位于 `IN_FRONT_OF_CHARACTER`，从 `bodyCenter` 移动到 `ground`，到达后消失。
- `COIN_IN_GLOW`：金币轨道位于 `IN_FRONT_OF_CHARACTER`，从 `CANVAS_TOP_CENTER` 移动到 `bodyCenter`；命中后播放附着于 `backGlow` 的 `BEHIND_CHARACTER` 金光轨道。
- 特效轨道不得包含角色、桌子、帽子、阴影或场景背景；同一资源必须能够叠加到所有兼容角色。

## 7. 帽子 Manifest

样例见 `datasets/hat-asset-manifest.example.json`。

```ts
interface HatManifest {
  schemaVersion: "1.0";
  hatId: string;
  assetVersion: string;
  texture: string;
  frameWidth: number;
  frameHeight: number;
  scaleMode: "NEAREST";
  anchors: {
    bottomAttach: { x: number; y: number };
    topAttach: { x: number; y: number };
  };
  compatibleCharacterTags: string[];
  contentHashSha256: string;
}
```

若帽子需要随动作变形，后续可扩展逐动作附件轨道；MVP 建议帽子作为刚性像素层随头锚点移动。

## 8. MVP 最小资产包

角色必须交付：

- `WORK_NORMAL`
- `SLACKING`
- `TYPE_FRENZY`

全局共享特效必须交付：

- `COIN_OUT`
- `COIN_IN_GLOW`

首发 3 个角色的基线资产量是 9 套角色动作加 2 套共享特效，共 11 套核心动画资产。禁止为“疯狂敲键盘时金币流出”等组合复制角色动作；运行时必须通过图层叠加合成。

资产命名严格使用共享枚举；不得用中文文件名或自由文本作为运行时 `actionId` 或 `effectId`。

## 9. 自动 QA

每次资产发布必须验证：

1. JSON Schema 通过；
2. 所有纹理路径存在；
3. SHA-256 与文件一致；
4. 帧宽高能整除纹理尺寸；
5. 帧数、循环点和事件帧在范围内；
6. 透明边界无明显脏色；
7. 脚底锚点跨动作偏差不超过阈值；
8. 第一帧和循环帧差异达到循环质量门槛；
9. nearest-neighbor 渲染无采样模糊；
10. 帽子锚点位于纹理有效范围；
11. 共享特效不含角色或场景像素，前后景轨道、起止锚点和时长合法；
12. `COIN_OUT` 末帧金币不可见，`COIN_IN_GLOW` 的金光轨道只出现在角色后层。

## 10. 人工 QA

- 正常上班、抱鱼摸鱼和疯狂敲键盘一眼可区分；
- 疯狂敲键盘的双爪交替语义清楚；
- 金币流出、金币流入和背后金光的方向及层级清楚；
- 两套金币特效分别叠加到水豚、鹈鹕和暹罗猫时不穿帮；
- 角色风格和像素密度一致；
- 帽子堆叠 1、3、8 层及超高压力样本不穿插、不丢层；
- 在深浅背景下边缘可见；
- 角色和素材不存在未授权 IP 特征。

## 11. 发布与回滚

- 资源不可覆盖同一 `assetVersion`；修复必须发新版本。
- 清单先上传、校验全部纹理后再原子切换 catalog 指针。
- 客户端校验 hash，失败则回退上一个已缓存版本。
- 服务端装备记录保存物品 ID，不绑定客户端本地路径。
- 已售物品资源必须可长期获取或提供兼容替代。

## 12. 验收条件

1. 删除生成管线环境后，已发布客户端仍能完整运行。
2. 新角色仅靠标准 Manifest 和纹理即可接入，无需修改动作业务代码。
3. GIF 缺失不影响正式运行时。
4. 缺失纹理或 hash 错误不会导致客户端崩溃，会回退默认资产。
5. 帽子可按标准锚点叠加到不同兼容角色。
6. 所有资产通过自动和人工 QA 后才进入商店目录。
7. `ui/login-coin-hit` 缺失时登录页显示静态关键帧，登录功能不受影响。
8. 三个角色只需各自提供 3 个基础动作；两套金币特效可同时叠加在任一基础动作上，无需组合素材。
9. 同一 `COIN_IN_GLOW` 资源能把金币放到不同角色的 `bodyCenter`，并把金光稳定放在各自 `backGlow` 后层。

## 13. 待确认项

`[待确认: ASSET-001]` 逻辑画布基准尺寸。建议先由首个角色包定为 128×128 或 192×192。  
`[待确认: ASSET-002]` 正式纹理使用 PNG Sheet 还是 lossless WebP。建议两者测试后选 WebP，保留 PNG 调试导出。  
`[待确认: ASSET-003]` 是否允许 AI 生成素材商用。需逐模型、逐数据来源确认许可证，阻塞具体资产发布。

## 14. 依赖

- 桌宠动作与商店；
- PixiJS 渲染；
- 对象存储和资源 CDN；
- 数据集 Manifest 样例。
