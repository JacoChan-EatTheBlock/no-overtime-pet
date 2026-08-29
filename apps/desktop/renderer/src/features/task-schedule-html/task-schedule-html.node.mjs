import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const pages = [
  '01-task-bubble.html',
  '05-task-list.html',
  '06-ai-analysis.html',
  '07-schedule-draft.html',
  '12-clockout-confirm.html',
  '13-clockout-success.html'
]

async function loadPage(fileName) {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => {
    if (!String(error.message).includes('navigation')) throw error
  })
  const dom = await JSDOM.fromFile(join(currentDirectory, fileName), {
    runScripts: 'dangerously',
    resources: 'usable',
    url: pathToFileURL(join(currentDirectory, fileName)).href,
    virtualConsole
  })
  await new Promise((resolve) => dom.window.addEventListener('load', resolve, { once: true }))
  return dom
}

test('six standalone pages share the same HTML assets and preserve product boundaries', async () => {
  for (const page of pages) {
    const html = await readFile(join(currentDirectory, page), 'utf8')
    assert.match(html, /<link rel="stylesheet" href="styles\.css">/)
    assert.match(html, /<script src="app\.js" defer><\/script>/)
    assert.match(html, /data-screen="[^"]+"/)
    assert.doesNotMatch(html, /交给 AI 分析/)
    assert.doesNotMatch(html, /Windows|此电脑|回收站|任务栏/)
  }
})

test('task list tabs and cancellation are operable', async () => {
  const dom = await loadPage('05-task-list.html')
  const document = dom.window.document
  const completedTab = document.querySelector('[data-filter="completed"]')
  completedTab.click()
  assert.equal(document.querySelectorAll('[data-task]:not([hidden])').length, 2)
  document.querySelector('[data-action="clear-task-form"]').click()
  assert.equal(document.querySelector('[name="title"]').value, '')
  dom.window.close()
})

test('task bubble updates visible progress without a backend', async () => {
  const dom = await loadPage('01-task-bubble.html')
  const document = dom.window.document
  document.querySelector('[data-action="complete-task"]').click()
  assert.equal(document.querySelector('[data-progress-text]').textContent, '4/5')
  assert.equal(document.querySelectorAll('[data-progress] .is-complete').length, 4)
  dom.window.close()
})

test('AI suggestions support reject and restore states', async () => {
  const dom = await loadPage('06-ai-analysis.html')
  const document = dom.window.document
  document.querySelector('[data-action="reject-all"]').click()
  assert.equal(document.querySelectorAll('[data-suggestion].is-rejected').length, 7)
  document.querySelector('[data-action="reanalyse"]').click()
  assert.equal(document.querySelectorAll('[data-suggestion].is-rejected').length, 0)
  dom.window.close()
})

test('schedule commitment count follows checkbox state', async () => {
  const dom = await loadPage('07-schedule-draft.html')
  const document = dom.window.document
  const first = document.querySelector('.commitment-list input')
  first.checked = false
  first.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  assert.equal(document.querySelector('[data-commitment-count]').textContent, '4')
  dom.window.close()
})
