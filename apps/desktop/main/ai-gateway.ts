/**
 * 主进程 AI 网关。
 *
 * 渲染进程开着 contextIsolation + sandbox，拿不到 Node，也不该拿到 LLM_API_KEY。
 * 所以模型调用全部收在主进程：渲染进程只通过 preload 暴露的 IPC 递结构化参数，
 * 密钥、供应商地址和响应原文都不进渲染进程。
 *
 * 校验沿用 prototype/src/web-server.ts 的同一套 zod 契约：即便渲染进程被注入，
 * 也只能按这个形状调用，无法把任意内容塞给模型。
 */
import { join } from 'node:path'
import { z } from 'zod'
import { analyzeTask } from '../shared/domain/ai.js'
import { generateScheduleDraft } from '../shared/domain/scheduler.js'
import { SiliconFlowScheduleProvider } from '../shared/domain/schedule-ai.js'
import type { Task } from '../shared/domain/types.js'

/** 从仓库根 .env 读取 LLM_API_KEY / LLM_BASE_URL。缺失不报错——逻辑层会自动降级到确定性基线。 */
export function loadEnv(appRoot: string): void {
  for (const candidate of [join(appRoot, '.env'), join(process.cwd(), '.env')]) {
    try {
      process.loadEnvFile(candidate)
      return
    } catch {
      // 文件不存在或不可读：继续试下一个，最终没有也能跑。
    }
  }
}

const CalibrationSampleSchema = z.object({
  category: z.enum([
    'WRITING', 'CODING', 'DESIGN', 'RESEARCH', 'COMMUNICATION',
    'MEETING', 'ADMIN', 'REVIEW', 'LEARNING', 'OTHER'
  ]),
  estimatedMs: z.number().positive().finite(),
  actualMs: z.number().positive().finite(),
  source: z.enum(['EXPLICIT_TIMER', 'USER_CONFIRMED', 'SYSTEM_INFERRED']),
  confidence: z.number().min(0).max(1).optional(),
  recordedAt: z.number().finite().optional()
})

const AnalyzeRequestSchema = z.object({
  taskId: z.union([z.string(), z.number()]).transform(String),
  title: z.string().trim().min(1).max(120),
  dueAt: z.number().finite(),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  taskRevision: z.number().int().positive().optional(),
  history: z.array(CalibrationSampleSchema).max(200).optional()
})

const ScheduleRequestSchema = z.object({
  nowMs: z.number().finite(),
  settings: z.object({
    workStart: z.string().regex(/^\d{2}:\d{2}$/),
    lunchStart: z.string().regex(/^\d{2}:\d{2}$/),
    lunchEnd: z.string().regex(/^\d{2}:\d{2}$/),
    workEnd: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  tasks: z.array(z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    dueAt: z.number().finite(),
    importance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    status: z.enum(['BACKLOG', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    urgency: z.enum(['NOT_URGENT', 'UPCOMING', 'URGENT', 'OVERDUE']),
    estimatedDurationMs: z.number().positive().finite().optional(),
    cognitiveLoad: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    splittability: z.enum(['ATOMIC', 'SPLITTABLE', 'REQUIRES_REVIEW']).optional(),
    schedulingMode: z.enum(['DIRECT', 'CHILDREN']).optional()
  })).max(100)
})

export type AnalyzeRequest = z.input<typeof AnalyzeRequestSchema>
export type ScheduleRequest = z.input<typeof ScheduleRequestSchema>

export function aiStatus(): { taskAi: boolean; scheduleAi: boolean } {
  const configured = Boolean(process.env.LLM_API_KEY?.trim())
  return { taskAi: configured, scheduleAi: configured }
}

export async function handleAnalyzeTask(payload: unknown) {
  const parsed = AnalyzeRequestSchema.safeParse(payload)
  if (!parsed.success) throw new Error('TASK_ANALYSIS_REQUEST_INVALID')

  return analyzeTask(
    parsed.data.taskId,
    { title: parsed.data.title, dueAt: parsed.data.dueAt, importance: parsed.data.importance },
    parsed.data.history ?? [],
    Date.now(),
    parsed.data.taskRevision ?? 1
  )
}

export async function handleGenerateSchedule(payload: unknown) {
  const parsed = ScheduleRequestSchema.safeParse(payload)
  if (!parsed.success) throw new Error('SCHEDULE_REQUEST_INVALID')

  // 任务标题不出本机：排程只需要结构化约束，供应商拿不到用户写了什么。
  const tasks: Task[] = parsed.data.tasks.map((task) => ({
    ...task,
    title: '[LOCAL_TASK]',
    revision: 1,
    fieldOrigins: {}
  }))

  return generateScheduleDraft(
    { tasks, settings: parsed.data.settings, nowMs: parsed.data.nowMs },
    new SiliconFlowScheduleProvider()
  )
}
