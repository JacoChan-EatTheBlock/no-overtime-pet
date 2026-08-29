"""
Task Analysis Router

Receives a task, uses LLM to suggest:
- category (CODING, WRITING, MEETING, DESIGN, ADMIN, OTHER)
- estimatedDurationMs
- cognitiveLoad (LOW, MEDIUM, HIGH, VERY_HIGH)
- splittability (0.0 ~ 1.0)
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..llm import llm_client

router = APIRouter()


class TaskAnalysisRequest(BaseModel):
    task_id: str
    title: str
    due_at: str
    importance: str  # LOW, MEDIUM, HIGH
    user_history_summary: str | None = None  # optional context


class TaskAnalysisProposal(BaseModel):
    task_id: str
    category: str
    estimated_duration_ms: int
    cognitive_load: str
    splittability: float
    reasoning: str


SYSTEM_PROMPT = """你是"不要加班"产品的 AI 任务分析助手。
根据用户提供的任务标题、截止时间和重要性，分析并返回 JSON 格式的建议：

{
  "category": "CODING|WRITING|MEETING|DESIGN|ADMIN|OTHER",
  "estimated_duration_ms": <毫秒数>,
  "cognitive_load": "LOW|MEDIUM|HIGH|VERY_HIGH",
  "splittability": <0.0到1.0, 表示任务可拆分程度>,
  "reasoning": "<简短说明推理依据>"
}

规则：
- 只输出 JSON，不要多余文字
- 时长估计要合理（普通编码任务 1-4h，写周报 30min-1h，会议按标题判断）
- 认知负荷：纯事务性低，创造性/复杂逻辑高
- 可拆分性：能分步做的高，需要连续注意力的低
"""


@router.post("/analyze", response_model=TaskAnalysisProposal)
async def analyze_task(req: TaskAnalysisRequest):
    """Analyze a task and return structured suggestions."""
    user_msg = f"""任务标题: {req.title}
截止时间: {req.due_at}
重要性: {req.importance}
"""
    if req.user_history_summary:
        user_msg += f"用户历史参考: {req.user_history_summary}\n"

    try:
        response_text = await llm_client.chat_text(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )

        result = json.loads(response_text)

        return TaskAnalysisProposal(
            task_id=req.task_id,
            category=result.get("category", "OTHER"),
            estimated_duration_ms=result.get("estimated_duration_ms", 3600000),
            cognitive_load=result.get("cognitive_load", "MEDIUM"),
            splittability=result.get("splittability", 0.5),
            reasoning=result.get("reasoning", ""),
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM analysis failed (degraded mode available): {str(e)}",
        )
