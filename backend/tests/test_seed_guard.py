"""Unit tests for seed guard."""
import pytest

from app.core.seed_guard import check_seed_allowed


def test_seed_blocked_in_production(monkeypatch):
    with pytest.raises(SystemExit) as exc:
        check_seed_allowed(app_env="production", allow_seed=True)
    assert exc.value.code == 1


def test_seed_blocked_without_allow_seed(monkeypatch):
    with pytest.raises(SystemExit) as exc:
        check_seed_allowed(app_env="development", allow_seed=False)
    assert exc.value.code == 1


def test_seed_allowed_in_development_with_flag():
    check_seed_allowed(app_env="development", allow_seed=True)
