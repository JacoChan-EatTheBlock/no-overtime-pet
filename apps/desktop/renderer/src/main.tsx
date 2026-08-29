import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { PetOverlay } from './features/pet-overlay/PetOverlay'
import './styles/tokens.css'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Renderer root element was not found')
}

// 主窗口和桌宠悬浮窗共用同一份渲染产物（同一个 app://bundle/index.html），
// 靠 ?window=pet 这个 query 区分——避免为悬浮窗单独加一个 electron-vite 构建入口。
const isPetWindow = new URLSearchParams(window.location.search).get('window') === 'pet'

if (isPetWindow) {
  // global.css 里 body 的不透明背景是给主窗口用的。BrowserWindow 的 transparent:true
  // 只管窗口本身，文档自己的背景色不透明的话照样会把桌面盖住——这里要单独清掉。
  document.documentElement.style.background = 'transparent'
  document.body.style.background = 'transparent'
}

createRoot(root).render(
  <StrictMode>{isPetWindow ? <PetOverlay /> : <App />}</StrictMode>
)
