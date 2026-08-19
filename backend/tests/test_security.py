"""Unit tests for authentication helpers."""
from datetime import timedelta

from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password


def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_access_token_contains_claims():
    token = create_access_token(
        {"sub": "user-123", "role": "PICKER"},
        expires_delta=timedelta(minutes=5),
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user-123"
    assert payload["role"] == "PICKER"
    assert "exp" in payload
