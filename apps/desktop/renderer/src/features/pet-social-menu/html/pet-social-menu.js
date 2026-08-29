(function () {
  'use strict'

  const PET_ASSET = '../../../../public/assets/capybara/idle.png'
  const PET_MOTION_ASSET_PATHS = {
    IDLE: PET_ASSET,
  }

  function resolvePetMotionAssetPath(friend, presentation) {
    const registeredMotion = PET_MOTION_ASSET_PATHS[`${friend.id}:${friend.motion}`]
    const staticAsset = presentation === 'avatar' ? friend.avatarAsset : friend.stripAsset
    return registeredMotion || staticAsset || PET_MOTION_ASSET_PATHS[friend.motion] || PET_ASSET
  }

  const friends = [
    { id: 'me', name: '我', status: '工作中', statusClass: 'working', motion: 'WORKING', stripAsset: PET_ASSET, avatarAsset: 'assets/friends/self-capybara.png' },
    { id: 'ash', name: '小灰', status: '开会中', statusClass: 'meeting', motion: 'MEETING', stripAsset: 'assets/friends/gray-cat-desk.png', avatarAsset: 'assets/friends/gray-cat.png' },
    { id: 'rabbit', name: '兔兔', status: '短暂出逃', statusClass: 'slacking', motion: 'SLACKING', stripAsset: 'assets/friends/rabbit-desk.png', avatarAsset: 'assets/friends/rabbit.png' },
    { id: 'bear', name: '熊仔', status: '离开', statusClass: 'away', motion: 'AWAY', stripAsset: 'assets/friends/bear-desk.png', avatarAsset: 'assets/friends/bear.png' },
    { id: 'gray', name: '柴柴', status: '已跑路', statusClass: 'clocked-out', motion: 'CLOCKED_OUT', stripAsset: 'assets/friends/gray-cat-desk.png', avatarAsset: 'assets/friends/shiba.png' },
    { id: 'pudding', name: '布丁', status: '离线', statusClass: 'offline', motion: 'OFFLINE', avatarAsset: 'assets/friends/cream-cat.png' },
    { id: 'penguin', name: '企鹅', status: '离线', statusClass: 'offline', motion: 'OFFLINE', avatarAsset: 'assets/friends/penguin.png' },
    { id: 'fox', name: '阿狐', status: '离线', statusClass: 'offline', motion: 'OFFLINE', avatarAsset: 'assets/friends/fox.png' },
    { id: 'mango', name: '芒果', status: '工作中', statusClass: 'working', motion: 'WORKING' },
    { id: 'coffee', name: '咖啡', status: '开会中', statusClass: 'meeting', motion: 'MEETING' },
    { id: 'rice', name: '米粒', status: '离开', statusClass: 'away', motion: 'AWAY' },
    { id: 'taro', name: '芋头', status: '已跑路', statusClass: 'clocked-out', motion: 'CLOCKED_OUT' },
  ]

  function icon(name) {
    return `<img class="icon" src="icons/${name}.svg" alt="" />`
  }

  function setFeedback(message) {
    const feedback = document.querySelector('[data-feedback]')
    if (feedback) feedback.textContent = message
  }

  function initDefaultPet() {
    const petButton = document.querySelector('[data-toggle-pet]')
    if (!petButton) return

    petButton.addEventListener('click', function () {
      const selected = petButton.getAttribute('aria-pressed') !== 'true'
      petButton.setAttribute('aria-pressed', String(selected))
      document.querySelector('.stage')?.setAttribute('data-state', selected ? 'pet-selected' : 'idle')
    })
  }

  function initFriendStrip() {
    const seats = document.querySelector('[data-friend-seats]')
    const previous = document.querySelector('[data-pager-prev]')
    const next = document.querySelector('[data-pager-next]')
    const label = document.querySelector('[data-pager-label]')
    if (!seats || !previous || !next || !label) return

    let page = 0
    const pageSize = 5
    const pageCount = Math.ceil(friends.length / pageSize)

    function render() {
      const start = page * pageSize
      const visibleFriends = friends.slice(start, start + pageSize)
      seats.innerHTML = visibleFriends
        .map(
          (friend) => `
            <article class="friend-seat" data-motion="${friend.motion}">
              <img class="friend-pet pixel-art" src="${resolvePetMotionAssetPath(friend, 'strip')}" alt="${friend.name}的像素桌宠" data-pet-motion="${friend.motion}" />
              <strong>${friend.id === 'me' ? '我 · ' : ''}${friend.status}</strong>
            </article>`,
        )
        .join('')

      previous.disabled = page === 0
      next.disabled = page === pageCount - 1
      label.textContent = `好友 ${start + 1}–${start + visibleFriends.length}/${friends.length}`
      document.querySelector('.stage')?.setAttribute('data-state', `page-${page + 1}`)
    }

    previous.addEventListener('click', function () {
      page = Math.max(0, page - 1)
      render()
    })

    next.addEventListener('click', function () {
      page = Math.min(pageCount - 1, page + 1)
      render()
    })

    render()
  }

  function initFriendsManagement() {
    const list = document.querySelector('[data-friend-list]')
    const projectionButton = document.querySelector('[data-toggle-projection]')
    const selectedCopy = document.querySelector('[data-selected-copy]')
    const stage = document.querySelector('.stage')
    if (!list || !projectionButton || !selectedCopy || !stage) return

    const visibleFriends = friends.slice(0, 8)
    const projection = Object.fromEntries(visibleFriends.map((friend) => [friend.id, true]))
    let selectedId = 'ash'
    let openMenuId = null

    function selectedFriend() {
      return visibleFriends.find((friend) => friend.id === selectedId) || visibleFriends[1]
    }

    function renderList() {
      list.innerHTML = visibleFriends
        .map((friend) => {
          const selected = friend.id === selectedId
          const hidden = !projection[friend.id]
          const statusMarkup = hidden
            ? `<span class="hidden-projection-label">${icon('eye-off')}不对其展示</span>`
            : `<span class="status-label status-${friend.statusClass}"><span class="status-dot"></span>${friend.status}</span>`
          const menuMarkup = friend.id === 'me'
            ? ''
            : `<button class="row-menu-button" type="button" aria-label="${friend.name}的更多操作" aria-expanded="${openMenuId === friend.id}" data-row-menu-trigger="${friend.id}">
                <span class="row-menu-trigger-icon">${icon('dots')}</span>${icon('chevron-down')}
              </button>
              <div class="pixel-frame row-menu${openMenuId === friend.id ? ' open' : ''}" data-row-menu="${friend.id}">
                <div class="pixel-inner">
                <button type="button" data-row-projection="${friend.id}">${hidden ? '恢复对其展示' : '不对其展示'}</button>
                  <button type="button" data-row-delete="${friend.id}">删除好友</button>
                </div>
              </div>`

          return `<article class="friend-row${selected ? ' selected' : ''}" data-friend-id="${friend.id}">
            <button class="friend-identity" type="button" data-select-friend="${friend.id}"${friend.id === 'me' ? ' aria-disabled="true"' : ''}>
              <img class="pixel-art" src="${resolvePetMotionAssetPath(friend, 'avatar')}" alt="${friend.name}的像素桌宠" data-pet-motion="${friend.motion}" />
              <strong>${friend.name}</strong>
            </button>
            ${statusMarkup}
            ${menuMarkup}
          </article>`
        })
        .join('')

      list.querySelectorAll('[data-select-friend]').forEach(function (button) {
        button.addEventListener('click', function () {
          const friendId = button.getAttribute('data-select-friend')
          if (friendId === 'me') return
          selectedId = friendId
          openMenuId = null
          render()
        })
      })

      list.querySelectorAll('[data-row-menu-trigger]').forEach(function (button) {
        button.addEventListener('click', function () {
          const friendId = button.getAttribute('data-row-menu-trigger')
          openMenuId = openMenuId === friendId ? null : friendId
          selectedId = friendId
          render()
        })
      })

      list.querySelectorAll('[data-row-projection]').forEach(function (button) {
        button.addEventListener('click', function () {
          selectedId = button.getAttribute('data-row-projection')
          projection[selectedId] = !projection[selectedId]
          openMenuId = null
          setFeedback(projection[selectedId] ? '已恢复向该好友展示桌宠。' : '已停止向该好友展示桌宠，好友关系保持不变。')
          render()
        })
      })

      list.querySelectorAll('[data-row-delete]').forEach(function (button) {
        button.addEventListener('click', function () {
          const friend = visibleFriends.find((item) => item.id === button.getAttribute('data-row-delete'))
          openMenuId = null
          setFeedback(`删除${friend.name}仅作 mock 操作演示，当前好友列表保持不变。`)
          render()
        })
      })
    }

    function renderSelected() {
      const friend = selectedFriend()
      const isSelf = friend.id === 'me'
      const isVisible = projection[friend.id]
      selectedCopy.textContent = isSelf
        ? '这是你自己的桌宠。'
        : isVisible
          ? `${friend.name}当前可以看到你的桌宠和活动状态。好友关系与对方到你的展示方向均保持不变。`
          : `${friend.name}当前不可以看到你的桌宠和活动状态。好友关系与对方到你的展示方向均保持不变。`
      projectionButton.disabled = isSelf
      projectionButton.querySelector('span').textContent = isVisible ? '不对其展示' : '恢复对其展示'
      stage.setAttribute('data-state', isVisible ? 'sharing-selected' : 'hidden-from-selected')
    }

    function render() {
      renderList()
      renderSelected()
    }

    projectionButton.addEventListener('click', function () {
      if (selectedId === 'me') return
      projection[selectedId] = !projection[selectedId]
      setFeedback(projection[selectedId] ? '已恢复向该好友展示桌宠。' : '已停止向该好友展示桌宠，好友关系保持不变。')
      render()
    })

    document.querySelector('[data-delete-friend]')?.addEventListener('click', function () {
      setFeedback(`删除${selectedFriend().name}仅作 mock 操作演示，当前好友列表保持不变。`)
    })

    document.querySelector('[data-add-friend-form]')?.addEventListener('submit', function (event) {
      event.preventDefault()
      const form = event.currentTarget
      const input = form.querySelector('input')
      const value = input.value.trim()
      setFeedback(value ? `已向 ${value} 发送 mock 好友申请。` : '请先输入好友码。')
      if (value) input.value = ''
    })

    document.querySelector('[data-copy-code]')?.addEventListener('click', async function () {
      try {
        if (navigator.clipboard) await navigator.clipboard.writeText('C7P4-K8M2')
      } catch (_) {
        // 纯 HTML mock 在 file:// 环境下可能没有剪贴板权限，视觉反馈仍保持一致。
      }
      setFeedback('好友码已复制。')
    })

    document.querySelector('[data-request-list]')?.addEventListener('click', function (event) {
      const actionButton = event.target.closest('[data-request-action]')
      if (!actionButton) return
      const row = actionButton.closest('[data-request-id]')
      const name = row.querySelector('strong').textContent
      const accepted = actionButton.getAttribute('data-request-action') === 'accept'
      row.remove()
      const remaining = document.querySelectorAll('[data-request-id]').length
      document.querySelector('[data-request-count]').textContent = String(remaining)
      if (remaining === 0) document.querySelector('[data-request-list]').innerHTML = '<p class="empty-requests">暂时没有新的好友申请。</p>'
      setFeedback(accepted ? `已同意${name}的好友申请。` : `已忽略${name}的好友申请。`)
    })

    document.querySelector('[data-close-window]')?.addEventListener('click', function () {
      setFeedback('HTML 预览中保留窗口，关闭动作仅作状态演示。')
    })

    render()
  }

  function initQuickMenu() {
    const stage = document.querySelector('.stage')
    const visibilityToggle = document.querySelector('[data-toggle-visibility-menu]')
    const visibilityMenu = document.querySelector('[data-visibility-menu]')
    if (!stage || !visibilityToggle || !visibilityMenu) return

    visibilityToggle.addEventListener('click', function () {
      const expanded = visibilityToggle.getAttribute('aria-expanded') === 'true'
      visibilityToggle.setAttribute('aria-expanded', String(!expanded))
      visibilityMenu.classList.toggle('hidden', expanded)
      stage.setAttribute('data-state', expanded ? 'menu-open' : 'visibility-open')
    })

    const petButton = document.querySelector('[data-toggle-pet]')
    petButton?.addEventListener('click', function () {
      const hidden = petButton.getAttribute('aria-pressed') !== 'true'
      petButton.setAttribute('aria-pressed', String(hidden))
      petButton.querySelector('[data-pet-visibility-label]').textContent = hidden ? '显示桌宠' : '隐藏桌宠'
      petButton.querySelector('[data-pet-visibility-icon]').setAttribute('src', hidden ? 'icons/eye.svg' : 'icons/eye-off.svg')
      document.querySelector('.quick-menu-pet')?.classList.toggle('hidden', hidden)
      document.querySelector('[data-task-bubble]')?.classList.toggle('hidden', hidden)
      stage.setAttribute('data-state', hidden ? 'pet-hidden' : 'visibility-open')
    })

    const muteButton = document.querySelector('[data-mute-notifications]')
    muteButton?.addEventListener('click', function () {
      const label = muteButton.querySelector('[data-mute-label]')
      label.textContent = label.textContent === '关闭' ? '1小时' : '关闭'
      stage.setAttribute('data-notifications', label.textContent === '关闭' ? 'on' : 'muted')
    })

    document.querySelectorAll('[data-setting]').forEach(function (checkbox) {
      checkbox.addEventListener('change', function () {
        const localFriendPets = document.querySelector('[data-setting="local-friend-pets"]').checked
        const broadcastActivity = document.querySelector('[data-setting="broadcast-activity"]').checked
        stage.setAttribute('data-local-friend-pets', String(localFriendPets))
        stage.setAttribute('data-broadcast-activity', String(broadcastActivity))
      })
    })

    document.querySelectorAll('[data-menu-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        stage.setAttribute('data-last-action', button.getAttribute('data-menu-action'))
      })
    })
  }

  const page = document.body.getAttribute('data-page')
  if (page === '00-default-pet') initDefaultPet()
  if (page === '02-friend-pet-strip') initFriendStrip()
  if (page === '08-friends-management') initFriendsManagement()
  if (page === '18-quick-menu') initQuickMenu()
})()
