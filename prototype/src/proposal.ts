import { createHash } from "node:crypto";
import type { UserTaskInput } from "./types.js";

/** Proposal 只对当时的任务输入有效，任一用户字段变化都必须重新分析。 */
export function taskInputHash(input: UserTaskInput): string {
  return createHash("sha256")
    .update(JSON.stringify({
      title: input.title.trim(),
      dueAt: input.dueAt,
      importance: input.importance,
    }))
    .digest("hex");
}
