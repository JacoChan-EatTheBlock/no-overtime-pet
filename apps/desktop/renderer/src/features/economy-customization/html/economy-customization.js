const asset = (name) => new URL(`../assets/${name}`, import.meta.url).href

const catalog = {
  'hat-gold-overtime': {
    id: 'hat-gold-overtime',
    type: 'hat',
    name: '加班免死金牌帽',
    description: '没有免死效果，但戴着比较安心。',
    workTime: '相当于当前约 2 小时的窝囊费',
    priceMinor: 18800,
    image: asset('hat-gold-overtime.png')
  },
  'hat-weekly-ghost': {
    id: 'hat-weekly-ghost',
    type: 'hat',
    name: '周一灵魂帽',
    description: '周一到了，灵魂还没完全上线。',
    workTime: '相当于当前约 1 小时的窝囊费',
    priceMinor: 9400,
    image: asset('hat-weekly-ghost.png')
  },
  'hat-cardboard-bag': {
    id: 'hat-cardboard-bag',
    type: 'hat',
    name: '摸鱼纸袋',
    description: '纸袋挡不住进度，但能挡一挡心虚。',
    workTime: '相当于当前约 1.5 小时的窝囊费',
    priceMinor: 14100,
    image: asset('hat-cardboard-bag.png')
  },
  'hat-coffee-mug': {
    id: 'hat-coffee-mug',
    type: 'hat',
    name: '咖啡续命杯',
    description: '杯子不负责续命，只负责表达愿望。',
    workTime: '相当于当前约 48 分钟的窝囊费',
    priceMinor: 7500,
    image: asset('hat-coffee-mug.png')
  },
  'hat-clockout-headband': {
    id: 'hat-clockout-headband',
    type: 'hat',
    name: '准点跑路头带',
    description: '提醒自己，跑得快也要先保存。',
    workTime: '相当于当前约 2 小时 20 分的窝囊费',
    priceMinor: 22000,
    image: asset('hat-clockout-headband.png')
  },
  'hat-work-badge': {
    id: 'hat-work-badge',
    type: 'hat',
    name: '工牌',
    description: '工牌挂得越高，离下班就越近一点。',
    workTime: '相当于当前约 30 分钟的窝囊费',
    priceMinor: 4800,
    image: asset('hat-work-badge.png')
  },
  'character-capybara-worker': {
    id: 'character-capybara-worker',
    type: 'character',
    name: '社畜水豚角色',
    description: '默认打工搭子，情绪稳定，敲键盘很认真。',
    workTime: '默认角色，无需购买',
    priceMinor: 0,
    image: '/assets/capybara/idle.png'
  }
}

const formatMoney = (minor) => `¥${(minor / 100).toFixed(2)}`

function setupWallet() {
  const status = document.querySelector('.wallet-footer [role="status"]')
  document.querySelector('[data-action="wallet-settings"]')?.addEventListener('click', () => {
    status.textContent = '设置按钮仅演示入口状态；不会修改真实余额或账本。'
  })
  document.querySelector('[data-action="ledger-info"]')?.addEventListener('click', () => {
    status.textContent = '当前展示固定 Mock 记录；完整账本不在 HTML 演示范围。'
  })
}

function setupShop() {
  const scene = document.querySelector('[data-ui-screen="10-shop"]')
  const categoryButtons = [...document.querySelectorAll('[data-category]')]
  const itemButtons = [...document.querySelectorAll('[data-item]')]
  const detailName = document.querySelector('[data-detail-name]')
  const detailDescription = document.querySelector('[data-detail-description]')
  const detailWorkTime = document.querySelector('[data-detail-work-time]')
  const detailImage = document.querySelector('[data-detail-image]')
  const buyButton = document.querySelector('[data-action="buy"]')
  const previewButton = document.querySelector('[data-action="preview"]')
  const status = document.querySelector('.shop-status')
  const balanceLabel = document.querySelector('[data-balance]')
  const dialog = document.querySelector('.purchase-dialog')
  const dialogItem = document.querySelector('[data-dialog-item]')
  const owned = new Set(['character-capybara-worker'])
  let category = 'recommended'
  let selectedId = 'hat-gold-overtime'
  let balanceMinor = 48640

  const updateCategory = () => {
    scene.dataset.uiState = category
    categoryButtons.forEach((button) => {
      const active = button.dataset.category === category
      button.classList.toggle('active', active)
    })
    itemButtons.forEach((button) => {
      const item = catalog[button.dataset.item]
      const visible = category === 'recommended'
        || category === item.type
        || (category === 'owned' && owned.has(item.id))
      button.hidden = !visible
    })
    const selectedVisible = itemButtons.some((button) => button.dataset.item === selectedId && !button.hidden)
    if (!selectedVisible) {
      const firstVisible = itemButtons.find((button) => !button.hidden)
      if (firstVisible) selectItem(firstVisible.dataset.item)
    }
  }

  const renderSelected = () => {
    const item = catalog[selectedId]
    const isOwned = owned.has(item.id)
    itemButtons.forEach((button) => {
      const selected = button.dataset.item === selectedId
      button.classList.toggle('selected', selected)
      button.setAttribute('aria-pressed', String(selected))
      button.dataset.owned = String(owned.has(button.dataset.item))
    })
    detailName.textContent = item.name
    detailDescription.textContent = item.description
    detailWorkTime.textContent = item.workTime
    detailImage.src = item.image
    detailImage.classList.toggle('character-preview', item.type === 'character')
    buyButton.disabled = isOwned || item.priceMinor === 0
    buyButton.textContent = isOwned ? '已拥有' : `购买演示 ${formatMoney(item.priceMinor)}`
    dialogItem.textContent = item.name
  }

  function selectItem(id) {
    selectedId = id
    renderSelected()
  }

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      category = button.dataset.category
      updateCategory()
    })
  })

  itemButtons.forEach((button) => {
    button.addEventListener('click', () => selectItem(button.dataset.item))
  })

  buyButton.addEventListener('click', () => {
    if (!owned.has(selectedId)) dialog.showModal()
  })

  document.querySelector('[data-action="confirm-purchase"]')?.addEventListener('click', () => {
    const item = catalog[selectedId]
    if (!owned.has(item.id) && balanceMinor >= item.priceMinor) {
      balanceMinor -= item.priceMinor
      owned.add(item.id)
      const card = itemButtons.find((button) => button.dataset.item === item.id)
      card.querySelector('.price').textContent = '已拥有'
      card.querySelector('.price').classList.add('owned-label')
      balanceLabel.textContent = formatMoney(balanceMinor)
      status.textContent = `购买演示完成：${item.name} 已加入本页 Mock 库存，未写入真实账户。`
      dialog.close()
      renderSelected()
      updateCategory()
    }
  })

  previewButton.addEventListener('click', () => {
    status.textContent = '动作预览使用静态角色素材；真实动作 Manifest 不在本次 HTML UI 范围。'
  })

  updateCategory()
  renderSelected()
}

function setupWardrobe() {
  const defaultOrder = [
    'hat-gold-overtime',
    'hat-weekly-ghost',
    'hat-cardboard-bag',
    'hat-clockout-headband',
    'hat-coffee-mug',
    'hat-work-badge'
  ]
  let equipped = [...defaultOrder]
  let dragId = null
  const scene = document.querySelector('[data-ui-screen="11-wardrobe"]')
  const tower = document.querySelector('.hat-tower')
  const list = document.querySelector('[data-equipped-list]')
  const inventory = document.querySelector('[data-hat-inventory]')
  const cards = [...document.querySelectorAll('[data-hat]')]
  const status = document.querySelector('.wardrobe-status')
  const tabButtons = [...document.querySelectorAll('[data-tab]')]
  const characterCard = document.querySelector('[data-character-card]')

  const renderTower = () => {
    tower.replaceChildren()
    const topToBottom = [...equipped].reverse()
    topToBottom.forEach((id, index) => {
      const image = document.createElement('img')
      image.src = catalog[id].image
      image.alt = catalog[id].name
      image.style.top = `${index * 57}px`
      if (id === 'hat-work-badge') {
        image.style.width = '124px'
        image.style.height = '102px'
      }
      tower.append(image)
    })
    tower.setAttribute('aria-label', `已装备 ${equipped.length} 顶帽子`)
  }

  const renderList = () => {
    list.replaceChildren()
    const topToBottom = [...equipped].reverse()
    topToBottom.forEach((id, index) => {
      const item = catalog[id]
      const row = document.createElement('li')
      row.className = 'equipped-row'
      row.draggable = true
      row.tabIndex = 0
      row.dataset.id = id
      row.setAttribute('aria-label', `${item.name}，拖动或使用上下方向键调整顺序`)
      row.innerHTML = `<b>${equipped.length - index}</b><img src="${item.image}" alt="${item.name}"><strong>${item.name}</strong><img class="grip" src="${asset('ui-grip.png')}" alt="拖动排序">`
      row.addEventListener('dragstart', () => {
        dragId = id
        row.classList.add('dragging')
      })
      row.addEventListener('dragend', () => {
        dragId = null
        row.classList.remove('dragging')
      })
      row.addEventListener('dragover', (event) => event.preventDefault())
      row.addEventListener('drop', (event) => {
        event.preventDefault()
        if (!dragId || dragId === id) return
        const from = equipped.indexOf(dragId)
        const to = equipped.indexOf(id)
        const next = [...equipped]
        next.splice(from, 1)
        next.splice(to, 0, dragId)
        equipped = next
        status.textContent = '帽子顺序已通过拖动调整；列表仍按从下到上保存。'
        render()
      })
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const from = equipped.indexOf(id)
        const to = event.key === 'ArrowUp' ? from + 1 : from - 1
        if (to < 0 || to >= equipped.length) return
        const next = [...equipped]
        ;[next[from], next[to]] = [next[to], next[from]]
        equipped = next
        status.textContent = '帽子顺序已通过键盘调整；列表仍按从下到上保存。'
        render()
      })
      list.append(row)
    })
  }

  const renderCards = () => {
    cards.forEach((card) => {
      const active = equipped.includes(card.dataset.hat)
      card.setAttribute('aria-pressed', String(active))
      card.querySelector('span').textContent = active ? '点击移除' : '点击装备'
    })
  }

  const render = () => {
    renderTower()
    renderList()
    renderCards()
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.hat
      if (equipped.includes(id)) {
        equipped = equipped.filter((hatId) => hatId !== id)
        status.textContent = `${catalog[id].name} 已从本页叠帽预览移除。`
      } else {
        equipped = [...equipped, id]
        status.textContent = `${catalog[id].name} 已叠到最上方。`
      }
      render()
    })
  })

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab
      scene.dataset.uiState = tab
      tabButtons.forEach((candidate) => {
        const selected = candidate === button
        candidate.classList.toggle('active', selected)
        candidate.setAttribute('aria-selected', String(selected))
      })
      const characterMode = tab === 'character'
      inventory.hidden = characterMode
      characterCard.hidden = !characterMode
      tower.hidden = characterMode
      document.querySelector('#inventory-title').textContent = characterMode ? '我的角色　1' : '我的帽子　6'
      document.querySelector('#equipped-title').textContent = characterMode ? '当前角色' : '已装备 · 从下到上'
      list.hidden = characterMode
      document.querySelector('.stack-hint').hidden = characterMode
      status.textContent = characterMode ? '当前使用仓库现有社畜水豚角色素材。' : '所有操作只影响当前页面的演示状态。'
    })
  })

  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-preview]').forEach((candidate) => {
        const selected = candidate === button
        candidate.classList.toggle('active', selected)
        candidate.setAttribute('aria-pressed', String(selected))
      })
      status.textContent = `${button.textContent}预览已选中；HTML 演示使用同一仓库静态角色素材。`
    })
  })

  document.querySelector('[data-action="clear-hats"]')?.addEventListener('click', () => {
    equipped = []
    status.textContent = '已清空本页预览；真实装备未变化。'
    render()
  })

  document.querySelector('[data-action="restore-appearance"]')?.addEventListener('click', () => {
    equipped = [...defaultOrder]
    status.textContent = '已恢复本页打开时的叠帽顺序。'
    render()
  })

  document.querySelector('[data-action="save-appearance"]')?.addEventListener('click', () => {
    status.textContent = '装扮保存演示完成；未调用 appearance API，也未写入真实装备记录。'
  })

  render()
}

const page = document.body.dataset.page
if (page === 'wallet') setupWallet()
if (page === 'shop') setupShop()
if (page === 'wardrobe') setupWardrobe()
