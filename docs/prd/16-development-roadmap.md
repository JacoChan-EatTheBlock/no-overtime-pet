# 16｜开发路线、模块拆分与合并门禁

## 1. 推荐仓库结构

```text
apps/
  desktop/          Electron + React + PixiJS；main/platform/windows 隔离系统能力
  api/              NestJS HTTP API 与 Socket.IO 网关；当前同进程
  ai-service/       FastAPI 分析、排程、视觉适配
packages/
  contracts/        JSON Schema、共享枚举、生成类型
  domain/           按领域拆分的纯业务规则：账号、排程、经济、活动、社交
  db/               PostgreSQL 迁移与数据库约定
  asset-runtime/    Manifest 校验与 PixiJS 资源适配
  test-fixtures/    脱敏和合成测试数据
docs/prd/            本 PRD 合集
tests/e2e/           跨模块端到端测试
```

MVP 不强制微服务化：`api` 与 `realtime` 可同一部署；包边界用于代码职责与测试，而非增加运维复杂度。

## 2. 开发原则

- 先完成端到端薄闭环，再扩展识别模型和装扮数量。
- 先固定共享契约，再允许模块并行开发。
- 经济、权限和好友授权在服务端做权威校验。
- AI 输出与正式数据严格分层。
- 动画生成仅为离线工具，不进入运行时依赖。
- renderer、preload、Electron main 与 Windows 平台适配层保持单向依赖；业务代码不得直接引用 Win32、Node 或任意 IPC。
- 当前只验收 Windows x64 可分享 Demo；签名、安装器、自动更新与公开发行门禁延后。
- 所有并行工作包从同一个冻结 SHA 建立独立 Git worktree；不得让多个 AI 共用同一工作目录。
- 每个阶段修改超过 3 个文件时按子任务逐项验证。
- 每次重要规则变化同步更新根目录 `不要加班_agent.md`；返工与问题经验更新 `lessons.md`。

## 3. 阶段 0：未决问题与契约冻结

目标：让会影响数据模型的决定先落定。

必须确认：

- `ECON-POOL-001` 池范围；
- `ECON-POOL-004` 负余额；
- `TASK-COMMIT-001` 承诺冻结；
- `ACTIVITY-PRIVACY-001` 截图权限；
- `HAT-STACK-001` 超高帽子塔缩放、滚动和缓存策略；
- `PRIVACY-001` 公开发行地区（不阻塞可分享 Demo）；
- `PLATFORM-WIN-001` 公开分发前的最低 Windows 版本（不阻塞可分享 Demo）；
- `PET-WIN-001` 托盘常驻与开机启动策略；
- `PET-WIN-002` 全屏应用可见策略。

交付：共享 JSON Schema、API/事件 Schema、数据库迁移基座、环境参数模板、并行目录所有权、数据集 v1，以及最小 Windows 壳探针。

最小 Windows 壳探针只需证明 Electron x64 壳可以完成系统托盘、主窗口、透明桌宠窗口、`workArea` 定位、`safeStorage` 能力探测和采集开关降级，不实现产品业务。

验证：所有模块仅引用一份枚举和经济公式；契约测试能运行；Demo 在当前开发机启动，并记录另一台 Windows 11 x64 机器的未验证/验证证据。

## 4. 阶段 1：本地单人工作闭环

范围：

1. Electron 壳、系统托盘、设置主窗口、透明桌宠窗口和开机启动开关；
2. 工时/午休/日薪设置；
3. 待办创建、完成和本地持久化；
4. 基础确定性日程；
5. 工作日会话和本地窝囊费预览；
6. 默认角色基础动作。

此阶段经济只能标为本地预览，不允许宣称正式跨设备余额。

验收：单机完成“录任务 → 排日程 → 工作动作 → 午休暂停 → 准点跑路”。

## 5. 阶段 2：账号、同步与正式经济

范围：

1. 用户名密码注册登录；
2. PostgreSQL 正式任务/设置；
3. 工作日权威计提；
4. 钱包不可变账本；
5. 商品目录、购买、库存和装备；
6. 幂等、恢复和审计。

验收：断网、重放、并发购买和工资变更场景全部通过；钱包可由账本重建。

## 6. 阶段 3：好友与排排坐

范围：

1. 好友码、申请、接受、删除和单向“不对其展示”；
2. WebSocket presence；
3. 聚合桌宠动作；
4. 排排坐场景；
5. “允许好友查看我的活动状态”和“在桌面显示好友桌宠”两个独立设置；
6. 角色和帽子同步。

验收：只有已接受好友可见；隐私抓包通过；12 角色性能达标。

## 7. 阶段 4：AI 分析与个人速度

范围：

1. Task Analysis Proposal；
2. 确定性校验与接受流程；
3. 个人历史聚合特征；
4. 可解释时间估计；
5. 纯排程求解器和重排 Diff。

验收：AI 失败可降级；用户字段保留率 100%；固定评估集报告可追溯。

## 8. 阶段 5：高准确桌面识别

范围：

1. Windows 前台应用、输入聚合、窗口上下文与屏幕截图信号采集；
2. 本地分类和时间平滑；
3. 授权、截图打码、在线视觉适配；
4. 只读识别记录与离线评估数据闭环，不提供用户纠正；
5. 安全文案投影。

验收：权限撤销、敏感页面、无原图留存和宏观准确率全部过门槛。

## 9. 阶段 6：加班奖励池

该阶段放在正式任务、工作日和账本稳定之后：

1. 冻结承诺快照；
2. 加班扣减与池贡献同事务；
3. 资格评估和 reason codes；
4. 按贡献者实际扣除的人民币分汇总，并按人民币分平均结算；
5. 余量滚存与幂等恢复；
6. 按收款人结算时费率写入个人规范钱包并展示实际人民币奖励。

验收：`15-test-acceptance.md` E-001 至 E-011 全部通过；人民币分守恒差异为 0，池中不存在等价时间均分字段。

## 10. 阶段 7：资产扩充与 Demo 收口

范围：

- 接入离线像素动画管线产物；
- 扩充角色/帽子目录；
- 自动资产 QA；
- Windows x64 Demo 文件清单、commit/版本记录、SHA-256 与崩溃报告边界；
- 账号删除、服务端数据处置与 Demo 隐私说明；
- 清库重建、资源回滚和演示数据重置。

验收：离线管线不可用时不影响 Demo；资源回滚和旧物品可用；当前开发机及另一台 Windows 11 x64 机器完成启动、托盘、透明窗、隐私降级与 `safeStorage` 检查。签名、安装器、自动更新和公开发行另立阶段。

## 11. 可并行工作包

共享契约冻结后固定为 8 个并行工作包，详细任务书位于 `docs/development/workstreams/`：

| 工作包 | 可改范围 | 依赖输出 |
|---|---|---|
| WS-01 Windows Shell | Electron main/preload、托盘、窗口、`safeStorage` 与 Windows 能力适配 | contracts、Windows 平台 PRD |
| WS-02 Account/Auth | 用户名密码、会话、资料与好友身份基础 | contracts、1000 段迁移 |
| WS-03 Task/Proposal | 任务录入、AI Proposal、确认与承诺快照 | contracts、2000 段迁移 |
| WS-04 Schedule | 排程 domain、日程 UI、锁定与重排 Diff | contracts、3000 段迁移 |
| WS-05 Economy/Shop | 工时、钱包、账本、商店与装扮 | contracts、4000 段迁移 |
| WS-06 Activity/Pet/Assets | Windows 活动信号、动作状态机、PixiJS 与 Manifest | contracts、asset manifests |
| WS-07 Social/Realtime | 好友、presence、网关与排排坐 | contracts、5000 段迁移 |
| WS-08 E2E/Acceptance | 跨模块 E2E、固定数据、报告和 Demo 验收 | 已合并工作包、9000 段测试种子 |

并行工作包不得各自复制 `PetAction`、`PetEffect`、`TaskStatus`、错误码或金额公式；发现冻结契约缺口时提交 RFC 并暂停依赖该缺口的实现，不得自行扩展共享契约。

## 12. 合并顺序

1. Windows Foundation；
2. WS-01 Windows Shell；
3. WS-02 Account/Auth；
4. WS-03 Task/Proposal；
5. WS-04 Schedule；
6. WS-06 Activity/Pet/Assets；
7. WS-05 Economy/Shop；
8. WS-07 Social/Realtime；
9. WS-08 E2E/Acceptance。

每一步必须保证主分支仍可构建。任何破坏性契约改动先合并兼容消费者，再删除旧字段。

## 13. 单任务交付模板

每个开发 AI 的交付必须包含：

- 对需求的理解；
- 修改范围和文件；
- 使用的契约/策略/数据集版本；
- 实现内容与未实现内容；
- 风险和取舍；
- 测试用例、执行命令和结果；
- 未验证的真实环境；
- 是否更新 `不要加班_agent.md`、`lessons.md`；
- 是否包含数据库迁移或兼容影响。

## 14. 完成定义

功能只有同时满足以下条件才算完成：

1. 符合模块 PRD 和共享契约；
2. 权限和失败路径已实现；
3. 自动测试通过；
4. 真实 Windows x64 环境上的托盘、透明窗口、混合 DPI、输入/截图降级和 Demo 启动路径按风险验证；
5. 日志和事件通过隐私扫描；
6. 监控能定位失败但不泄露内容；
7. 文档与数据集版本同步；
8. 未决项未被开发者偷偷定案。
