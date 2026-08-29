# 11｜像素角色与动作资产管线契约

## 1. 目标

定义离线像素动画生成管线与产品运行时之间唯一稳定交界，使资产可由现有管线或人工制作，但运行时代码只消费标准产物。

## 2. 已确认边界

- 生成管线不进入产品代码，也不随客户端运行。
- 角色使用预制角色与动作包。
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

坐标使用纹理像素坐标。每个动作必须共享相同逻辑画布和脚底锚点。

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
3. GIF 缺失不影响正式运行时。
4. 缺失纹理或 hash 错误不会导致客户端崩溃，会回退默认资产。
5. 帽子可按标准锚点叠加到不同兼容角色。
6. 所有资产通过自动和人工 QA 后才进入商店目录。
7. `ui/login-coin-hit` 缺失时登录页显示静态关键帧，登录功能不受影响。

## 12. 待确认项

`[待确认: ASSET-001]` 逻辑画布基准尺寸。建议先由首个角色包定为 128×128 或 192×192。  
`[待确认: ASSET-002]` 正式纹理使用 PNG Sheet 还是 lossless WebP。建议两者测试后选 WebP，保留 PNG 调试导出。  
`[待确认: ASSET-003]` 是否允许 AI 生成素材商用。需逐模型、逐数据来源确认许可证，阻塞具体资产发布。

## 13. 依赖

- 桌宠动作与商店；
- PixiJS 渲染；
- 对象存储和资源 CDN；
- 数据集 Manifest 样例。
