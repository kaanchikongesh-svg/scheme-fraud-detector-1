"""
Application settings via pydantic-settings.
Reads from environment variables or a .env file in the backend/ directory.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://verdant:verdant_pass@localhost:5432/leakage_db"

    # JWT
    SECRET_KEY: str = "govkavach-ai-secret-key-CHANGE-IN-PRODUCTION-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for session convenience

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ]

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
