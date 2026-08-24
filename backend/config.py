"""
Application settings via pydantic-settings.
Reads from environment variables or a .env file in the backend/ directory.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union, Any
from pathlib import Path
import json


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://verdant:verdant_pass@localhost:5432/leakage_db"

    # JWT
    SECRET_KEY: str = "govkavach-ai-secret-key-CHANGE-IN-PRODUCTION-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for session convenience

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_clean = v.strip()
            if v_clean.startswith("[") and v_clean.endswith("]"):
                try:
                    return json.loads(v_clean)
                except Exception:
                    pass
            return [item.strip() for item in v_clean.split(",") if item.strip()]
        if isinstance(v, (list, tuple, set)):
            return list(v)
        return [str(v)]

    # Seeding
    SEED_COUNT: int = 500  # number of synthetic beneficiaries to generate

    # MongoDB Atlas connection
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "government_scheme_leakage"
    MONGODB_ENABLED: bool = True
    MONGODB_DUAL_WRITE: bool = True
    MONGODB_CONNECT_TIMEOUT_MS: int = 2000

    # Password Reset
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15
    PASSWORD_RESET_RATE_LIMIT_SECONDS: int = 60
    LOGIN_RATE_LIMIT_SECONDS: int = 5

    # Email / SMS Provider (configure in production)
    EMAIL_PROVIDER: str = "smtp"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@example.com"
    SMTP_FROM_NAME: str = "GovKavach AI — Scheme Leakage Detector"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    FRONTEND_URL: str = "http://localhost:5173"
    SMS_PROVIDER: str = ""
    SMS_API_KEY: str = ""
    SMS_SENDER_ID: str = ""

    # Type-safe resilient validators for all cloud deployment environments
    @field_validator("SMTP_USE_TLS", "SMTP_USE_SSL", "MONGODB_ENABLED", "MONGODB_DUAL_WRITE", mode="before")
    @classmethod
    def parse_bool_fields(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return bool(v)
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in ("true", "1", "yes", "on", "t", "y", "enabled"):
                return True
            if v_clean in ("false", "0", "no", "off", "f", "n", "disabled", "none", "null", "undefined", ""):
                return False
            if "true" in v_clean:
                return True
            if "false" in v_clean:
                return False
        return bool(v) if v is not None else False

    @field_validator(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "SEED_COUNT",
        "MONGODB_CONNECT_TIMEOUT_MS",
        "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES",
        "PASSWORD_RESET_RATE_LIMIT_SECONDS",
        "LOGIN_RATE_LIMIT_SECONDS",
        "SMTP_PORT",
        mode="before"
    )
    @classmethod
    def parse_int_fields(cls, v: Any, info) -> int:
        defaults = {
            "ACCESS_TOKEN_EXPIRE_MINUTES": 480,
            "SEED_COUNT": 500,
            "MONGODB_CONNECT_TIMEOUT_MS": 2000,
            "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES": 15,
            "PASSWORD_RESET_RATE_LIMIT_SECONDS": 60,
            "LOGIN_RATE_LIMIT_SECONDS": 5,
            "SMTP_PORT": 587,
        }
        field_name = info.field_name if hasattr(info, "field_name") else ""
        default_val = defaults.get(field_name, 0)
        if v is None or v == "":
            return default_val
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str or v_str.lower() in ("none", "null", "undefined"):
                return default_val
            try:
                return int(v_str)
            except ValueError:
                try:
                    return int(float(v_str))
                except ValueError:
                    return default_val
        if isinstance(v, (int, float)):
            return int(v)
        return default_val

    class Config:
        env_file = (str(Path(__file__).resolve().parent / ".env"), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

