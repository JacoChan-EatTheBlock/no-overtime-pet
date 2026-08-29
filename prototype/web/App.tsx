import { useEngine, type Screen } from './adapter/useEngine'
import { TaskScheduleFlow } from './ui/features/task-schedule/TaskScheduleFlow'
import './devbar.css'

const SCREENS: Array<[Screen, string]> = [
  ['01-task-bubble', '01 任务气泡'],
  ['05-task-list', '05 待办列表'],
  ['06-ai-analysis', '06 AI 建议'],
  ['07-schedule-draft', '07 安排草案'],
  ['12-clockout-confirm', '12 跑路确认'],
  ['13-clockout-success', '13 跑路结果']
]

export function App() {
  const engine = useEngine('05-task-list')

  return (
    <>
      <TaskScheduleFlow engine={engine} />
      <nav className="devbar" aria-label="演示画面切换">
        {SCREENS.map(([screen, label]) => (
          <button
            key={screen}
            type="button"
            aria-current={engine.screen === screen}
            disabled={screen === '06-ai-analysis' && !engine.proposal}
            onClick={() => engine.navigate(screen)}
          >
            {label}
          </button>
        ))}
        <span className="devbar-meta">
          {engine.scheduleSource === 'AI' ? 'AI 排程' : '确定性排程'}
          {engine.busy ? ' · 请求中' : ''}
        </span>
      </nav>
    </>
  )
}
