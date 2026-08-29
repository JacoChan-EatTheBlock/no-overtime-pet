# 11｜像素角色与动作资产管线契约

## 1. 目标

定义离线像素动画生成管线与产品运行时之间唯一稳定交界，使资产可由现有管线或人工制作，但运行时代码只消费标准产物。

## 2. 已确认边界

- 生成管线不进入产品代码，也不随客户端运行。
- 角色使用预制角色与动作包。
- 正式角色动作使用 128×128 透明 GIF + Manifest；一个 `PetAction` 对应一个 GIF。
- 登录页右侧 `ui/login-coin-hit`“金币砸脑壳”使用 128×128 透明循环 GIF；缺失时降级静态关键帧。
- 产品不依赖特定生成模型、去背工具或外部工作流存活。
- AI 生成资产只有在供应商、模型、输入来源和输出许可证全部进入商用白名单并留下审计记录后才能发布。

## 3. 可参考的现有管线

本机已有项目可作为资产生产思路参考：

- `D:\TM\docs\TM_文字生成角色与动作资产管线_PRD.md`
- `D:\TM\apps\ai-service\app\animation_processing.py`
- `D:\TM\apps\web\src\components\CharacterAnimationPlayer.tsx`

可借鉴流程：关键帧/视频生成 → FFmpeg 抽帧 → 去背 → 统一 128×128 画布 → 透明 GIF/Manifest → 锚点与循环 QA → PixiJS 预解码缓存播放。该引用不代表可直接复制代码或资产；接入前必须核对许可证和实际输出。

## 4. 交付目录

```text
assets/
  characters/{characterId}/{assetVersion}/
    character.manifest.json
    actions/{actionId}.gif
    thumbnail.webp
  hats/{hatId}/{assetVersion}/
    hat.manifest.json
    texture.webp
    thumbnail.webp
```

运行时要求 Manifest 和正式动作 GIF；缩略图不参与动作播放，可不随最小客户端包加载。

## 5. 角色 Manifest

样例见 `datasets/character-action-manifest.example.json`。

```ts
interface CharacterManifest {
  schemaVersion: "2.0";
  characterId: string;
  assetVersion: string;
  canvas: { width: 128; height: 128 };
  scaleMode: "NEAREST";
  anchors: {
    feet: { x: number; y: number };
    head: { x: number; y: number };
    keyboard?: { x: number; y: number };
  };
  actions: Record<string, {
    gif: string;
    frameWidth: 128;
    frameHeight: 128;
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

坐标使用 GIF 逻辑画布像素坐标。每个动作必须共享 128×128 逻辑画布和脚底锚点。Manifest 的帧数、帧率、循环标志必须与 GIF 实际元数据一致；状态机切换动作时从目标 GIF 首帧重新播放。

## 6. 帽子 Manifest

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

## 7. 最小动作包

角色必须交付：

- `IDLE`
- `TYPE_LEFT`
- `TYPE_RIGHT`
- `TYPE_BOTH`
- `MOUSE_MOVE`
- `MOUSE_CLICK`
- `MEETING_DAZE`
- `READ`
- `SLACK_SECRETLY`
- `AWAY_DISAPPEAR`
- `CELEBRATE`

资产命名严格使用共享枚举；不得用中文文件名或自由文本作为运行时 actionId。

## 8. 自动 QA

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
10. 帽子锚点位于纹理有效范围。
11. GIF 逻辑画布、每帧合成结果和解码输出均为 128×128；透明背景无脏边。
12. GIF 预解码缓存键包含 `characterId + assetVersion + actionId`，同一动作不重复解码。

## 9. 人工 QA

- 拍键盘左右手语义清楚；
- 会议、摸鱼、离开动作一眼可区分；
- 角色风格和像素密度一致；
- 帽子堆叠 1、3、8 层及超高压力样本不穿插、不丢层；
- 在深浅背景下边缘可见；
- 角色和素材不存在未授权 IP 特征。

## 10. 发布与回滚

- 资源不可覆盖同一 `assetVersion`；修复必须发新版本。
- 清单先上传、校验全部纹理后再原子切换 catalog 指针。
- 客户端校验 hash，失败则回退上一个已缓存版本。
- 服务端装备记录保存物品 ID，不绑定客户端本地路径。
- 已售物品资源必须可长期获取或提供兼容替代。

## 11. 验收条件

1. 删除生成管线环境后，已发布客户端仍能完整运行。
2. 新角色仅靠标准 Manifest 和纹理即可接入，无需修改动作业务代码。
3. 单个动作 GIF 缺失时按 Manifest fallback，不会导致正式运行时崩溃。
4. 缺失纹理或 hash 错误不会导致客户端崩溃，会回退默认资产。
5. 帽子可按标准锚点叠加到不同兼容角色。
6. 所有资产通过自动和人工 QA 后才进入商店目录。
7. `ui/login-coin-hit` 缺失时登录页显示静态关键帧，登录功能不受影响。
8. 切换 `PetAction` 时从对应 GIF 首帧播放，非循环动作结束后按 Manifest fallback。
9. 每个发布资产都能追溯供应商、模型、输入来源与商用许可证审计结果。

## 12. 已确认项

`[已确认: ASSET-001][2026-08-29]` 角色逻辑画布固定为 128×128。
`[已确认: ASSET-002][2026-08-29]` 正式角色动作格式为透明 GIF，状态机通过切换 GIF 实现动作变化。
`[已确认: ASSET-003][2026-08-29]` 只允许商用白名单内的 AI 生成资产发布；每个具体资产仍必须逐供应商和来源完成许可证审计。

## 13. 依赖

- 桌宠动作与商店；
- PixiJS 渲染；
- 对象存储和资源 CDN；
- 数据集 Manifest 样例。
