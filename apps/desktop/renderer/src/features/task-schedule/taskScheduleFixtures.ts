export type TaskScheduleScreen =
  | '01-task-bubble'
  | '05-task-list'
  | '06-ai-analysis'
  | '07-schedule-draft'
  | '12-clockout-confirm'
  | '13-clockout-success'

export type Importance = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface TaskItem {
  id: string
  title: string
  time: string
  urgencyLabel: string
  urgency: 'urgent' | 'upcoming' | 'normal'
  completed: boolean
}

export interface ScheduleBlock {
  id: string
  taskId?: string
  time: string
  title: string
  kind: 'task' | 'break'
  locked: boolean
  durationMinutes: number
}

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-review',
    title: '整理产品评审材料',
    time: '10:20 – 11:10',
    urgencyLabel: '紧急',
    urgency: 'urgent',
    completed: true
  },
  {
    id: 'task-requirements',
    title: '撰写需求文档',
    time: '11:10 – 12:10',
    urgencyLabel: '即将到期',
    urgency: 'upcoming',
    completed: true
  },
  {
    id: 'task-email',
    title: '回复客户邮件',
    time: '14:00 – 14:30',
    urgencyLabel: '不紧急',
    urgency: 'normal',
    completed: true
  },
  {
    id: 'task-meeting',
    title: '准备周一例会',
    time: '15:00 – 16:00',
    urgencyLabel: '不紧急',
    urgency: 'normal',
    completed: false
  },
  {
    id: 'task-schedule',
    title: '更新项目排期',
    time: '16:30 – 17:30',
    urgencyLabel: '不紧急',
    urgency: 'normal',
    completed: false
  }
]

export const INITIAL_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  {
    id: 'block-email',
    taskId: 'task-email',
    time: '09:00–10:20',
    title: '查收邮件与消息',
    kind: 'task',
    locked: false,
    durationMinutes: 80
  },
  {
    id: 'block-review',
    taskId: 'task-review',
    time: '10:20–11:10',
    title: '整理产品评审材料',
    kind: 'task',
    locked: false,
    durationMinutes: 50
  },
  {
    id: 'block-requirements',
    taskId: 'task-requirements',
    time: '11:10–12:00',
    title: '撰写需求文档',
    kind: 'task',
    locked: false,
    durationMinutes: 50
  },
  {
    id: 'block-lunch',
    time: '12:00–13:00',
    title: '午休',
    kind: 'break',
    locked: true,
    durationMinutes: 60
  },
  {
    id: 'block-development',
    taskId: 'task-development',
    time: '13:00–15:00',
    title: '开发与自测',
    kind: 'task',
    locked: false,
    durationMinutes: 120
  },
  {
    id: 'block-fix',
    taskId: 'task-fix',
    time: '15:00–16:30',
    title: '问题修复与优化',
    kind: 'task',
    locked: false,
    durationMinutes: 90
  },
  {
    id: 'block-wrap',
    taskId: 'task-wrap',
    time: '16:30–18:10',
    title: '整理今日工作',
    kind: 'task',
    locked: false,
    durationMinutes: 100
  }
]

export const COMMITMENT_TITLES = [
  '查收邮件与消息',
  '整理产品评审材料',
  '撰写需求文档',
  '开发与自测',
  '问题修复与优化'
]

export const DEFAULT_ANALYSIS = {
  category: '文档与评审',
  durationMinutes: 50,
  durationRange: '40–70分钟',
  cognitiveLoad: '中',
  splittability: '可拆分',
  confidence: '中',
  subtasks: [
    { id: 'subtask-feedback', title: '整理反馈', durationMinutes: 15 },
    { id: 'subtask-revision', title: '合并修改', durationMinutes: 25 },
    { id: 'subtask-review', title: '最终检查', durationMinutes: 10 }
  ]
}
