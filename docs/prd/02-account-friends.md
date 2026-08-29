# 02｜账号与好友

## 1. 目标

提供注册、登录、设备会话和双向好友关系，使联机状态只在已接受好友之间传播。

## 2. 非目标

- 陌生人匹配、公开大厅、附近的人；
- 好友动态广场、私聊、群聊；
- 企业组织架构、管理员查看员工状态；
- 通过通讯录批量上传联系人。

## 3. 用户故事

1. 用户可用邮箱或手机号注册并设置唯一显示名。
2. 用户可搜索精确好友码，发送好友申请。
3. 对方接受后，双方才能互相看到桌宠状态。
4. 任一方删除或拉黑后，实时状态立即停止传播。
5. 用户可管理已登录设备并注销其他设备。

## 4. 账号模型

```ts
interface Account {
  id: UserId;
  loginIdentifierVerified: boolean;
  displayName: string;        // 1–24 Unicode 字符
  friendCode: string;         // 8–12 位，不使用连续自增
  avatarCharacterItemId: EntityId;
  locale: string;
  timeZone: IanaTimeZone;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  revision: Revision;
}
```

认证建议：短效 access token + 可轮换 refresh token；refresh token 只保存在 Electron 安全凭据存储中，不放 localStorage。

## 5. 好友关系状态机

```text
NONE
  └─ 发送申请 → PENDING_OUT / 对方 PENDING_IN
       ├─ 接受 → ACCEPTED
       ├─ 拒绝/撤回 → NONE
       └─ 拉黑 → BLOCKED
ACCEPTED
  ├─ 删除 → NONE
  └─ 拉黑 → BLOCKED
BLOCKED
  └─ 解除拉黑 → NONE
```

好友关系只保存一条规范记录，双方视图由 `requesterId / addresseeId / status` 投影，避免双记录不一致。

## 6. 关键规则

- 好友搜索只接受完整好友码，不提供模糊用户名遍历。
- 每用户每小时发送申请数量应限流；重复申请返回现有关系，不新建记录。
- 只有 `ACCEPTED` 才能订阅好友 presence 和公开动作。
- 删除、拉黑、账号停用后，实时网关应在 3 秒内撤销订阅。
- 拉黑关系不向被拉黑方透露具体原因，只表现为不可用。
- 好友列表不显示对方任务标题、DDL、日薪、窝囊费余额或识别来源。

## 7. 接口摘要

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/v1/auth/register` | 注册 |
| `POST` | `/v1/auth/login` | 登录 |
| `POST` | `/v1/auth/refresh` | 刷新会话 |
| `DELETE` | `/v1/auth/sessions/{id}` | 注销设备 |
| `GET` | `/v1/friends` | 获取好友和申请 |
| `POST` | `/v1/friend-requests` | 按完整好友码申请 |
| `POST` | `/v1/friend-requests/{id}/accept` | 接受 |
| `DELETE` | `/v1/friend-requests/{id}` | 拒绝或撤回 |
| `DELETE` | `/v1/friends/{userId}` | 删除 |
| `POST` | `/v1/blocks` | 拉黑 |

精确请求/响应见 `13-api-event-contracts.md`。

## 8. 失败与降级

- 离线时显示缓存好友列表，但全部好友状态标记为离线或“状态未知”。
- token 过期且刷新失败时，不继续广播任何活动状态。
- 实时连接断开不影响本地任务、桌宠和工时计时；恢复后仅发送当前快照，不重放每次动作。

## 9. 验收条件

1. 未注册用户无法进入好友联机场景。
2. 未接受申请前，双方均看不到对方在线状态。
3. 接受后 3 秒内可以看到对方当前公开状态。
4. 删除或拉黑后 3 秒内停止接收对方状态。
5. 使用好友 API 无法读取任务标题、窗口内容和经济余额。
6. 同一申请重复提交不产生重复关系。

## 10. 待确认项

`[待确认: ACCOUNT-001]` MVP 使用邮箱、手机号还是二者均支持。建议先邮箱验证码。  
`[待确认: FRIEND-001]` 好友上限。建议 MVP 100 人，但主场景默认只渲染最近在线的 12 人。  
`[待确认: ACCOUNT-002]` 是否允许显示名重复。建议允许，身份以好友码区分。

## 11. 依赖

- 共享契约；
- 实时排排坐模块；
- 通知与隐私模块；
- API 与数据字典。

