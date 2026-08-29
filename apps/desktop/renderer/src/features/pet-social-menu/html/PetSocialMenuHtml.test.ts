import defaultPetHtml from './00-default-pet.html?raw'
import friendStripHtml from './02-friend-pet-strip.html?raw'
import friendsManagementHtml from './08-friends-management.html?raw'
import quickMenuHtml from './18-quick-menu.html?raw'
import styles from './pet-social-menu.css?raw'
import script from './pet-social-menu.js?raw'

const pages = [
  ['00-default-pet.html', defaultPetHtml],
  ['02-friend-pet-strip.html', friendStripHtml],
  ['08-friends-management.html', friendsManagementHtml],
  ['18-quick-menu.html', quickMenuHtml]
] as const

describe('pet social menu standalone HTML', () => {
  it.each(pages)('keeps %s runnable as a standalone product-only page', (_page, html) => {
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('pet-social-menu.css')
    expect(html).toContain('pet-social-menu.js')
    expect(html).toContain('data-ui-screen=')
    expect(html).not.toMatch(/Windows|任务栏|回收站|此电脑/)
  })

  it('uses source-derived original-color pet assets while preserving motion semantics for later registered GIFs', () => {
    expect(script).toContain("const PET_MOTION_ASSET_PATHS = {")
    expect(script).toContain('data-pet-motion=')
    expect(script).toContain("resolvePetMotionAssetPath(friend, 'strip')")
    expect(script).toContain("resolvePetMotionAssetPath(friend, 'avatar')")
    expect(script).toContain('assets/friends/gray-cat-desk.png')
    expect(script).toContain('assets/friends/rabbit-desk.png')
    expect(script).toContain('assets/friends/bear-desk.png')
    expect(script).toContain("IDLE: PET_ASSET")
    expect(styles).not.toMatch(/friend-pet[^}]*filter:/s)
  })

  it('models selected-friend privacy as a reversible one-way projection instead of blocking', () => {
    expect(friendsManagementHtml).toContain('不对其展示')
    expect(`${friendsManagementHtml}${script}`).not.toContain('拉黑')
    expect(script).toContain('好友关系保持不变')
    expect(script).toContain('好友关系与对方到你的展示方向均保持不变')
  })

  it('keeps local friend pets and activity broadcasting as separate controls', () => {
    expect(quickMenuHtml).toContain('data-setting="local-friend-pets"')
    expect(quickMenuHtml).toContain('data-setting="broadcast-activity"')
    expect(quickMenuHtml).toContain('在桌面显示好友桌宠')
    expect(quickMenuHtml).toContain('允许好友查看我的活动状态')
  })
})
