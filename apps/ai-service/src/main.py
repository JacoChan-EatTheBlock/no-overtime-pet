"""
AI Service Entry Point — 不要加班

Provider: 硅基流动 (SiliconFlow) — OpenAI 兼容接口
Models: Qwen2.5-72B / DeepSeek-V3 / GLM-4 等

Provides:
- Task analysis (category, duration estimate, cognitive load)
- Schedule optimization (deterministic solver)
- Desktop activity vision classification
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify LLM connection
    print(f"[ai-service] LLM Provider: {os.getenv('LLM_BASE_URL')}")
    print(f"[ai-service] LLM Model: {os.getenv('LLM_MODEL')}")
    yield
    print("[ai-service] Shutting down...")


app = FastAPI(
    title="不要加班 AI Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "llm_provider": "siliconflow",
        "model": os.getenv("LLM_MODEL", "not configured"),
    }


from .routers import task_analysis
app.include_router(task_analysis.router, prefix="/task-analysis", tags=["Task Analysis"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
