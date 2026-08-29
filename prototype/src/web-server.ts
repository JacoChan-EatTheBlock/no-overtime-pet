import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { analyzeTask } from "./ai.js";
import { generateScheduleDraft } from "./scheduler.js";
import { SiliconFlowScheduleProvider } from "./schedule-ai.js";
import type { Task } from "./types.js";

const PORT = Number(process.env.PROTOTYPE_PORT ?? 4173);
const showcasePath = fileURLToPath(new URL("../showcase.html", import.meta.url));
/** 像素 UI 的 vite 产物；未构建时自动回落到 showcase.html。 */
const webDistDir = fileURLToPath(new URL("../web/dist/", import.meta.url));

const CalibrationSampleSchema = z.object({
  category: z.enum([
    "WRITING", "CODING", "DESIGN", "RESEARCH", "COMMUNICATION",
    "MEETING", "ADMIN", "REVIEW", "LEARNING", "OTHER",
  ]),
  estimatedMs: z.number().positive().finite(),
  actualMs: z.number().positive().finite(),
  source: z.enum(["EXPLICIT_TIMER", "USER_CONFIRMED", "SYSTEM_INFERRED"]),
  confidence: z.number().min(0).max(1).optional(),
  recordedAt: z.number().finite().optional(),
});

const RequestSchema = z.object({
  taskId: z.union([z.string(), z.number()]).transform(String),
  title: z.string().trim().min(1).max(120),
  dueAt: z.number().finite(),
  importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  // 个人速度样本由调用方持有；服务端不存储，只用于本次估计的校准。
  history: z.array(CalibrationSampleSchema).max(200).optional(),
});
const ScheduleRequestSchema = z.object({
  nowMs: z.number().finite(),
  settings: z.object({
    workStart: z.string().regex(/^\d{2}:\d{2}$/),
    lunchStart: z.string().regex(/^\d{2}:\d{2}$/),
    lunchEnd: z.string().regex(/^\d{2}:\d{2}$/),
    workEnd: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  tasks: z.array(z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    dueAt: z.number().finite(),
    importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    status: z.enum(["BACKLOG", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    urgency: z.enum(["NOT_URGENT", "UPCOMING", "URGENT", "OVERDUE"]),
    estimatedDurationMs: z.number().positive().finite().optional(),
    cognitiveLoad: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    splittability: z.enum(["ATOMIC", "SPLITTABLE", "REQUIRES_REVIEW"]).optional(),
    schedulingMode: z.enum(["DIRECT", "CHILDREN"]).optional(),
  })).max(100),
});

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);

    if (request.method === "GET" && url.pathname === "/showcase.html") {
      const html = await readFile(showcasePath);
      response.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store", "Content-Security-Policy": CSP });
      response.end(html);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/task-analysis") {
      const body = RequestSchema.safeParse(JSON.parse(await readBody(request)));
      if (!body.success) {
        sendJson(response, 400, { error: { code: "TASK_ANALYSIS_REQUEST_INVALID" } });
        return;
      }
      const nowMs = Date.now();
      const result = await analyzeTask(
        body.data.taskId,
        { title: body.data.title, dueAt: body.data.dueAt, importance: body.data.importance },
        body.data.history ?? [],
        nowMs,
        1,
      );
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/schedule") {
      const body = ScheduleRequestSchema.safeParse(JSON.parse(await readBody(request)));
      if (!body.success) {
        sendJson(response, 400, { error: { code: "SCHEDULE_REQUEST_INVALID" } });
        return;
      }
      // Demo 不保存请求正文；这里只把浏览器本地状态装配成内存输入。
      const tasks: Task[] = body.data.tasks.map((task) => ({
        ...task,
        title: "[LOCAL_TASK]",
        revision: 1,
        fieldOrigins: {},
      }));
      const result = await generateScheduleDraft(
        { tasks, settings: body.data.settings, nowMs: body.data.nowMs },
        new SiliconFlowScheduleProvider(),
      );
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && await serveStatic(url.pathname, response)) return;

    sendJson(response, 404, { error: { code: "NOT_FOUND" } });
  } catch {
    // 不把供应商响应、任务标题或凭据写入错误响应。
    sendJson(response, 500, { error: { code: "INTERNAL_ERROR" } });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[prototype] Demo: http://127.0.0.1:${PORT}`);
  console.log(`[prototype] Task AI: ${process.env.LLM_API_KEY ? "SiliconFlow enabled" : "baseline fallback"}`);
  console.log(`[prototype] Schedule AI: ${process.env.LLM_API_KEY ? "SiliconFlow enabled" : "baseline fallback"}`);
});

/** 提供 vite 产物；路径逃逸一律拒绝，未知路径回落 index.html（SPA）。 */
async function serveStatic(pathname: string, response: ServerResponse): Promise<boolean> {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const candidate = resolve(join(webDistDir, normalize(requested)));
  if (!candidate.startsWith(resolve(webDistDir) + sep)) return false;

  const target = await readable(candidate) ?? (extname(requested) ? undefined : await readable(join(webDistDir, "index.html")));
  if (!target) return false;

  response.writeHead(200, {
    "Content-Type": MIME[extname(target)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
    "Content-Security-Policy": CSP,
  });
  response.end(await readFile(target));
  return true;
}

async function readable(path: string): Promise<string | undefined> {
  try {
    return (await stat(path)).isFile() ? path : undefined;
  } catch {
    return undefined;
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}
