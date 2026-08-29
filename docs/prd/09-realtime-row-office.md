# 09｜联机“排排坐”场景

## 1. 目标

让已互加好友的用户在一个轻量像素场景里排排坐，实时看到彼此正在工作、开会、摸鱼、离开或已经跑路，以及对应桌宠动作。

## 2. 设计边界

虚拟办公室形式本身不重要。MVP 只需：

- 横向或分行排列固定工位；
- 自己和好友角色坐在工位；
- 名字、安全状态文案、下班/离线标记；
- 动作与帽子同步。

不做自由行走、地图、碰撞、寻路、家具摆放、房间装修或办公楼层。

## 3. 场景排序

默认建议：自己固定第一位，其余按下列键稳定排序：

1. 在线且未跑路；
2. 在线已跑路；
3. 离线；
4. 最近互动时间；
5. `userId` 稳定 tie-breaker。

好友过多时默认显示最近在线 12 人，其余通过分页或切换列表查看。`[待确认: FRIEND-001]`

## 4. 实时状态

```ts
interface FriendSceneMember {
  userId: UserId;
  displayName: string;
  presence: PresenceStatus;
  workStatus: PublicWorkStatus;
  safeLabelKey?: string;
  petAction: PetAction;
  actionIntensity: 1 | 2 | 3;
  clockOutState: "NOT_STARTED" | "AT_WORK" | "CLOCKED_OUT_ON_TIME" | "CLOCKED_OUT_LATE";
  characterItemId: EntityId;
  equippedHatItemIds: EntityId[];
  assetVersions: Record<string, string>;
  sequence: number;
  expiresAt: UTCTimestamp;
}
```

不得包含任务内容、具体 DDL、工资、窝囊费余额、窗口应用、URL 或输入频率。

## 5. 实时协议

连接：认证 WebSocket。订阅房间由服务端根据好友关系动态建立，客户端不能指定任意 userId 偷订阅。

关键事件：

- `presence.snapshot`
- `presence.updated`
- `pet.action.updated`
- `workday.clockout.updated`
- `appearance.updated`
- `friend.relation.revoked`

每个用户流使用递增 `sequence`；客户端丢弃旧序号。事件带短 TTL，过期后回退到 `IDLE/OFFLINE`，防止角色永远卡在敲键盘。

## 6. 更新频率与聚合

- 拍键盘等高频动作：本地聚合后最多每秒 1 次状态更新。
- 宏观状态变化：立即发送，服务端限流合并。
- 外观变化：购买/装备成功后发送一次。
- presence 心跳：建议 20 秒；60 秒无心跳转离线。
- 重连后发送当前快照，不回放历史按键动作。

## 7. 安全与关系撤销

- 网关每次订阅和重连都验证 `ACCEPTED` 关系。
- 删除/拉黑后服务端推送撤销事件，并从双方房间移除。
- 客户端缓存的好友公开状态设置短期 TTL；撤销后立即删除。
- 用户注销或 token 失效后停止广播。
- 显示名和状态文案按文本处理，不允许 HTML/富文本注入。

## 8. 离线与降级

- 实时服务断开：保留角色外观，状态显示“暂时失联”，不伪装在线。
- 资源缺失：显示默认角色和默认帽子占位。
- 场景帧率不足：降低远端角色帧率，优先保持本地桌宠低延迟。
- 好友客户端版本旧：未知动作降级 `IDLE`，未知装扮不渲染但不崩溃。

## 9. 验收条件

1. 只有 `ACCEPTED` 好友能互相看到状态。
2. 本地状态变化到好友显示 P95 ≤ 3 秒。
3. 连续键盘输入 60 秒，网络发送频率不超过配置上限。
4. 乱序事件不会把角色回滚到旧动作。
5. 删除或拉黑后 3 秒内从对方场景移除。
6. 事件抓包不含任务、工资、应用名、URL 或具体按键。
7. 12 个角色同时显示时达到性能预算。

## 10. 待确认项

`[待确认: OFFICE-001]` 好友场景是否所有好友互相可见。建议每个用户看到自己的好友集合，不创建共享群房间。  
`[待确认: OFFICE-002]` 已跑路好友保留到当天结束还是立即消失。建议保留半透明“已跑路”角色，增强胜利感。  
`[待确认: OFFICE-003]` 状态是否允许用户手动隐藏。建议提供“隐身”，对好友显示离线。

## 11. 依赖

- 账号好友；
- 活动公开投影；
- 桌宠动作与装扮；
- API/事件契约。

