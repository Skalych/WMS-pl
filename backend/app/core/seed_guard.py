"""Guard against accidental seed runs against production databases."""
from __future__ import annotations

import sys


def check_seed_allowed(*, app_env: str, allow_seed: bool) -> None:
    """Exit with a clear error if seed is not explicitly allowed."""
    if app_env.lower() == "production":
        print(
            "ERROR: Refusing to run seed in production (APP_ENV=production).",
            file=sys.stderr,
        )
        sys.exit(1)

    if not allow_seed:
        print(
            "ERROR: Seed drops and recreates all tables. Set ALLOW_SEED=1 to proceed.",
            file=sys.stderr,
        )
        sys.exit(1)
