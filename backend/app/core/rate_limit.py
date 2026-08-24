"""Simple in-memory rate limiter for login endpoints."""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        window_start = now - self.window_seconds

        with self._lock:
            hits = [t for t in self._hits[key] if t > window_start]
            if len(hits) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                )
            hits.append(now)
            self._hits[key] = hits


login_rate_limiter = InMemoryRateLimiter(
    max_requests=settings.LOGIN_RATE_LIMIT,
    window_seconds=60,
)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def enforce_login_rate_limit(request: Request) -> None:
    if not settings.RATE_LIMIT_ENABLED:
        return
    login_rate_limiter.check(client_ip(request))
