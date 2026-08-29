"""
AI Service Entry Point

Provides:
- Task analysis (category, duration estimate, cognitive load)
- Schedule optimization (deterministic solver)
- Desktop activity vision classification
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load models, warm caches
    print("[ai-service] Starting up...")
    yield
    # Shutdown: cleanup
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
    return {"status": "ok", "service": "ai-service"}


# ─── Task Analysis ─────────────────────────────────────────────

# from .routers import task_analysis, scheduling, vision
# app.include_router(task_analysis.router, prefix="/task-analysis")
# app.include_router(scheduling.router, prefix="/schedules")
# app.include_router(vision.router, prefix="/vision")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
