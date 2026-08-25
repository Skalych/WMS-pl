"""Tests for environment-aware simulation defaults.

Default simulation state (when no DB setting exists) must depend on APP_ENV /
SIMULATION_ENABLED: disabled in production, enabled elsewhere.
"""
from __future__ import annotations

import os
from typing import Optional

import pytest

from app.core.config import Settings
from app.services import app_settings_service, simulation_service


def _make_settings(app_env: str, simulation_enabled: Optional[str] = None) -> Settings:
    """Build a Settings instance bypassing .env file loading."""
    kwargs = {
        "SECRET_KEY": "test-only-key",
        "APP_ENV": app_env,
        "_env_file": None,
    }
    env_backup = {}
    if simulation_enabled is not None:
        env_backup["SIMULATION_ENABLED"] = os.environ.pop("SIMULATION_ENABLED", None)
        os.environ["SIMULATION_ENABLED"] = simulation_enabled
    try:
        return Settings(**kwargs)
    finally:
        if "SIMULATION_ENABLED" in env_backup:
            if env_backup["SIMULATION_ENABLED"] is None:
                os.environ.pop("SIMULATION_ENABLED", None)
            else:
                os.environ["SIMULATION_ENABLED"] = env_backup["SIMULATION_ENABLED"]


class TestSimulationDefaults:
    def test_production_default_is_disabled(self):
        s = _make_settings("production")
        assert s.SIMULATION_DEFAULT_ACTIVE is False

    def test_development_default_is_enabled(self):
        s = _make_settings("development")
        assert s.SIMULATION_DEFAULT_ACTIVE is True

    def test_staging_default_is_enabled(self):
        s = _make_settings("staging")
        assert s.SIMULATION_DEFAULT_ACTIVE is True

    def test_explicit_true_overrides_production(self):
        s = _make_settings("production", simulation_enabled="true")
        assert s.SIMULATION_DEFAULT_ACTIVE is True

    def test_explicit_false_overrides_development(self):
        s = _make_settings("development", simulation_enabled="false")
        assert s.SIMULATION_DEFAULT_ACTIVE is False


class TestDbFallbackUsesEnvDefault:
    async def test_no_db_setting_production_falls_back_to_off(self, db_session):
        """With no AppSetting row and APP_ENV=production, state resolves to off."""
        original_env = app_settings_service.settings.APP_ENV
        app_settings_service.settings.APP_ENV = "production"
        try:
            state = await app_settings_service.get_simulation_active(db_session)
            assert state is False
        finally:
            app_settings_service.settings.APP_ENV = original_env

    async def test_no_db_setting_development_falls_back_to_on(self, db_session):
        original_env = app_settings_service.settings.APP_ENV
        app_settings_service.settings.APP_ENV = "development"
        try:
            state = await app_settings_service.get_simulation_active(db_session)
            assert state is True
        finally:
            app_settings_service.settings.APP_ENV = original_env

    async def test_persisted_state_beats_env(self, db_session):
        """An explicit DB toggle always wins over the environment default."""
        await app_settings_service.set_simulation_active(db_session, False)
        await db_session.commit()
        assert await app_settings_service.get_simulation_active(db_session) is False
