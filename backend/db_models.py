"""
SQLAlchemy ORM models for SchemeSecure AI — AI Government Scheme Fraud Detection & Verification System.
Supports both PostgreSQL and SQLite.
"""

from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import (
    Integer, String, Float, Boolean, Date, DateTime, Text, JSON,
    ForeignKey, Enum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)



# ─── Enums ───────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    admin = "admin"
    district_officer = "district_officer"
    verifying_officer = "verifying_officer"
    citizen = "citizen"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    flagged = "flagged"
    under_review = "under_review"


class AIDecisionEnum(str, enum.Enum):
    ai_approved = "AI_APPROVED"
    ai_reverification_required = "AI_REVERIFICATION_REQUIRED"
    ai_blocked_temporary = "AI_BLOCKED_TEMPORARY"


class ConcernLevelEnum(str, enum.Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


# ─── Tables ──────────────────────────────────────────────────────────────────

class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    beneficiaries: Mapped[list["Beneficiary"]] = relationship("Beneficiary", back_populates="district")
    users: Mapped[list["User"]] = relationship("User", back_populates="district")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    mobile: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum, native_enum=False), default=RoleEnum.admin)
    district_id: Mapped[Optional[int]] = mapped_column(ForeignKey("districts.id"), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    district: Mapped[Optional["District"]] = relationship("District", back_populates="users")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="filed_by_user")
    reset_tokens: Mapped[list["PasswordResetToken"]] = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="General")
    eligibility_criteria: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    benefit_amount: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    applications: Mapped[list["Application"]] = relationship("Application", back_populates="scheme")


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[str] = mapped_column(String(20), default="other")
    phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    district_id: Mapped[Optional[int]] = mapped_column(ForeignKey("districts.id"), nullable=True)
    aadhaar_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    bank_account_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    declared_income: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


    district: Mapped[Optional["District"]] = relationship("District", back_populates="beneficiaries")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="beneficiary")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="beneficiary")
    fraud_logs: Mapped[list["FraudLog"]] = relationship("FraudLog", back_populates="beneficiary")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id"), nullable=False, index=True)
    scheme_id: Mapped[int] = mapped_column(ForeignKey("schemes.id"), nullable=False, index=True)
    
    # Dataset features
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    annual_income: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    family_size: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    employment_status: Mapped[Optional[str]] = mapped_column(String(50), default="Unemployed")
    
    # Verification Indicators
    aadhaar_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    mobile_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    email_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    bank_account_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    multiple_scheme_applications: Mapped[int] = mapped_column(Integer, default=0)
    document_mismatch: Mapped[int] = mapped_column(Integer, default=0)
    previous_rejection: Mapped[int] = mapped_column(Integer, default=0)
    eligibility_match: Mapped[int] = mapped_column(Integer, default=1)
    
    # AI-First Automated Verification Results
    ai_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_fraud_flag: Mapped[int] = mapped_column(Integer, default=0)
    ai_decision: Mapped[str] = mapped_column(String(50), default="AI_APPROVED")
    fraud_predicted_type: Mapped[str] = mapped_column(String(100), default="None / Clean Application")
    ai_evidence: Mapped[list] = mapped_column(JSON, default=list)
    ai_confidence_score: Mapped[float] = mapped_column(Float, default=95.0)
    ai_verified_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    # Current Application Operational Status (AI is primary driver)
    status: Mapped[str] = mapped_column(String(30), default="Approved")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    
    # Officer Override Governance (Strict Traceability - Zero Silent Modifications)
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    previous_ai_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    override_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overridden_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    overridden_by_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    overridden_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    beneficiary: Mapped["Beneficiary"] = relationship("Beneficiary", back_populates="applications")
    scheme: Mapped["Scheme"] = relationship("Scheme", back_populates="applications")
    prediction: Mapped[Optional["AIPrediction"]] = relationship(
        "AIPrediction", back_populates="application", uselist=False
    )
    documents: Mapped[list["ApplicationDocument"]] = relationship(
        "ApplicationDocument", back_populates="application", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["ApplicationStatusHistory"]] = relationship(
        "ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False, index=True)
    document_name: Mapped[str] = mapped_column(String(200), nullable=False)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    verification_status: Mapped[str] = mapped_column(String(50), default="pending_verification")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    uploaded_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    ocr_extracted: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    verified_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    application: Mapped["Application"] = relationship("Application", back_populates="documents")



class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    application: Mapped["Application"] = relationship("Application", back_populates="status_history")


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False, unique=True, index=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id"), nullable=False, index=True)

    leakage_probability: Mapped[float] = mapped_column(Float, nullable=False)
    concern_level: Mapped[str] = mapped_column(String(20), nullable=False)
    ai_decision: Mapped[str] = mapped_column(String(50), default="AI_APPROVED")
    fraud_type: Mapped[str] = mapped_column(String(100), default="None / Clean Application")

    contributing_factors: Mapped[list] = mapped_column(JSON, default=list)
    severity: Mapped[list] = mapped_column(JSON, default=list)
    ai_evidence: Mapped[list] = mapped_column(JSON, default=list)

    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    potential_leakage_amount: Mapped[float] = mapped_column(Float, default=0.0)

    model_version: Mapped[str] = mapped_column(String(50), default="3.0.0-ai-first-verification")
    predicted_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    application: Mapped["Application"] = relationship("Application", back_populates="prediction")


class FraudLog(Base):
    __tablename__ = "fraud_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id"), nullable=False, index=True)
    detection_type: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    beneficiary: Mapped["Beneficiary"] = relationship("Beneficiary", back_populates="fraud_logs")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id"), nullable=False, index=True)
    reported_target: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    complaint_type: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open")
    officer_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_urls: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=True)

    filed_by_user: Mapped["User"] = relationship("User", back_populates="complaints")
    beneficiary: Mapped["Beneficiary"] = relationship("Beneficiary", back_populates="complaints")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    user: Mapped["User"] = relationship("User", back_populates="reset_tokens")

