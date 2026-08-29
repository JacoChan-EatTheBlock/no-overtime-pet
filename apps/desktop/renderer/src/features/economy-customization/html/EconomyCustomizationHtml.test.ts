import walletHtml from './09-wallet.html?raw'
import shopHtml from './10-shop.html?raw'
import wardrobeHtml from './11-wardrobe.html?raw'
import styles from './economy-customization.css?raw'
import behavior from './economy-customization.js?raw'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('economy and customization standalone HTML screens', () => {
  it('exposes three independent pages with stable screen identifiers', () => {
    const wallet = parse(walletHtml)
    const shop = parse(shopHtml)
    const wardrobe = parse(wardrobeHtml)

    expect(wallet.querySelector('[data-ui-screen="09-wallet"]')).not.toBeNull()
    expect(shop.querySelector('[data-ui-screen="10-shop"]')).not.toBeNull()
    expect(wardrobe.querySelector('[data-ui-screen="11-wardrobe"]')).not.toBeNull()

    for (const page of [wallet, shop, wardrobe]) {
      expect(page.querySelector('link[href="./economy-customization.css"]')).not.toBeNull()
      expect(page.querySelector('script[src="./economy-customization.js"]')).not.toBeNull()
      expect(page.body.textContent).toMatch(/UI MOCK/)
    }
  })

  it('keeps the reference viewport window dimensions and warm pixel surfaces', () => {
    expect(styles).toContain('.wallet-window')
    expect(styles).toContain('width: 1020px')
    expect(styles).toContain('height: 916px')
    expect(styles).toContain('width: 1170px')
    expect(styles).toContain('height: 760px')
    expect(styles).toContain('width: 1222px')
    expect(styles).toContain('height: 802px')
    expect(styles).toContain('--surface-soft: #fdf1dd')
    expect(styles).not.toMatch(/linear-gradient|radial-gradient|border-radius/)
  })

  it('uses repository image assets instead of placeholders or inline drawings', () => {
    const combined = `${walletHtml}\n${shopHtml}\n${wardrobeHtml}`
    const document = parse(combined)

    expect(combined).not.toMatch(/<svg|placeholder|emoji/i)
    expect(combined).toContain('/assets/capybara/idle.png')
    expect(combined).toContain('../assets/hat-gold-overtime.png')
    expect(combined).toContain('../assets/ui-wallet-title-icon.png')
    expect(combined).toContain('../assets/ui-shop-title-icon.png')
    expect(combined).toContain('../assets/ui-wardrobe-title-icon.png')
    expect(document.querySelectorAll('img').length).toBeGreaterThan(20)
  })

  it('implements only local mock purchase and wardrobe state', () => {
    expect(behavior).toContain('dialog.showModal()')
    expect(behavior).toContain('owned.add(item.id)')
    expect(behavior).toContain('equipped = []')
    expect(behavior).toContain('未写入真实账户')
    expect(behavior).toContain('未调用 appearance API')
    expect(behavior).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/)
  })
})
