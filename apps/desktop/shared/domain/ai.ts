import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { TaskAnalysisProposal, UserTaskInput } from "./types.js";
import { validateProposal } from "./validator.js";
import { baselineProposal, ANALYSIS_POLICY_VERSION } from "./baseline.js";
import { personalMultiplier, type CalibrationSample } from "./calibration.js";
import { CATALOG_VERSION } from "./catalog.js";
import { taskInputHash } from "./proposal.js";

const MODEL = process.env.NOT_AI_MODEL ?? "claude-opus-5";
const TIMEOUT_MS = Number(process.env.NOT_AI_TIMEOUT_MS ?? 60_000);
/** 实测 SiliconFlow 偶发瞬时 503，多在 <2s 内失败；重试即可恢复。
 *  真正跑满生成时间才失败（超时/内容异常）不重试——再等一次赢面很小，直接降级基线更快。 */
const FAST_FAIL_RETRY_THRESHOLD_MS = 5_000;
const MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ProposalSchema = z.object({
  category: z.enum(["WRITING", "CODING", "DESIGN", "RESEARCH", "COMMUNICATION", "MEETING", "ADMIN", "REVIEW", "LEARNING", "OTHER"]),
  estimatedMinutes: z.number().int().min(5).max(2400),
  estimateLowMinutes: z.number().int().min(5).max(2400),
  estimateHighMinutes: z.number().int().min(5).max(2400),
  cognitiveLoad: z.enum(["LOW", "MEDIUM", "HIGH"]),
  splittability: z.enum(["ATOMIC", "SPLITTABLE", "REQUIRES_REVIEW"]),
  suggestedSubtasks: z.array(z.object({
    title: z.string(),
    estimatedMinutes: z.number().int().min(5),
  })).max(6),
  confidence: z.number().min(0).max(1),
  rationaleCodes: z.array(z.enum(["SIMILAR_TASK_MEDIAN", "DEADLINE_TIGHT", "TITLE_SEMANTICS", "CATEGORY_TYPICAL_DURATION", "USER_OVERRIDE_PRESERVED"])),
});

const SYSTEM_PROMPT = `你是任务分析器。根据任务标题估计完成该任务客观需要的时间，并输出任务类型、预计时长（分钟）、认知负荷、可拆分性和可选的子任务拆分建议。
规则：
- DDL 和重要性只用于风险提示和拆分建议，不得为了迎合 DDL 压缩客观预计时长；
- 时长估计给出单点和区间，样本不足时区间放宽；
- 只从给定枚举中取值；
- 子任务最多 6 个，时长之和应接近主任务估计；
- 不臆造用户没提供的上下文；标题信息不足时倾向 OTHER + 低置信度。`;

const SILICONFLOW_SYSTEM_PROMPT = `${SYSTEM_PROMPT}
只输出一个 JSON 对象，不要 Markdown 代码块或额外解释。字段必须严格为：
{
  "category": "WRITING|CODING|DESIGN|RESEARCH|COMMUNICATION|MEETING|ADMIN|REVIEW|LEARNING|OTHER",
  "estimatedMinutes": 60,
  "estimateLowMinutes": 40,
  "estimateHighMinutes": 90,
  "cognitiveLoad": "LOW|MEDIUM|HIGH",
  "splittability": "ATOMIC|SPLITTABLE|REQUIRES_REVIEW",
  "suggestedSubtasks": [{ "title": "子任务", "estimatedMinutes": 30 }],
  "confidence": 0.7,
  "rationaleCodes": ["TITLE_SEMANTICS"]
}
rationaleCodes 只允许 SIMILAR_TASK_MEDIAN、DEADLINE_TIGHT、TITLE_SEMANTICS、CATEGORY_TYPICAL_DURATION、USER_OVERRIDE_PRESERVED。
没有合理子任务时 suggestedSubtasks 返回空数组。`;

const SiliconFlowResponseSchema = z.object({
  model: z.string().optional(),
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
});

export interface AnalyzeResult {
  proposal: TaskAnalysisProposal;
  source: "AI" | "BASELINE";
  fallbackReason?: string;
}

export type ProviderProposal = Pick<
  TaskAnalysisProposal,
  "category" | "estimatedDurationMs" | "estimateRangeMs" | "cognitiveLoad" | "splittability" | "suggestedSubtasks" | "confidence" | "rationaleCodes" | "warnings" | "modelVersion"
>;

/** SiliconFlow 接入时实现这个边界；业务流程不依赖具体模型供应商。 */
export interface TaskAnalysisProvider {
  analyze(input: {
    task: UserTaskInput;
    history: CalibrationSample[];
    nowMs: number;
  }): Promise<ProviderProposal>;
}

/** 原型直连 SiliconFlow；正式客户端不得持有此 Key，应改由服务端代理。 */
export class SiliconFlowTaskAnalysisProvider implements TaskAnalysisProvider {
  async analyze(input: { task: UserTaskInput; history: CalibrationSample[]; nowMs: number }): Promise<ProviderProposal> {
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

  private async requestOnce(input: { task: UserTaskInput; history: CalibrationSample[]; nowMs: number }): Promise<ProviderProposal> {
    const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1").replace(/\/$/, "");
    const apiKey = process.env.LLM_API_KEY?.trim();
    const model = process.env.LLM_MODEL?.trim();
    if (!apiKey) throw new Error("SILICONFLOW_API_KEY_MISSING");
    if (!model) throw new Error("SILICONFLOW_MODEL_MISSING");

    // 个人速度不作为提示词交给模型自行套用（实测模型会忽略该提示）；
    // 由 analyzeTask() 在拿到模型的客观估计后，于确定性层统一套用 personalMultiplier。
    const remainingHours = Math.max(0, (input.task.dueAt - input.nowMs) / 3_600_000).toFixed(1);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        thinking_budget: 128,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SILICONFLOW_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              title: input.task.title,
              importance: input.task.importance,
              hoursUntilDue: remainingHours,
              catalogVersion: CATALOG_VERSION,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`SILICONFLOW_HTTP_${response.status}`);

    const envelope = SiliconFlowResponseSchema.safeParse(await response.json());
    if (!envelope.success) throw new Error("SILICONFLOW_RESPONSE_INVALID");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(envelope.data.choices[0].message.content);
    } catch {
      throw new Error("SILICONFLOW_CONTENT_NOT_JSON");
    }
    const parsed = ProposalSchema.safeParse(parsedJson);
    if (!parsed.success) throw new Error("SILICONFLOW_PROPOSAL_SCHEMA_INVALID");
    return providerFieldsFromParsed(parsed.data, envelope.data.model ?? model);
  }
}

export class AnthropicTaskAnalysisProvider implements TaskAnalysisProvider {
  async analyze(input: { task: UserTaskInput; history: CalibrationSample[]; nowMs: number }): Promise<ProviderProposal> {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    // 个人速度由 analyzeTask() 在确定性层套用，不依赖模型自觉遵循提示。
    const remainingHours = Math.max(0, (input.task.dueAt - input.nowMs) / 3_600_000).toFixed(1);
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { format: zodOutputFormat(ProposalSchema), effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: JSON.stringify({
          title: input.task.title,
          importance: input.task.importance,
          hoursUntilDue: remainingHours,
          catalogVersion: CATALOG_VERSION,
        }),
      }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(response.stop_reason ?? "PARSE_FAILED");
    }
    return providerFieldsFromParsed(response.parsed_output, response.model);
  }
}

export function createDefaultTaskAnalysisProvider(): TaskAnalysisProvider {
  if (process.env.LLM_API_KEY?.trim()) return new SiliconFlowTaskAnalysisProvider();
  return new AnthropicTaskAnalysisProvider();
}

/**
 * 会议类任务本质上不能切成时间碎片（一场会不能拆成四段跨午休开）。
 * 不信任模型对 splittability 的判断，按类别强制归一化。
 */
export function enforceCategoryInvariants(fields: ProviderProposal): ProviderProposal {
  if (fields.category !== "MEETING" || fields.splittability === "ATOMIC") {
    return fields;
  }
  return {
    ...fields,
    splittability: "ATOMIC",
    rationaleCodes: [...fields.rationaleCodes, "MEETING_FORCED_ATOMIC"],
  };
}

/**
 * 个人速度乘数由确定性层统一套用（PRD 05 §6.2），不依赖模型自觉遵循 prompt 提示——
 * 实测模型会忽略"参考这个乘数"式的提示，必须在拿到客观估计后再乘一次。
 * 按模型实际返回的 category 取乘数，而不是创建任务时的关键词粗分类别。
 */
export function applyPersonalCalibration(
  fields: ProviderProposal,
  history: CalibrationSample[],
  nowMs: number,
): ProviderProposal {
  const calibration = personalMultiplier(history, fields.category, nowMs);
  if (!calibration.learned) return fields;

  const scale = (ms: number) => Math.round(ms * calibration.multiplier);
  return {
    ...fields,
    estimatedDurationMs: scale(fields.estimatedDurationMs),
    estimateRangeMs: { low: scale(fields.estimateRangeMs.low), high: scale(fields.estimateRangeMs.high) },
    suggestedSubtasks: fields.suggestedSubtasks?.map((subtask) => ({
      ...subtask,
      estimatedDurationMs: scale(subtask.estimatedDurationMs),
    })),
    rationaleCodes: [...fields.rationaleCodes, `PERSONAL_MULTIPLIER_APPLIED:${calibration.multiplier.toFixed(2)}:${calibration.sampleCount}`],
  };
}

export async function analyzeTask(
  taskId: string,
  input: UserTaskInput,
  history: CalibrationSample[] = [],
  nowMs = Date.now(),
  taskRevision = 1,
  provider: TaskAnalysisProvider = createDefaultTaskAnalysisProvider(),
): Promise<AnalyzeResult> {
  if (process.env.NOT_FORCE_BASELINE === "1") {
    return { proposal: baselineProposal(taskId, input, history, taskRevision, nowMs), source: "BASELINE", fallbackReason: "FORCED" };
  }

  try {
    const rawFields = await provider.analyze({ task: input, history, nowMs });
    const normalized = applyPersonalCalibration(enforceCategoryInvariants(rawFields), history, nowMs);
    const proposal: TaskAnalysisProposal = {
      ...normalized,
      proposalId: randomUUID(),
      taskId,
      taskRevision,
      inputHash: taskInputHash(input),
      createdAt: nowMs,
      policyVersion: ANALYSIS_POLICY_VERSION,
    };
    const checked = validateProposal(proposal);
    if (!checked.ok) {
      return {
        proposal: baselineProposal(taskId, input, history, taskRevision, nowMs),
        source: "BASELINE",
        fallbackReason: `VALIDATION:${checked.errors.join(",")}`,
      };
    }
    return { proposal: checked.proposal, source: "AI" };
  } catch (error) {
    const reason = error instanceof Anthropic.APIError
      ? `API_${error.status}`
      : error instanceof Error
        ? error.message.slice(0, 60)
        : "UNKNOWN";
    return {
      proposal: baselineProposal(taskId, input, history, taskRevision, nowMs),
      source: "BASELINE",
      fallbackReason: reason,
    };
  }
}

function providerFieldsFromParsed(raw: z.infer<typeof ProposalSchema>, modelVersion: string): ProviderProposal {
  const MIN = 60_000;
  return {
    category: raw.category,
    estimatedDurationMs: raw.estimatedMinutes * MIN,
    estimateRangeMs: { low: raw.estimateLowMinutes * MIN, high: raw.estimateHighMinutes * MIN },
    cognitiveLoad: raw.cognitiveLoad,
    splittability: raw.splittability,
    suggestedSubtasks: raw.suggestedSubtasks.map((subtask, index) => ({
      title: subtask.title,
      estimatedDurationMs: subtask.estimatedMinutes * MIN,
      order: index + 1,
    })),
    confidence: raw.confidence,
    rationaleCodes: raw.rationaleCodes,
    warnings: [],
    modelVersion,
  };
}
