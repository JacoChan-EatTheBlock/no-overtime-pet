# 任务与排程静态 HTML 还原

本目录提供六个无需 React 或后端即可打开的浏览器页面：

- `01-task-bubble.html`：今日任务气泡；
- `05-task-list.html`：待办列表与新建；
- `06-ai-analysis.html`：AI 建议确认；
- `07-schedule-draft.html`：今日安排草案；
- `12-clockout-confirm.html`：跑路确认；
- `13-clockout-success.html`：跑路成功。

六个页面共用 `styles.css` 和 `app.js`。Mock 数据固定，主流程控件可以直接操作。页面可通过文件协议打开，也可在仓库根目录启动静态服务器后访问。

视觉权威分别为：

- `design/image2-ui-v1/01-click-todo-panel.png`
- `design/image2-ui-v2-comments/01-task-auto-ai.png`
- `design/image2-ui-v2-comments/02-ai-confirm-suggestions.png`
- `design/image2-ui-v1/07-schedule-commitment.png`
- `design/image2-ui-v1/12-clockout-confirmation.png`
- `design/image2-ui-v1/13-clockout-success.png`

视觉 QA 固定使用 `1487 × 1058` CSS 像素、`deviceScaleFactor: 1`。参考图中的 Windows 壁纸、桌面图标和任务栏不属于产品 UI，因此静态页面使用规范中的中性雾蓝灰 QA 舞台。

图标来自 `@tabler/icons 3.46.0` 的官方 SVG 文件，按 MIT 许可证使用，许可证副本位于 `assets/icons/TABLER-LICENSE.txt`。

标题区的剪贴板、AI 机器人、日历和成功标记从本任务的权威基础图中无损提取，去除背景后保存在 `assets/pixel-source/`，仅用于本产品 UI 还原。
