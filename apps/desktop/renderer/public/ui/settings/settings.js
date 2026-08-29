function minutesFromTime(value) {
  const [hours = "0", minutes = "0"] = value.split(":")
  return Number(hours) * 60 + Number(minutes)
}

function initializeWorkSettings() {
  const form = document.querySelector("[data-work-form]")
  if (!form) return

  const salary = form.querySelector("[name='salary']")
  const start = form.querySelector("[name='work-start']")
  const lunchStart = form.querySelector("[name='lunch-start']")
  const lunchEnd = form.querySelector("[name='lunch-end']")
  const end = form.querySelector("[name='work-end']")
  const paid = document.querySelector("[data-paid-time]")
  const hourly = document.querySelector("[data-hourly-value]")
  const status = document.querySelector("[data-work-status]")

  function updatePreview() {
    const ordered = minutesFromTime(start.value) < minutesFromTime(lunchStart.value)
      && minutesFromTime(lunchStart.value) < minutesFromTime(lunchEnd.value)
      && minutesFromTime(lunchEnd.value) < minutesFromTime(end.value)
    const paidMinutes = ordered
      ? minutesFromTime(end.value) - minutesFromTime(start.value) - (minutesFromTime(lunchEnd.value) - minutesFromTime(lunchStart.value))
      : 0
    const hours = Math.floor(paidMinutes / 60)
    const minutes = paidMinutes % 60
    const salaryValue = Number(salary.value)

    paid.textContent = ordered ? `${hours}小时${minutes ? `${minutes}分` : ""}` : "时间有误"
    hourly.textContent = ordered && salaryValue > 0 ? `¥${(salaryValue / (paidMinutes / 60)).toFixed(2)}` : "—"
  }

  form.addEventListener("input", updatePreview)
  form.addEventListener("submit", (event) => event.preventDefault())
  document.querySelector("[data-save-work]")?.addEventListener("click", () => {
    const valid = paid.textContent !== "时间有误" && Number(salary.value) > 0
    status.textContent = valid ? "工作设置已保存（Mock），将从下一个工作日生效" : "请检查日薪和时间顺序"
    status.classList.toggle("error", !valid)
  })
  document.querySelector("[data-later]")?.addEventListener("click", () => {
    status.textContent = "已保留当前默认值，可稍后再设置"
    status.classList.remove("error")
  })
  updatePreview()
}

function initializeActivity() {
  const badge = document.querySelector("[data-activity-badge]")
  const title = document.querySelector("[data-activity-title]")
  const elapsed = document.querySelector("[data-activity-elapsed]")
  if (!badge || !title || !elapsed) return

  document.querySelector("[data-activity-pause]")?.addEventListener("click", (event) => {
    const paused = event.currentTarget.dataset.paused === "true"
    event.currentTarget.dataset.paused = String(!paused)
    event.currentTarget.textContent = paused ? "暂停识别" : "继续识别"
    badge.lastChild.textContent = paused ? " 专注工作 · 36分钟" : " 已暂停"
    elapsed.textContent = paused ? "36分钟" : "暂停计时"
  })
  document.querySelector("[data-activity-close]")?.addEventListener("click", () => {
    badge.lastChild.textContent = " 识别已关闭"
    title.textContent = "暂无活动"
    elapsed.textContent = "—"
  })
}

function initializeSystemLinks() {
  document.querySelectorAll("[data-system-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const status = document.querySelector(button.dataset.statusTarget)
      if (status) status.textContent = button.dataset.message || "这是 UI Mock，不会打开系统设置"
    })
  })
}

function initializeNotificationModes() {
  const modes = [...document.querySelectorAll("[data-notification-mode]")]
  modes.forEach((button) => {
    button.addEventListener("click", () => {
      modes.forEach((mode) => mode.setAttribute("aria-checked", String(mode === button)))
    })
  })
}

function initializeAccount() {
  const status = document.querySelector("[data-account-status]")
  if (!status) return

  document.querySelector("[data-copy-code]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("OT-0829")
      status.textContent = "好友码 OT-0829 已复制"
    } catch {
      status.textContent = "好友码已复制（Mock）"
    }
  })

  document.querySelectorAll("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.openDialog}`)?.showModal())
  })

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => dialog.close())
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close()
    })
  })

  document.querySelector("[data-save-profile]")?.addEventListener("click", () => {
    const dialog = document.querySelector("#profile-dialog")
    const input = dialog.querySelector("input")
    const nextName = input.value.trim()
    if (nextName) document.querySelector("[data-display-name]").textContent = nextName
    status.textContent = "资料已保存为 Mock 状态"
    dialog.close()
  })

  document.querySelectorAll("[data-account-action]").forEach((button) => {
    button.addEventListener("click", () => {
      status.textContent = button.dataset.message
      button.closest("dialog").close()
    })
  })
}

initializeWorkSettings()
initializeActivity()
initializeSystemLinks()
initializeNotificationModes()
initializeAccount()
