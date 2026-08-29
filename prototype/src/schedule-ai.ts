import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ScheduleProposal } from "./types.js";
import { solveSchedule, type ScheduleGenerationInput, type ScheduleProvider } from "./scheduler.js";

const TIMEOUT_MS = Number(process.env.NOT_SCHEDULE_AI_TIMEOUT_MS ?? 60_000);
/** 与 ai.ts 一致：只重试快速失败（瞬时 503 等），跑满生成时间才失败的不重试。 */
const FAST_FAIL_RETRY_THRESHOLD_MS = 5_000;
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RawScheduleSchema = z.object({
  orderedTaskIds: z.array(z.string().min(1)).max(100),
});

const SiliconFlowResponseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
});

const SYSTEM_PROMPT = `你是日程优先级规划器。只输出 JSON，不要 Markdown 或解释。
输出格式：{"orderedTaskIds":["任务ID-1","任务ID-2"]}。
规则：
- 只能使用输入中存在的 taskId，每个 taskId 必须且只能出现一次；
- 按最应该先执行到最后执行排序；
- 优先考虑 DDL、重要性、紧急度和认知负荷，兼顾减少上下文切换；
- 不计算具体时间，不添加新任务。
本地确定性求解器会把顺序装配成时间块，并审核 DDL、午休和工作时间硬约束。`;

/**
 * Demo 专用直连 Provider。任务数据不落云库；排程请求也不发送任务标题，
 * 只发送模型生成时间块所需的结构化约束。
 */
export class SiliconFlowScheduleProvider implements ScheduleProvider {
  async generate(input: ScheduleGenerationInput): Promise<ScheduleProposal> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const startedAt = Date.now();
      try {
        return await this.requestOnce(input);
      } catch (error) {
        lastError = error;
        const elapsedMs = Date.now() - startedAt;
        if (attempt === MAX_ATTEMPTS || elapsedMs > FAST_FAIL_RETRY_THRESHOLD_MS) throw error;
        await sleep(300 * attempt);
      }
    }
    throw lastError;
  }

  private async requestOnce(input: ScheduleGenerationInput): Promise<ScheduleProposal> {
    const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1").replace(/\/$/, "");
    const apiKey = process.env.LLM_API_KEY?.trim();
    const model = process.env.LLM_MODEL?.trim();
    if (!apiKey) throw new Error("SILICONFLOW_API_KEY_MISSING");
    if (!model) throw new Error("SILICONFLOW_MODEL_MISSING");

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          thinking_budget: 128,
          max_tokens: 1200,
          response_format: { type: "json_object" },
          messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              nowMs: input.nowMs,
              workSettings: input.settings,
              fixedEvents: (input.fixedEvents ?? []).map((event) => ({
                id: event.id,
                startAt: event.startAt,
                endAt: event.endAt,
                type: event.type,
              })),
              tasks: input.tasks
                .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.schedulingMode !== "CHILDREN")
                .filter((task) => task.estimatedDurationMs !== undefined)
                .map((task) => ({
                  taskId: task.id,
                  dueAt: task.dueAt,
                  importance: task.importance,
                  urgency: task.urgency,
                  estimatedDurationMs: task.estimatedDurationMs ?? null,
                  cognitiveLoad: task.cognitiveLoad ?? null,
                  splittability: task.splittability ?? null,
                })),
            }),
          },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("SILICONFLOW_SCHEDULE_TIMEOUT");
      }
      throw new Error("SILICONFLOW_SCHEDULE_FETCH_FAILED");
    }
    if (!response.ok) throw new Error(`SILICONFLOW_HTTP_${response.status}`);

    const envelope = SiliconFlowResponseSchema.safeParse(await response.json());
    if (!envelope.success) throw new Error("SILICONFLOW_SCHEDULE_RESPONSE_INVALID");
    let raw: unknown;
    try {
      raw = JSON.parse(envelope.data.choices[0].message.content);
    } catch {
      throw new Error("SILICONFLOW_SCHEDULE_CONTENT_NOT_JSON");
    }
    const parsed = RawScheduleSchema.safeParse(raw);
    if (!parsed.success) throw new Error("SILICONFLOW_SCHEDULE_SCHEMA_INVALID");
    const expectedTaskIds = input.tasks
      .filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.schedulingMode !== "CHILDREN")
      .filter((task) => task.estimatedDurationMs !== undefined)
      .map((task) => task.id);
    const orderedTaskIds = parsed.data.orderedTaskIds;
    if (new Set(orderedTaskIds).size !== orderedTaskIds.length
      || orderedTaskIds.length !== expectedTaskIds.length
      || expectedTaskIds.some((taskId) => !orderedTaskIds.includes(taskId))) {
      throw new Error("SILICONFLOW_SCHEDULE_TASK_SET_INVALID");
    }
    const deterministicDraft = solveSchedule(input, orderedTaskIds);
    return {
      proposalId: randomUUID(),
      blocks: deterministicDraft.blocks.filter((block) => block.type === "TASK"),
      modelVersion: envelope.data.model ?? model,
    };
  }
}
