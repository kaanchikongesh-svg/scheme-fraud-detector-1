"""
SQLAlchemy engine, session factory, and declarative Base.
Supports PostgreSQL as well as local SQLite fallback with consistent absolute paths.
Import `get_db` as a FastAPI dependency to get a per-request session.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

db_url = settings.DATABASE_URL
connect_args = {}

# Locate persistent db path
BASE_DIR = Path(__file__).resolve().parent
sqlite_path = BASE_DIR / "leakage.db"

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args, echo=False)
else:
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=False,
        )
        with engine.connect() as conn:
            pass
    except Exception as e:
        fallback_url = f"sqlite:///{sqlite_path}"
        connect_args = {"check_same_thread": False}
        engine = create_engine(fallback_url, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """All ORM models inherit from this Base."""
    pass


def get_db():
    """FastAPI dependency — yields a DB session, guarantees close."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables if they don't exist. Used on startup & seed script."""
    from db_models import (  # noqa: F401
        District, User, Scheme, Beneficiary, Application,
        ApplicationDocument, ApplicationStatusHistory, AIPrediction,
        FraudLog, Complaint, Notification, AuditLog, PasswordResetToken
    )
    Base.metadata.create_all(bind=engine)
    if "sqlite" in engine.url.drivername or "sqlite" in str(engine.url) or str(engine.url).startswith("sqlite"):
        _migrate_legacy_sqlite_schema()


def _migrate_legacy_sqlite_schema():
    """Add columns introduced after the original demo SQLite database was created."""
    inspector = inspect(engine)
    if "applications" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("applications")}
    additions = {
        "application_number": "VARCHAR(50)",
        "state": "VARCHAR(100)",
        "district_name": "VARCHAR(100)",
        "age": "INTEGER",
        "gender": "VARCHAR(20)",
        "annual_income": "FLOAT DEFAULT 0",
        "family_size": "INTEGER DEFAULT 1",
        "employment_status": "VARCHAR(50) DEFAULT 'Unemployed'",
        "aadhaar_duplicate": "INTEGER DEFAULT 0",
        "mobile_duplicate": "INTEGER DEFAULT 0",
        "email_duplicate": "INTEGER DEFAULT 0",
        "bank_account_duplicate": "INTEGER DEFAULT 0",
        "multiple_scheme_applications": "INTEGER DEFAULT 0",
        "document_mismatch": "INTEGER DEFAULT 0",
        "previous_rejection": "INTEGER DEFAULT 0",
        "eligibility_match": "INTEGER DEFAULT 1",
        "ai_risk_score": "FLOAT DEFAULT 0",
        "ai_fraud_flag": "INTEGER DEFAULT 0",
        "ai_decision": "VARCHAR(50) DEFAULT 'AI_APPROVED'",
        "fraud_predicted_type": "VARCHAR(100) DEFAULT 'None / Clean Application'",
        "ai_evidence": "JSON",
        "ai_confidence_score": "FLOAT DEFAULT 95",
        "ai_verified_at": "DATETIME",
        "is_overridden": "BOOLEAN DEFAULT 0",
        "previous_ai_decision": "VARCHAR(50)",
        "override_decision": "VARCHAR(50)",
        "override_reason": "TEXT",
        "overridden_by_id": "INTEGER",
        "overridden_by_name": "VARCHAR(200)",
        "overridden_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.exec_driver_sql(f"ALTER TABLE applications ADD COLUMN {name} {definition}")
        connection.exec_driver_sql("UPDATE applications SET application_number = 'APP-2026-' || printf('%06d', id) WHERE application_number IS NULL")

    if "ai_predictions" in inspector.get_table_names():
        prediction_columns = {column["name"] for column in inspector.get_columns("ai_predictions")}
        prediction_additions = {
            "ai_decision": "VARCHAR(50) DEFAULT 'AI_APPROVED'",
            "fraud_type": "VARCHAR(100) DEFAULT 'None / Clean Application'",
            "ai_evidence": "JSON",
        }
        with engine.begin() as connection:
            for name, definition in prediction_additions.items():
                if name not in prediction_columns:
                    connection.exec_driver_sql(f"ALTER TABLE ai_predictions ADD COLUMN {name} {definition}")

    if "application_documents" in inspector.get_table_names():
        document_columns = {column["name"] for column in inspector.get_columns("application_documents")}
        document_additions = {
            "original_filename": "VARCHAR(255)",
            "mime_type": "VARCHAR(100)",
            "size_bytes": "INTEGER",
            "sha256_hash": "VARCHAR(64)",
            "doc_type": "VARCHAR(50)",
            "uploaded_by": "INTEGER",
            "ocr_extracted": "JSON",
            "verified_by": "INTEGER",
            "verified_at": "DATETIME",
            "rejection_reason": "TEXT",
        }
        with engine.begin() as connection:
            for name, definition in document_additions.items():
                if name not in document_columns:
                    connection.exec_driver_sql(f"ALTER TABLE application_documents ADD COLUMN {name} {definition}")
            connection.exec_driver_sql("DELETE FROM application_documents WHERE is_demo = 1 AND (storage_path IS NULL OR storage_path LIKE 'demo://%')")

    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        user_additions = {
            "mobile": "VARCHAR(15)",
            "dob": "DATE",
            "address": "TEXT",
        }
        with engine.begin() as connection:
            for name, definition in user_additions.items():
                if name not in user_columns:
                    connection.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {name} {definition}")

    if "password_reset_tokens" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.exec_driver_sql("""
                CREATE TABLE password_reset_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    token_hash VARCHAR(128) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            connection.exec_driver_sql("CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash)")
            connection.exec_driver_sql("CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)")
