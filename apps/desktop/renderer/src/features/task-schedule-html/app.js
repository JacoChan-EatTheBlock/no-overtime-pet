(function () {
  'use strict'

  const root = document.querySelector('[data-screen]')
  if (!root) return

  const setStatus = (message) => {
    const target = document.querySelector('[data-status]')
    if (target) target.textContent = message
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-link]')
    if (link) window.location.href = link.dataset.link
  })

  const taskForm = document.querySelector('[data-task-form]')
  if (taskForm) {
    taskForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const data = new FormData(taskForm)
      const params = new URLSearchParams({
        title: String(data.get('title') || '').trim(),
        dueAt: String(data.get('dueAt') || ''),
        importance: String(data.get('importance') || '高')
      })
      if (!params.get('title')) return
      window.location.href = `06-ai-analysis.html?${params.toString()}`
    })

    document.querySelector('[data-action="clear-task-form"]')?.addEventListener('click', () => {
      taskForm.reset()
      const title = taskForm.querySelector('[name="title"]')
      if (title) title.value = ''
      title?.focus()
    })

    document.querySelectorAll('[data-filter]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter
        document.querySelectorAll('[data-filter]').forEach((candidate) => candidate.setAttribute('aria-selected', String(candidate === tab)))
        document.querySelectorAll('[data-task]').forEach((task) => {
          const visible = filter === 'all' || (filter === 'today' && task.dataset.today === 'true') || (filter === 'completed' && task.dataset.completed === 'true')
          task.hidden = !visible
        })
      })
    })
  }

  if (root.dataset.screen === '01-task-bubble') {
    const titles = ['整理产品评审材料', '撰写需求文档', '问题修复与优化', '整理今日工作']
    const nextTitles = ['11:10　撰写需求文档', '14:00　问题修复与优化', '16:30　整理今日工作', '可以放心准点跑路']
    let completed = Number(root.dataset.completed || 3)

    const renderProgress = () => {
      document.querySelector('[data-progress-text]').textContent = `${completed}/5`
      const progress = document.querySelector('[data-progress]')
      progress.setAttribute('aria-valuenow', String(completed))
      progress.querySelectorAll('span').forEach((segment, index) => segment.classList.toggle('is-complete', index < completed))
      const done = completed >= 5
      document.querySelector('[data-current-label]').textContent = done ? '全部完成' : '正在进行'
      document.querySelector('[data-current-task]').textContent = done ? '今日承诺已经完成' : titles[Math.max(0, Math.min(titles.length - 1, completed - 3))]
      document.querySelector('[data-current-time]').textContent = done ? '18:28' : '10:20–11:10'
      document.querySelector('[data-next-task]').textContent = nextTitles[Math.max(0, Math.min(nextTitles.length - 1, completed - 3))]
      document.querySelector('[data-clockout-distance]').textContent = done ? '2分钟' : '4小时12分'
      const completeButton = document.querySelector('[data-action="complete-task"]')
      completeButton.disabled = done
      completeButton.textContent = done ? '已经完成' : '完成这项'
    }

    document.querySelector('[data-action="complete-task"]')?.addEventListener('click', () => {
      completed = Math.min(5, completed + 1)
      renderProgress()
    })
    renderProgress()
  }

  if (root.dataset.screen === '06-ai-analysis') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('title')) document.querySelector('[data-analysis-title]').textContent = params.get('title')
    if (params.get('dueAt')) document.querySelector('[data-analysis-due]').textContent = params.get('dueAt')
    if (params.get('importance')) document.querySelector('[data-analysis-importance]').textContent = params.get('importance')

    document.querySelectorAll('[data-decision="accept"]').forEach((button) => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-suggestion]')
        row.classList.remove('is-rejected')
        button.classList.add('btn-primary')
        button.textContent = '已采用'
        setStatus('已采用该建议。')
      })
    })

    document.querySelectorAll('[data-decision="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelector('[data-inline-editor]')?.classList.add('is-visible')
        setStatus('可在上方编辑区修改建议；用户修改始终优先。')
      })
    })

    document.querySelector('[data-action="reject-all"]')?.addEventListener('click', () => {
      document.querySelectorAll('[data-suggestion]').forEach((row) => row.classList.add('is-rejected'))
      document.querySelectorAll('[data-decision="accept"]').forEach((button) => {
        button.classList.remove('btn-primary')
        button.textContent = '采用'
      })
      setStatus('已拒绝全部建议，将保留你的原始设置。')
    })

    document.querySelector('[data-action="reanalyse"]')?.addEventListener('click', () => {
      document.querySelectorAll('[data-suggestion]').forEach((row) => row.classList.remove('is-rejected'))
      document.querySelectorAll('[data-decision="accept"]').forEach((button) => {
        button.classList.add('btn-primary')
        button.textContent = '已采用'
      })
      document.querySelector('[data-inline-editor]')?.classList.remove('is-visible')
      setStatus('已重新载入固定的 Mock 分析建议。')
    })
  }

  if (root.dataset.screen === '07-schedule-draft') {
    let dragged = null
    document.querySelectorAll('[data-block][draggable="true"]').forEach((block) => {
      block.addEventListener('dragstart', () => {
        dragged = block
        block.classList.add('is-dragging')
      })
      block.addEventListener('dragend', () => {
        block.classList.remove('is-dragging')
        dragged = null
      })
      block.addEventListener('dragover', (event) => event.preventDefault())
      block.addEventListener('drop', (event) => {
        event.preventDefault()
        if (!dragged || dragged === block || dragged.dataset.locked === 'true' || block.dataset.locked === 'true') return
        block.before(dragged)
        setStatus('已按你的顺序调整草案。')
      })
    })

    document.querySelectorAll('[data-action="toggle-lock"]').forEach((button) => {
      button.addEventListener('click', () => {
        const block = button.closest('[data-block]')
        const locked = block.dataset.locked !== 'true'
        block.dataset.locked = String(locked)
        block.draggable = !locked
        const icon = button.querySelector('.icon')
        icon.classList.toggle('i-lock', locked)
        icon.classList.toggle('i-lock-open', !locked)
        button.querySelector('span:last-child').textContent = locked ? '已锁定' : '锁定'
        setStatus(locked ? '该时间块已锁定，后续重排不会移动。' : '该时间块已解锁。')
      })
    })

    document.querySelectorAll('[data-action="adjust-duration"]').forEach((button) => {
      button.addEventListener('click', () => setStatus('已把该时间块增加 10 分钟；这是本地 Mock 草案。'))
    })

    const updateCommitmentCount = () => {
      const count = document.querySelectorAll('.commitment-list input:checked').length
      document.querySelector('[data-commitment-count]').textContent = String(count)
    }
    document.querySelectorAll('.commitment-list input').forEach((input) => input.addEventListener('change', updateCommitmentCount))
    document.querySelector('[data-action="regenerate"]')?.addEventListener('click', () => setStatus('已基于固定 Mock 数据重新生成，锁定块保持不变。'))
  }

  document.querySelector('[data-action="adjust-commitment"]')?.addEventListener('click', () => setStatus('这是 Mock 入口：正式接入时需要记录取消原因和资格影响。'))
  document.querySelector('[data-action="view-record"]')?.addEventListener('click', () => setStatus('今日记录预览已打开；当前页面不连接真实服务端数据。'))
})()
