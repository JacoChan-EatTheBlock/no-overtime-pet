"""
LLM Client — 硅基流动 (SiliconFlow) OpenAI-compatible wrapper

Usage:
    from src.llm import llm_client
    response = await llm_client.chat(messages=[...])
"""
import os
from typing import Any
import httpx

class LLMClient:
    """OpenAI-compatible client for SiliconFlow."""

    def __init__(self):
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.siliconflow.cn/v1")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-72B-Instruct")
        self._client = httpx.AsyncClient(timeout=60.0)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        response_format: dict | None = None,
        **kwargs: Any,
    ) -> dict:
        """Send a chat completion request."""
        payload: dict[str, Any] = {
            "model": model or self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }
        if response_format:
            payload["response_format"] = response_format

        resp = await self._client.post(
            f"{self.base_url}/chat/completions",
            headers=self.headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def chat_text(
        self,
        messages: list[dict[str, str]],
        **kwargs: Any,
    ) -> str:
        """Convenience: return only the text content."""
        result = await self.chat(messages, **kwargs)
        return result["choices"][0]["message"]["content"]

    async def close(self):
        await self._client.aclose()


# Singleton instance
llm_client = LLMClient()
