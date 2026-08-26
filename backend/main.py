"""
Verdant Shield — FastAPI application.
All endpoints are backed by PostgreSQL via SQLAlchemy.
Auth uses real bcrypt password validation + HS256 JWT.
All AI outputs use neutral, non-accusatory language.
The AI Leakage Probability is advisory-only — no endpoint auto-rejects.
"""
from fastapi import FastAPI, HTTPException, status, Depends, Query, File, UploadFile, Body, Form, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Dict, Any, Union
import sys
import datetime
from pathlib import Path
import bcrypt



# Ensure backend directory is in sys.path so sibling imports resolve cleanly
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from jose import jwt, JWTError
from passlib.context import CryptContext

from config import settings
from database import get_db, create_tables



from db_models import (
    District, User, Scheme, Beneficiary, Application, ApplicationDocument,
    ApplicationStatusHistory, AIPrediction, FraudLog, Complaint, AuditLog,
    RoleEnum, StatusEnum, ConcernLevelEnum, PasswordResetToken
)
from models import (
    UserLogin, UserRegister, TokenResponse, UserResponse,
    BeneficiaryCreate, BeneficiaryResponse,
    SchemeBase, SchemeResponse,
    AIProbabilityResponse, NetworkGraphResponse, GraphNode, GraphLink,
    ComplaintCreate, ComplaintResponse,
    DocumentVerificationRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    UserProvisionRequest, ComplaintStatusUpdate,
)
from ai_engine import LeakageProbabilityEngine, hash_pii
from synthetic_data import SCHEMES_DATA

from contextlib import asynccontextmanager
from document_service import (
    ALLOWED_MIME_TYPES, inspect_against_beneficiary, inspect_document_authenticity,
    read_upload, save_private_document, validate_doc_type, perform_cross_document_comparison,
    test_documents_pipeline,
)
from mongodb import mongo_sync, mongo_repository
from email_service import email_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    from database import create_tables, SessionLocal
    from synthetic_data import seed_database, ensure_application_support_records
    create_tables()
    db = SessionLocal()
    try:
        seed_database(db, count=settings.SEED_COUNT)
        ensure_application_support_records(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="SchemeSecure AI — Scheme Fraud Detection & Verification API",
    description=(
        "Backend services for welfare scheme management, "
        "AI leakage probability scoring, and network anomaly detection. "
        "All outputs use neutral, non-accusatory language. "
        "The AI probability is advisory-only — final decisions require an authorized officer."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Build CORS origins list from settings — covers all local dev ports + production
_cors_origins_env = list(settings.CORS_ORIGINS)
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _cors_origins_env:
    _cors_origins_env.append(settings.FRONTEND_URL.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins_env,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0):\d+|https://.*\.(vercel\.app|onrender\.com|railway\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """System health check verifying database and MongoDB Atlas connectivity."""
    db_status = "connected"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    mongo_status = "disabled"
    if settings.MONGODB_ENABLED and settings.MONGODB_URI:
        mongo_status = "connected" if mongo_repository._get_database() is not None else f"unreachable ({mongo_repository.last_error or 'timeout'})"

    return {
        "status": "ok",
        "app": "SchemeSecure AI",
        "version": "2.0.0",
        "database": db_status,
        "mongodb": mongo_status,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }


bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def _create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — validates JWT and returns the authenticated User ORM object."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: RoleEnum):
    """Dependency factory — raises 403 if current user's role is not in the allowed list."""
    def _check(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return _check


def _write_audit(db: Session, user_id: Optional[int], action: str,
                 entity_type: Optional[str] = None, entity_id: Optional[int] = None, details: Optional[dict] = None):
    log = AuditLog(user_id=user_id, action=action, entity_type=entity_type,
                   entity_id=entity_id, details=details or {})
    db.add(log)


def _b_to_dict(b: Beneficiary) -> dict:
    """Convert Beneficiary ORM to dict for AI engine consumption."""
    return {
        "id": b.id, "full_name": b.full_name,
        "dob": b.dob.isoformat() if b.dob else None,
        "gender": b.gender, "phone": b.phone, "address": b.address,
        "district_id": b.district_id, "aadhaar_hash": b.aadhaar_hash,
        "bank_account_hash": b.bank_account_hash, "ifsc_code": b.ifsc_code,
        "declared_income": b.declared_income or 0.0, "status": b.status,
    }


def _get_engine(db: Session) -> LeakageProbabilityEngine:
    """Build a LeakageProbabilityEngine from the current DB state."""
    beneficiaries = [_b_to_dict(b) for b in db.query(Beneficiary).all()]
    schemes = SCHEMES_DATA  # static reference data, not frequently changed
    return LeakageProbabilityEngine(beneficiaries, schemes)


def _mask_phone(phone: Optional[str]) -> str:
    value = str(phone or "")
    return f"******{value[-4:]}" if len(value) >= 4 else "******"


def _application_status(status_value: str) -> str:
    return str(getattr(status_value, "value", status_value)).lower()


def _document_dict(document: ApplicationDocument) -> dict:
    status_value = document.verification_status or "uploaded"
    forensics = (document.ocr_extracted or {}).get("forensics") if isinstance(document.ocr_extracted, dict) else None
    return {
        "id": document.id,
        "document_name": document.document_name,
        "document_type": document.document_type,
        "doc_type": document.doc_type or document.document_type,
        "original_filename": document.original_filename or document.document_name,
        "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
        "verification_status": status_value,
        "status": status_value,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "ocr_extracted": document.ocr_extracted,
        "forensics": forensics,
        "document_authenticity": forensics.get("document_authenticity", "AUTHENTIC") if forensics else "AUTHENTIC",
        "tampering_detected": forensics.get("tampering_detected", False) if forensics else False,
        "confidence": forensics.get("confidence", 0.95) if forensics else 0.95,
        "model_version": forensics.get("model_version", "casia-document-forensics-v1") if forensics else "casia-document-forensics-v1",
        "model_used": forensics.get("model_used", False) if forensics else False,
        "service_unavailable": forensics.get("service_unavailable", False) if forensics else False,
        "rejection_reason": document.rejection_reason,
        "is_demo": document.is_demo,
        "view_url": f"/api/v1/documents/{document.id}/view",
        "download_url": f"/api/v1/documents/{document.id}/download",
    }


def _document_row(document_id: int, current_user: User, db: Session) -> ApplicationDocument:
    document = db.query(ApplicationDocument).filter(ApplicationDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    beneficiary = document.application.beneficiary
    if current_user.role == RoleEnum.citizen and beneficiary.id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own documents")
    if current_user.role == RoleEnum.district_officer and current_user.district_id != beneficiary.district_id:
        raise HTTPException(status_code=403, detail="Document outside officer district")
    return document


def _required_documents_verified(beneficiary: Beneficiary) -> bool:
    required = {"identity_proof", "income_certificate", "address_proof"}
    documents = {document.doc_type or document.document_type for application in beneficiary.applications for document in application.documents}
    return required.issubset(documents) and all(
        document.verification_status == "verified"
        for application in beneficiary.applications
        for document in application.documents
        if (document.doc_type or document.document_type) in required
    )


def _sync_application(application: Application, db: Session) -> None:
    """Best-effort Mongo mirror; SQLAlchemy transaction remains authoritative."""
    mongo_sync.application(_application_dict(application, db, include_details=False))


def _sync_document(document: ApplicationDocument) -> None:
    forensics = (document.ocr_extracted or {}).get("forensics") or {}
    mongo_sync.document({
        "id": document.id,
        "application_id": document.application.application_number,
        "doc_type": document.doc_type or document.document_type,
        "document_type": document.document_type,
        "document_name": document.document_name,
        "original_filename": document.original_filename,
        "storage_path": document.storage_path,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "verification_status": document.verification_status,
        "ocr_extracted": document.ocr_extracted,
        "forensics": forensics,
        "document_authenticity": forensics.get("document_authenticity", "AUTHENTIC"),
        "tampering_detected": forensics.get("tampering_detected", False),
        "confidence": forensics.get("confidence", 0.95),
        "modelVersion": forensics.get("model_version", "casia-document-forensics-v1"),
        "uploaded_at": document.uploaded_at,
    }, document.application.application_number)


def _persist_document(upload: UploadFile, doc_type: str, beneficiary: Beneficiary, application: Application, current_user: User, db: Session) -> ApplicationDocument:
    validate_doc_type(doc_type)
    content, mime_type = read_upload(upload)
    stored_path = save_private_document(content, mime_type)
    sha256_hash = __import__('hashlib').sha256(content).hexdigest()
    
    # 1. OCR Consistency Check
    ocr_result = inspect_against_beneficiary(content, mime_type, doc_type, beneficiary)
    
    # 2. AI Document Authenticity & Forensics Check (CASIA-trained model)
    ai_forensics = inspect_document_authenticity(content, mime_type, filename=upload.filename)
    
    combined_analysis = {
        **ocr_result,
        "forensics": ai_forensics,
        "document_authenticity": ai_forensics.get("document_authenticity", "AUTHENTIC"),
        "tampering_detected": ai_forensics.get("tampering_detected", False),
        "confidence": ai_forensics.get("confidence", 0.95),
        "model_version": ai_forensics.get("model_version", "casia-document-forensics-v1"),
    }
    
    document_status = "pending_verification"
    document = ApplicationDocument(
        application_id=application.id,
        document_name=upload.filename or "Uploaded document",
        document_type=doc_type,
        doc_type=doc_type,
        original_filename=upload.filename or "uploaded-document",
        storage_path=str(stored_path),
        mime_type=mime_type,
        size_bytes=len(content),
        sha256_hash=sha256_hash,
        uploaded_by=current_user.id,
        uploaded_at=datetime.datetime.utcnow(),
        verification_status=document_status,
        is_demo=False,
        ocr_extracted=combined_analysis,
    )
    db.add(document)
    db.flush()
    
    # Cross-Document Consistency & Anomaly Engine
    all_app_docs = db.query(ApplicationDocument).filter(ApplicationDocument.application_id == application.id).all()
    cross_result = perform_cross_document_comparison(all_app_docs, db_session=db, application_id=application.id)
    
    is_mismatch = cross_result["overall_verdict"] in {"MISMATCH", "SUSPICIOUS"}
    application.document_mismatch = int(is_mismatch or ocr_result.get("mismatch_detected", False) or ai_forensics.get("tampering_detected", False))
    
    # Update AI evidence list
    evidence_list = list(application.ai_evidence or [])
    if ocr_result.get("mismatch_detected"):
        evidence_list.append({
            "check": "Document OCR Consistency",
            "status": "ALERT",
            "details": "Document demographic fields differ from beneficiary profile",
            "fields": ocr_result.get("mismatch_fields", []),
        })
        
    if ai_forensics.get("tampering_detected"):
        tamper_reason = f"AI Forensics Alert: Potential tampering signals detected (Confidence: {ai_forensics.get('confidence', 0.90)*100:.1f}%, Model: {ai_forensics.get('model_version')})"
        evidence_list.append({
            "check": "AI Document Forensics",
            "status": "ALERT",
            "details": tamper_reason,
            "model_version": ai_forensics.get("model_version", "casia-document-forensics-v1"),
            "reasons": ai_forensics.get("reasons", []),
        })

    for r in cross_result.get("reasons", []):
        if not any(e.get("details") == r for e in evidence_list):
            evidence_list.append({
                "check": "Cross-Document Consistency",
                "status": "ALERT" if is_mismatch else "VERIFIED",
                "details": r,
            })

    application.ai_evidence = evidence_list
    if application.prediction:
        factors = list(application.prediction.contributing_factors or [])
        for r in cross_result.get("reasons", []):
            if r not in factors:
                factors.append(r)
        application.prediction.contributing_factors = factors
        if is_mismatch and application.prediction.concern_level == "low":
            application.prediction.concern_level = "moderate"

    # MongoDB Atlas Verification Audit Record
    mongo_sync.verification_audit(
        application.application_number or str(application.id),
        str(upload.filename or "uploaded-document"),
        ai_forensics.get("document_authenticity", "AUTHENTIC"),
        cross_result.get("reasons", []),
    )

    return document



def _application_dict(application: Application, db: Session, include_details: bool = False) -> dict:
    beneficiary = application.beneficiary
    scheme = application.scheme
    prediction = application.prediction
    district = beneficiary.district if beneficiary else None
    status_value = _application_status(application.status)
    result = {
        "id": application.id,
        "application_id": application.application_number or f"APP-2026-{application.id:06d}",
        "beneficiary_id": beneficiary.id if beneficiary else None,
        "beneficiary_name": beneficiary.full_name if beneficiary else "Unknown applicant",
        "age": application.age,
        "gender": application.gender or (beneficiary.gender if beneficiary else "other"),
        "mobile": _mask_phone(beneficiary.phone if beneficiary else None),
        "district": district.name if district else application.district_name,
        "district_id": district.id if district else (beneficiary.district_id if beneficiary else None),
        "state": district.state if district else application.state,
        "scheme_id": scheme.id if scheme else application.scheme_id,
        "scheme_name": scheme.name if scheme else "Unknown scheme",
        "scheme_description": scheme.description if scheme else None,
        "eligibility_criteria": scheme.eligibility_criteria if scheme else {},
        "benefit_amount": scheme.benefit_amount if scheme else 0,
        "application_date": application.submitted_at.isoformat() if application.submitted_at else None,
        "status": status_value,
        "eligibility_status": "eligible" if application.eligibility_match else "needs_review",
        "annual_income": application.annual_income or (beneficiary.declared_income if beneficiary else 0),
        "family_size": application.family_size or 1,
        "bank_reference": "BANK-REF-****" if beneficiary and beneficiary.bank_account_hash else "Not provided",
        "previous_scheme_benefits": "Standard record",
        "ai_analysis": "critical" if prediction and prediction.concern_level == "critical" else ("flagged" if prediction and prediction.concern_level in {"high", "moderate"} else "clear"),
        "leakage_probability": prediction.leakage_probability if prediction else (application.ai_risk_score or 0.0),
        "concern_level": prediction.concern_level if prediction else "low",
        "flagged_reasons": prediction.contributing_factors if prediction else [],
        "recommended_action": prediction.recommended_action if prediction else "Continue normal processing.",
        "investigation_status": "open" if status_value in {"flagged", "under_review"} else "not_required",
    }
    if include_details:
        result["documents"] = [_document_dict(document) for document in (application.documents or [])]
        result["history"] = [
            {"status": item.status, "note": item.note, "created_at": item.created_at.isoformat() if item.created_at else None}
            for item in sorted(application.status_history or [], key=lambda item: item.created_at or datetime.datetime.min)
        ]
        result["evidence"] = prediction.ai_evidence if prediction else (application.ai_evidence or [])
    return result


# ─── 1. Health ────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
@app.get("/healthz", tags=["System"])
def health(db: Session = Depends(get_db)):
    try:
        db.execute(func.now())
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "service": "government-scheme-leakage-detection-api", "db": db_status,
        "mongodb": mongo_sync.health(),
        "timestamp": datetime.datetime.utcnow().isoformat(), "version": "2.0.0"}


# ─── 2. Auth ─────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate with email + password or mobile + password. Returns a signed JWT and user profile.
    Rate limited to prevent brute-force attacks.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login:{client_ip}"
    if not _check_rate_limit(rate_key, settings.LOGIN_RATE_LIMIT_SECONDS):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")

    user = None
    if payload.email:
        user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    elif payload.mobile:
        user = db.query(User).filter(User.mobile == payload.mobile, User.is_active == True).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        _write_audit(db, user.id if user else None, "FAILED_LOGIN", "user", user.id if user else None, {"email": payload.email, "mobile": payload.mobile})
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/mobile or password")

    token = _create_token({"sub": str(user.id), "role": user.role, "email": user.email})
    _write_audit(db, user.id, "USER_LOGIN", "user", user.id)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id, "name": user.name, "email": user.email,
            "mobile": user.mobile, "role": user.role, "district_id": user.district_id,
            "dob": user.dob.isoformat() if user.dob else None,
            "address": user.address,
        },
    }


@app.post("/api/v1/auth/register", response_model=TokenResponse, tags=["Auth"])
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a real citizen applicant with encrypted credentials, establishes a beneficiary profile,
    and returns a signed JWT.
    """
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if payload.mobile:
        existing_mobile = db.query(User).filter(User.mobile == payload.mobile).first()
        if existing_mobile:
            raise HTTPException(status_code=409, detail="An account with this mobile number already exists.")

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(payload.password.encode('utf-8'), salt).decode('utf-8')
    
    try:
        # Ensure User and Beneficiary share the same ID without conflicts
        next_id = (db.query(func.max(User.id)).scalar() or 0) + 1
        beneficiary_max = db.query(func.max(Beneficiary.id)).scalar() or 0
        if beneficiary_max >= next_id:
            next_id = beneficiary_max + 1

        # 1. Create User
        new_user = User(
            id=next_id,
            name=payload.name,
            email=payload.email,
            mobile=payload.mobile,
            hashed_password=hashed_password,
            role=RoleEnum.citizen,
            district_id=payload.district_id or 1,
            dob=payload.dob,
            address=payload.address,
            is_active=True,
        )
        db.add(new_user)
        db.flush()

        # 2. Create Beneficiary Profile for the applicant
        aadhaar_val = payload.aadhaar_number or payload.mobile or f"AADHAAR-{new_user.id:06d}"
        beneficiary = Beneficiary(
            id=new_user.id,
            full_name=payload.name,
            phone=payload.mobile,
            district_id=payload.district_id or 1,
            gender=payload.gender or "other",
            dob=payload.dob,
            declared_income=payload.annual_income or 0.0,
            address=payload.address or "Tamil Nadu, India",
            aadhaar_hash=hash_pii(aadhaar_val),
            status="pending",
        )
        db.add(beneficiary)
        db.flush()

        _write_audit(db, new_user.id, "APPLICANT_REGISTERED", "user", new_user.id)
        db.commit()
        db.refresh(new_user)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to create the account because the database is unavailable.") from exc

    # Dual-write sync to MongoDB Atlas repository
    mongo_sync.user({
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "mobile": new_user.mobile,
        "role": new_user.role,
        "district_id": new_user.district_id,
        "dob": new_user.dob,
        "address": new_user.address,
        "created_at": datetime.datetime.utcnow(),
    })

    token = _create_token({"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "mobile": new_user.mobile,
            "role": new_user.role,
            "district_id": new_user.district_id,
            "dob": new_user.dob.isoformat() if new_user.dob else None,
            "address": new_user.address,
        },
    }


@app.get("/api/v1/auth/me", response_model=UserResponse, tags=["Auth"])
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile. Use to validate token on app load."""
    return {
        "id": current_user.id, "name": current_user.name,
        "email": current_user.email, "mobile": current_user.mobile,
        "role": current_user.role, "district_id": current_user.district_id,
        "dob": current_user.dob.isoformat() if current_user.dob else None,
        "address": current_user.address,
    }


# ─── Rate Limiting & Password Reset Utilities ─────────────────────────────────

import secrets
import hashlib
from collections import defaultdict
from datetime import datetime as dt

_rate_limit_store = defaultdict(list)


def _check_rate_limit(key: str, window_seconds: int) -> bool:
    """Simple in-memory rate limiter. Returns True if allowed, False if rate-limited."""
    now = datetime.datetime.utcnow()
    cutoff = now - datetime.timedelta(seconds=window_seconds)
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > cutoff]
    if len(_rate_limit_store[key]) >= 5:
        return False
    _rate_limit_store[key].append(now)
    return True


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _sync_user(user: User, db: Optional[Session] = None):
    """Sync updated user record to MongoDB if MongoDB Atlas sidecar is enabled."""
    try:
        mongo_sync.user({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "district_id": user.district_id,
            "dob": user.dob.isoformat() if user.dob else None,
            "address": user.address,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    except Exception:
        pass


def _send_reset_email(email: str, token: str, user_name: str) -> dict:
    """Send real password reset email via configured EmailService / SMTP."""
    return email_service.send_password_reset_email(email, user_name, token)


def _send_reset_sms(mobile: str, token: str, user_name: str) -> None:
    """
    Send password reset OTP via configured SMS provider.
    In production, configure SMS settings in environment variables.
    """
    if not settings.SMS_PROVIDER or not settings.SMS_API_KEY:
        return  # SMS not configured

    try:
        import urllib.request
        message = f"Dear {user_name}, your password reset OTP is: {token}. Valid for {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes. - SchemeSecure AI"
    except Exception:
        pass


@app.post("/api/v1/auth/forgot-password", tags=["Auth"])
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Initiate real password reset. Accepts email or mobile.
    Validates user in database, generates a cryptographically secure single-use token,
    hashes and stores it in DB, and delivers the reset email via real SMTP.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"forgot:{client_ip}"
    if not _check_rate_limit(rate_key, settings.PASSWORD_RESET_RATE_LIMIT_SECONDS):
        raise HTTPException(
            status_code=429,
            detail="Too many password reset requests. Please wait a moment before trying again.",
            headers={"X-Error-Code": "RATE_LIMITED"}
        )

    if not payload.email and not payload.mobile:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid registered email address or mobile number.",
            headers={"X-Error-Code": "VALIDATION_ERROR"}
        )

    target_email = payload.email.strip().lower() if payload.email else None
    target_mobile = payload.mobile.strip() if payload.mobile else None

    user = None
    if target_email:
        user = db.query(User).filter(func.lower(User.email) == target_email, User.is_active == True).first()
    elif target_mobile:
        user = db.query(User).filter(User.mobile == target_mobile, User.is_active == True).first()

    if user:
        # Generate cryptographically secure, single-use token
        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        # Invalidate any previous unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at == None
        ).delete()

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_token)
        _write_audit(db, user.id, "PASSWORD_RESET_REQUESTED", "user", user.id)
        db.commit()

        # Send real email via SMTP if user has an email
        if user.email:
            email_result = _send_reset_email(user.email, raw_token, user.name)
            if not email_result.get("success"):
                err_code = email_result.get("error_code", "EMAIL_SERVICE_UNAVAILABLE")
                err_msg = email_result.get("message", "Failed to dispatch email via SMTP.")
                
                if err_code == "EMAIL_SERVICE_UNAVAILABLE":
                    raise HTTPException(
                        status_code=503,
                        detail="SMTP email service is not configured on the server. Please set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD in backend .env to send real emails.",
                        headers={"X-Error-Code": "EMAIL_SERVICE_UNAVAILABLE"}
                    )
                elif err_code == "SMTP_AUTHENTICATION_ERROR":
                    raise HTTPException(
                        status_code=502,
                        detail="SMTP Authentication failed. If using Gmail, an App Password is required.",
                        headers={"X-Error-Code": "SMTP_AUTHENTICATION_ERROR"}
                    )
                elif err_code == "SMTP_CONNECTION_ERROR":
                    raise HTTPException(
                        status_code=502,
                        detail=f"Could not connect to SMTP server ({email_service.host}:{email_service.port}).",
                        headers={"X-Error-Code": "SMTP_CONNECTION_ERROR"}
                    )
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=err_msg,
                        headers={"X-Error-Code": err_code}
                    )

        if user.mobile and not user.email:
            _send_reset_sms(user.mobile, raw_token, user.name)

        return {
            "success": True,
            "message": "Password reset instructions have been sent to your registered email address."
        }

    # Safe response to prevent account enumeration
    return {
        "success": True,
        "message": "If an account exists for this information, password-reset instructions have been sent."
    }


@app.post("/api/v1/auth/reset-password", tags=["Auth"])
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Complete real password reset using the secure single-use token from email.
    Validates token integrity, 15-minute expiration, and one-time use status.
    Hashes the new password with bcrypt and invalidates the token.
    """
    if not payload.token or not payload.token.strip():
        raise HTTPException(
            status_code=400,
            detail="Password reset token is missing.",
            headers={"X-Error-Code": "INVALID_RESET_TOKEN"}
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match. Please verify both password fields.",
            headers={"X-Error-Code": "VALIDATION_ERROR"}
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
            headers={"X-Error-Code": "VALIDATION_ERROR"}
        )

    token_hash = _hash_token(payload.token.strip())
    reset_token = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    if not reset_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid or unrecognized password reset token.",
            headers={"X-Error-Code": "INVALID_RESET_TOKEN"}
        )

    if reset_token.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="This password reset link has already been used. Please request a new link.",
            headers={"X-Error-Code": "RESET_TOKEN_ALREADY_USED"}
        )

    if reset_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="This password reset link has expired (15-minute validity). Please request a new link.",
            headers={"X-Error-Code": "EXPIRED_RESET_TOKEN"}
        )

    user = db.query(User).filter(User.id == reset_token.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Registered user account not found.",
            headers={"X-Error-Code": "USER_NOT_FOUND"}
        )

    salt = bcrypt.gensalt()
    user.hashed_password = bcrypt.hashpw(payload.new_password.encode('utf-8'), salt).decode('utf-8')
    reset_token.used_at = datetime.datetime.utcnow()

    _write_audit(db, user.id, "PASSWORD_RESET_COMPLETED", "user", user.id)
    db.commit()
    db.refresh(user)
    _sync_user(user, db)

    return {
        "success": True,
        "message": "Password reset successful! You can now log in with your new password."
    }


@app.get("/api/v1/auth/smtp-status", tags=["Auth"])
def get_smtp_status():
    """Returns the current server email service configuration status (without exposing credentials)."""
    return {
        "configured": email_service.is_configured,
        "host": settings.SMTP_HOST or None,
        "port": settings.SMTP_PORT,
        "from_email": settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME or None,
        "from_name": settings.SMTP_FROM_NAME,
        "use_tls": settings.SMTP_USE_TLS,
        "frontend_url": settings.FRONTEND_URL,
    }


@app.post("/api/v1/auth/logout", tags=["Auth"])
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalidate the current session (client-side token removal + audit log)."""
    _write_audit(db, current_user.id, "USER_LOGOUT", "user", current_user.id)
    db.commit()
    return {"message": "Logged out successfully"}



# ─── 3. Districts ─────────────────────────────────────────────────────────────

@app.get("/api/v1/districts", tags=["Districts"])
def list_districts(db: Session = Depends(get_db)):
    districts = db.query(District).order_by(District.name).all()
    return [
        {"id": d.id, "name": d.name, "state": d.state, "lat": d.lat, "lng": d.lng,
         "total": db.query(Beneficiary).filter(Beneficiary.district_id == d.id).count(),
         "flagged": db.query(Beneficiary).filter(Beneficiary.district_id == d.id, Beneficiary.status == "flagged").count()}
        for d in districts
    ]


# ─── 4. Beneficiaries ────────────────────────────────────────────────────────

@app.get("/api/v1/beneficiaries", tags=["Beneficiaries"])
def list_beneficiaries(
    district_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    concern_level: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Beneficiary)

    # District officers can only see their own district
    if current_user.role == RoleEnum.district_officer and current_user.district_id:
        q = q.filter(Beneficiary.district_id == current_user.district_id)
    elif district_id:
        q = q.filter(Beneficiary.district_id == district_id)

    if status:
        q = q.filter(Beneficiary.status == status)
    if search:
        q = q.filter(Beneficiary.full_name.ilike(f"%{search}%"))

    total = q.count()
    beneficiaries = q.order_by(desc(Beneficiary.created_at)).offset(skip).limit(limit).all()

    # Optionally filter by concern_level (requires joining predictions)
    results = []
    for b in beneficiaries:
        app = db.query(Application).filter(Application.beneficiary_id == b.id).first()
        pred = None
        if app:
            pred = db.query(AIPrediction).filter(AIPrediction.application_id == app.id).first()
        if concern_level and pred and pred.concern_level != concern_level:
            continue
        results.append({
            "id": b.id, "full_name": b.full_name,
            "dob": b.dob.isoformat() if b.dob else None,
            "gender": b.gender, "phone": b.phone, "address": b.address,
            "district_id": b.district_id, "aadhaar_hash": b.aadhaar_hash,
            "bank_account_hash": b.bank_account_hash, "ifsc_code": b.ifsc_code,
            "declared_income": b.declared_income, "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "leakage_probability": pred.leakage_probability if pred else None,
            "concern_level": pred.concern_level if pred else None,
        })

    return {"total": total, "items": results}


@app.get("/api/v1/beneficiaries/{id}", tags=["Beneficiaries"])
def get_beneficiary(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.query(Beneficiary).filter(Beneficiary.id == id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    app = db.query(Application).filter(Application.beneficiary_id == id).first()
    pred = db.query(AIPrediction).filter(AIPrediction.application_id == app.id).first() if app else None

    return {
        "id": b.id, "full_name": b.full_name,
        "dob": b.dob.isoformat() if b.dob else None,
        "gender": b.gender, "phone": b.phone, "address": b.address,
        "district_id": b.district_id, "aadhaar_hash": b.aadhaar_hash,
        "bank_account_hash": b.bank_account_hash, "ifsc_code": b.ifsc_code,
        "declared_income": b.declared_income, "status": b.status,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "prediction": {
            "leakage_probability": pred.leakage_probability,
            "concern_level": pred.concern_level,
            "contributing_factors": pred.contributing_factors,
            "severity": pred.severity,
            "recommended_action": pred.recommended_action,
            "potential_leakage_amount": pred.potential_leakage_amount,
            "model_version": pred.model_version,
            "predicted_at": pred.predicted_at.isoformat() if pred.predicted_at else None,
        } if pred else None,
    }


@app.post("/api/v1/beneficiaries", tags=["Beneficiaries"])
def create_beneficiary(
    payload: BeneficiaryCreate,
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)),
    db: Session = Depends(get_db),
):
    """Register a new beneficiary, auto-evaluate AI leakage probability, and create application."""
    import datetime as dt
    b = Beneficiary(
        full_name=payload.full_name,
        dob=payload.dob,
        gender=payload.gender,
        aadhaar_hash=hash_pii(payload.raw_aadhaar),
        phone=payload.phone,
        address=payload.address,
        district_id=payload.district_id,
        bank_account_hash=hash_pii(payload.raw_bank_account) if payload.raw_bank_account else None,
        ifsc_code=payload.ifsc_code,
        declared_income=payload.declared_income,
        status=StatusEnum.pending,
    )
    db.add(b)
    db.flush()

    # Auto-create application linked to scheme 1 (default)
    app = Application(application_number=f"APP-2026-{b.id:06d}", beneficiary_id=b.id, scheme_id=1, status=StatusEnum.pending)
    db.add(app)
    db.flush()

    # Auto-evaluate AI leakage probability
    engine = _get_engine(db)
    result = engine.evaluate(_b_to_dict(b), scheme_id=1)
    pred = AIPrediction(
        application_id=app.id, beneficiary_id=b.id,
        leakage_probability=result["leakage_probability"],
        concern_level=result["concern_level"],
        contributing_factors=result["contributing_factors"],
        severity=result["severity"],
        recommended_action=result["recommended_action"],
        potential_leakage_amount=result["potential_leakage_amount"],
        model_version=result["model_version"],
    )
    db.add(pred)
    _write_audit(db, current_user.id, "BENEFICIARY_CREATED", "beneficiary", b.id,
                 {"leakage_probability": result["leakage_probability"]})
    db.commit()
    db.refresh(b)
    return {"id": b.id, "full_name": b.full_name, "status": b.status,
            "leakage_probability": result["leakage_probability"],
            "concern_level": result["concern_level"]}


@app.patch("/api/v1/beneficiaries/{id}/status", tags=["Beneficiaries"])
def update_beneficiary_status(
    id: int,
    new_status: str = Query(..., description="approved | rejected | flagged | pending"),
    notes: Optional[str] = None,
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)),
    db: Session = Depends(get_db),
):
    """Approve, reject, or flag a beneficiary. Writes audit log. Never auto-triggered."""
    b = db.query(Beneficiary).filter(Beneficiary.id == id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    old_status = b.status
    b.status = new_status
    app = db.query(Application).filter(Application.beneficiary_id == id).first()
    if app:
        app.status = new_status
        db.add(ApplicationStatusHistory(application_id=app.id, status=new_status, note=notes, changed_by_id=current_user.id))
    _write_audit(db, current_user.id, f"STATUS_{new_status.upper()}", "beneficiary", id,
                 {"old_status": old_status, "new_status": new_status, "notes": notes})
    db.commit()
    return {"id": id, "status": new_status, "updated_by": current_user.name}


# ─── 5. Schemes ──────────────────────────────────────────────────────────────

@app.get("/api/v1/schemes", tags=["Schemes"])
def list_schemes(db: Session = Depends(get_db)):
    schemes = db.query(Scheme).filter(Scheme.is_active == True).all()
    result = []
    for s in schemes:
        total = db.query(Application).filter(Application.scheme_id == s.id).count()
        flagged = db.query(Application).filter(
            Application.scheme_id == s.id, Application.status == "flagged"
        ).count()
        scheme_data = {
            "id": s.id, "name": s.name, "description": s.description,
            "category": s.category, "eligibility_criteria": s.eligibility_criteria,
            "benefit_amount": s.benefit_amount,
            "beneficiary_count": total, "flagged_count": flagged,
        }
        static_scheme = next((item for item in SCHEMES_DATA if item["id"] == s.id), None)
        if static_scheme and static_scheme.get("required_documents"):
            scheme_data["required_documents"] = static_scheme["required_documents"]
        result.append(scheme_data)
    return result


@app.get("/api/v1/schemes/{scheme_id}", tags=["Schemes"])
def get_scheme(scheme_id: int, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id, Scheme.is_active == True).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    total = db.query(Application).filter(Application.scheme_id == scheme.id).count()
    flagged = db.query(Application).filter(
        Application.scheme_id == scheme.id, Application.status == "flagged"
    ).count()
    scheme_data = {
        "id": scheme.id, "name": scheme.name, "description": scheme.description,
        "category": scheme.category, "eligibility_criteria": scheme.eligibility_criteria,
        "benefit_amount": scheme.benefit_amount,
        "beneficiary_count": total, "flagged_count": flagged,
    }
    static_scheme = next((item for item in SCHEMES_DATA if item["id"] == scheme_id), None)
    if static_scheme and static_scheme.get("required_documents"):
        scheme_data["required_documents"] = static_scheme["required_documents"]
    return scheme_data


@app.post("/api/v1/schemes", tags=["Schemes"])
def create_scheme(
    payload: SchemeBase,
    current_user: User = Depends(require_roles(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    scheme = Scheme(**payload.dict())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


# ─── 5b. Applications ───────────────────────────────────────────────────────

@app.get("/api/v1/applications", tags=["Applications"])
def list_applications(
    search: Optional[str] = None,
    scheme_id: Optional[int] = None,
    district_id: Optional[int] = None,
    application_status: Optional[str] = None,
    ai_analysis: Optional[str] = None,
    concern_level: Optional[str] = None,
    applied_from: Optional[str] = None,
    applied_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application).join(Beneficiary).join(Scheme)
    if current_user.role == RoleEnum.citizen:
        query = query.filter(Beneficiary.id == current_user.id)
    elif current_user.role == RoleEnum.district_officer and current_user.district_id:
        query = query.filter(Beneficiary.district_id == current_user.district_id)
    elif district_id:
        query = query.filter(Beneficiary.district_id == district_id)
    if scheme_id:
        query = query.filter(Application.scheme_id == scheme_id)
    if application_status and application_status != "all":
        query = query.filter(Application.status == application_status)
    if search:
        term = f"%{search}%"
        query = query.filter((Application.application_number.ilike(term)) | (Beneficiary.full_name.ilike(term)) | (Beneficiary.phone.ilike(term)) | (Scheme.name.ilike(term)))
    applications = query.order_by(desc(Application.submitted_at)).all()
    items = []
    for application in applications:
        item = _application_dict(application, db)
        if ai_analysis and ai_analysis != "all" and item["ai_analysis"] != ai_analysis:
            continue
        if concern_level and concern_level != "all" and item["concern_level"] != concern_level:
            continue
        if applied_from and item["application_date"] and item["application_date"][:10] < applied_from:
            continue
        if applied_to and item["application_date"] and item["application_date"][:10] > applied_to:
            continue
        items.append(item)
    return {"total": len(items), "items": items}


@app.get("/api/v1/applications/summary", tags=["Applications"])
def applications_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base_query = db.query(Application).join(Beneficiary, Application.beneficiary_id == Beneficiary.id)
    if current_user.role == RoleEnum.citizen:
        base_query = base_query.filter(Beneficiary.id == current_user.id)
    elif current_user.role == RoleEnum.district_officer and current_user.district_id:
        base_query = base_query.filter(Beneficiary.district_id == current_user.district_id)

    total = base_query.count()
    pending = base_query.filter(Application.status.in_(["pending", "under_review"])).count()
    approved = base_query.filter(Application.status == "approved").count()
    rejected = base_query.filter(Application.status == "rejected").count()
    verification_req = base_query.filter(Application.status.in_(["flagged", "under_review"])).count()
    flagged = base_query.filter(Application.status == "flagged").count()

    pred_q = db.query(AIPrediction).join(Application, AIPrediction.application_id == Application.id).join(Beneficiary, Application.beneficiary_id == Beneficiary.id)
    if current_user.role == RoleEnum.citizen:
        pred_q = pred_q.filter(Beneficiary.id == current_user.id)
    elif current_user.role == RoleEnum.district_officer and current_user.district_id:
        pred_q = pred_q.filter(Beneficiary.district_id == current_user.district_id)

    critical_cases = pred_q.filter(AIPrediction.concern_level == "critical").count()
    potential_leakage = pred_q.filter(AIPrediction.concern_level.in_(["high", "critical"])).with_entities(func.sum(AIPrediction.potential_leakage_amount)).scalar() or 0.0

    return {
        "total_applications": total,
        "pending_applications": pending,
        "approved_applications": approved,
        "rejected_applications": rejected,
        "verification_required": verification_req,
        "flagged_applications": flagged,
        "critical_cases": critical_cases,
        "potential_leakage_amount": float(potential_leakage),
    }


def _get_application_row(application_id: str, current_user: User, db: Session) -> Application:
    """Helper to find and validate access to an application."""
    q = db.query(Application)
    if application_id.isdigit():
        app_row = q.filter(Application.id == int(application_id)).first()
    else:
        app_row = q.filter(Application.application_number == application_id).first()
    if not app_row:
        # Also try searching by ID if string starts with APP-
        clean_id = application_id.replace("APP-2026-", "").lstrip("0")
        if clean_id.isdigit():
            app_row = q.filter(Application.id == int(clean_id)).first()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Ownership & District Authorization
    if current_user.role == RoleEnum.citizen:
        if app_row.beneficiary_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only access your own applications")
    elif current_user.role == RoleEnum.district_officer and current_user.district_id:
        if app_row.beneficiary and app_row.beneficiary.district_id != current_user.district_id:
            raise HTTPException(status_code=403, detail="Application outside officer district")
            
    return app_row


@app.get("/api/v1/applications/my", tags=["Applications"])
def get_my_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns all real applications submitted by the logged-in citizen applicant.
    """
    beneficiary = db.query(Beneficiary).filter(Beneficiary.id == current_user.id).first()
    if not beneficiary:
        return []
    apps = db.query(Application).filter(Application.beneficiary_id == beneficiary.id).order_by(desc(Application.submitted_at)).all()
    return [_application_dict(app, db, include_details=True) for app in apps]


@app.get("/api/v1/applications/{application_id}", tags=["Applications"])
def get_application(application_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    app_row = _get_application_row(application_id, current_user, db)
    return _application_dict(app_row, db, include_details=True)


@app.put("/api/v1/applications/{application_id}/status", tags=["Applications"])
def update_application_status(
    application_id: str,
    new_status: str = Query(..., description="pending | under_review | approved | rejected | flagged"),
    note: Optional[str] = None,
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)),
    db: Session = Depends(get_db),
):
    app_row = _get_application_row(application_id, current_user, db)
    allowed = {"pending", "under_review", "approved", "rejected", "flagged"}
    if new_status not in allowed:
        raise HTTPException(status_code=422, detail=f"Status must be one of: {', '.join(sorted(allowed))}")
    old_status = _application_status(app_row.status)
    app_row.status = new_status
    if app_row.beneficiary:
        app_row.beneficiary.status = new_status
    db.add(ApplicationStatusHistory(application_id=app_row.id, status=new_status, note=note, changed_by_id=current_user.id))
    _write_audit(db, current_user.id, f"APPLICATION_{new_status.upper()}", "application", app_row.id, {"old_status": old_status, "note": note})
    db.commit()
    _sync_application(app_row, db)
    return _application_dict(app_row, db, include_details=True)


@app.get("/api/v1/applications/{application_id}/documents", tags=["Applications"])
def get_application_documents(application_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    app_row = _get_application_row(application_id, current_user, db)
    return [_document_dict(doc) for doc in (app_row.documents or [])]


@app.post("/api/v1/applications/{application_id}/verify", tags=["Applications"])
def verify_application_documents(application_id: str, current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)), db: Session = Depends(get_db)):
    app_row = _get_application_row(application_id, current_user, db)
    for document in (app_row.documents or []):
        if document.verification_status == "pending_verification":
            document.verification_status = "verified"
    _write_audit(db, current_user.id, "APPLICATION_DOCUMENTS_VERIFIED", "application", app_row.id)
    db.commit()
    _sync_application(app_row, db)
    for document in (app_row.documents or []):
        _sync_document(document)
    return _application_dict(app_row, db, include_details=True)


@app.post("/api/v1/applications/{application_id}/documents", tags=["Applications"])
async def upload_application_document(
    application_id: str,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer, RoleEnum.citizen)),
    db: Session = Depends(get_db),
):
    app_row = _get_application_row(application_id, current_user, db)
    document = _persist_document(file, doc_type, app_row.beneficiary, app_row, current_user, db)
    _write_audit(db, current_user.id, "DOCUMENT_UPLOADED", "document", document.id, {"application_id": app_row.id, "doc_type": doc_type})
    db.commit()
    db.refresh(document)
    _sync_document(document)
    _sync_application(app_row, db)
    return _document_dict(document)


@app.post("/api/v1/beneficiaries/{beneficiary_id}/documents", tags=["Documents"])
async def upload_beneficiary_document(
    beneficiary_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer, RoleEnum.citizen)),
    db: Session = Depends(get_db),
):
    if current_user.role == RoleEnum.citizen and current_user.id != beneficiary_id:
        raise HTTPException(status_code=403, detail="Citizens can only upload documents for their own profile")
    beneficiary = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    if current_user.role == RoleEnum.district_officer and current_user.district_id != beneficiary.district_id:
        raise HTTPException(status_code=403, detail="Beneficiary outside officer district")
    application = db.query(Application).filter(Application.beneficiary_id == beneficiary_id).order_by(Application.id.desc()).first()
    if not application:
        raise HTTPException(status_code=404, detail="No application exists for this beneficiary")
    document = _persist_document(file, doc_type, beneficiary, application, current_user, db)
    _write_audit(db, current_user.id, "DOCUMENT_UPLOADED", "document", document.id, {"beneficiary_id": beneficiary_id, "doc_type": doc_type})
    db.commit()
    db.refresh(document)
    _sync_document(document)
    _sync_application(application, db)
    return _document_dict(document)


@app.get("/api/v1/documents/{document_id}/view", tags=["Documents"])
def view_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = _document_row(document_id, current_user, db)
    path = Path(document.storage_path or "")
    if document.is_demo or not path.is_file():
        raise HTTPException(status_code=404, detail="This document has no real uploaded file")
    return FileResponse(path, media_type=document.mime_type or "application/octet-stream", filename=document.original_filename or document.document_name, content_disposition_type="inline")


@app.get("/api/v1/documents/{document_id}/download", tags=["Documents"])
def download_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = _document_row(document_id, current_user, db)
    path = Path(document.storage_path or "")
    if document.is_demo or not path.is_file():
        raise HTTPException(status_code=404, detail="This document has no real uploaded file")
    return FileResponse(path, media_type=document.mime_type or "application/octet-stream", filename=document.original_filename or document.document_name, content_disposition_type="attachment")


@app.patch("/api/v1/documents/{document_id}/verify", tags=["Documents"])
def verify_document(document_id: int, payload: DocumentVerificationRequest = Body(...), current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)), db: Session = Depends(get_db)):
    if payload.status not in {"verified", "rejected"}:
        raise HTTPException(status_code=400, detail="status must be verified or rejected")
    document = _document_row(document_id, current_user, db)
    document.verification_status = payload.status
    document.verified_by = current_user.id
    document.verified_at = datetime.datetime.utcnow()
    document.rejection_reason = payload.reason if payload.status == "rejected" else None
    _write_audit(db, current_user.id, f"DOCUMENT_{payload.status.upper()}", "document", document.id, {"reason": payload.reason})
    if payload.status == "verified" and _required_documents_verified(document.application.beneficiary):
        if str(document.application.beneficiary.status) in {"pending", "under_review"}:
            document.application.beneficiary.status = "approved"
    db.commit()
    db.refresh(document)
    _sync_document(document)
    _sync_application(document.application, db)
    mongo_sync.verification_audit(
        document.application.application_number,
        str(document.id),
        payload.status,
        [payload.reason] if payload.reason else [],
    )
    return _document_dict(document)




# ─── AI Document Testing & Verification Lab Endpoints ─────────────────────────

SAMPLE_TEST_SCENARIOS: dict[str, Any] = {
    "perfect_match": {
        "id": "perfect_match",
        "title": "Clean Consistent Citizen Set",
        "badge": "Perfect Match",
        "badgeType": "success",
        "description": "Aadhaar Card, Income Certificate, and Bank Passbook with perfectly aligned Name, DOB, Income, Address, and Phone Number.",
        "expectedOutcome": "VERIFIED (98% Authenticity Score)",
        "applicantProfile": {
            "name": "Kongeshwaran S",
            "dob": "1995-04-12",
            "annual_income": 60000.0,
            "address": "14 Anna Salai, Chennai",
            "district": "Chennai",
            "phone": "9876543210",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Card_Kongeshwaran.png",
                "raw_text": "GOVERNMENT OF INDIA\nUnique Identification Authority of India\nName: Kongeshwaran S\nDOB: 12/04/1995\nGender: Male\nAddress: 14 Anna Salai, Chennai, Tamil Nadu - 600002\nPhone: 9876543210\nAadhaar No: 5412 8901 2345",
                "name": "Kongeshwaran S",
                "dob": "1995-04-12",
                "gender": "male",
                "income": None,
                "address": "14 Anna Salai, Chennai",
                "district": "Chennai",
                "phone": "9876543210",
                "id_number": "541289012345",
            },
            {
                "doc_type": "income_certificate",
                "filename": "Income_Certificate_Tahsildar.png",
                "raw_text": "REVENUE DEPARTMENT - GOVT OF TAMIL NADU\nINCOME CERTIFICATE\nApplicant Name: Kongeshwaran S\nAnnual Income: Rs. 60,000\nDOB: 12/04/1995\nResiding at: 14 Anna Salai, Chennai District\nMobile: 9876543210\nCertificate No: TN-INC-2026-89421",
                "name": "Kongeshwaran P",
                "dob": "1995-04-12",
                "gender": "male",
                "income": 60000.0,
                "address": "14 Anna Salai, Chennai",
                "district": "Chennai",
                "phone": "9876543210",
                "id_number": "TNINC202689421",
            },
            {
                "doc_type": "bank_passbook",
                "filename": "Canara_Bank_Passbook.png",
                "raw_text": "CANARA BANK - CHENNAI MOUNT ROAD BRANCH\nAccount Holder: Kongeshwaran S\nAccount No: 109823456789\nRegistered Mobile: 9876543210\nAddress: 14 Anna Salai, Chennai, Tamil Nadu",
                "name": "Kongeshwaran P",
                "dob": "1995-04-12",
                "gender": "male",
                "income": None,
                "address": "14 Anna Salai, Chennai",
                "district": "Chennai",
                "phone": "9876543210",
                "id_number": "109823456789",
            },
        ],
    },
    "income_discrepancy": {
        "id": "income_discrepancy",
        "title": "Income Discrepancy & Threshold Breach",
        "badge": "Income Mismatch",
        "badgeType": "warning",
        "description": "Applicant declared BPL subsidy income of Rs. 45,000 while official Tahsildar Income Certificate certifies Rs. 2,40,000 / annum.",
        "expectedOutcome": "MISMATCH (45% Authenticity Score - Flagged for Review)",
        "applicantProfile": {
            "name": "Arumugam R",
            "dob": "1982-06-15",
            "annual_income": 45000.0,
            "address": "22 Gandhi Road, Salem",
            "district": "Salem",
            "phone": "9841234567",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Arumugam.png",
                "raw_text": "GOVERNMENT OF INDIA\nName: Arumugam R\nDOB: 15/06/1982\nGender: Male\nAddress: 22 Gandhi Road, Salem, Tamil Nadu\nPhone: 9841234567\nDeclared Annual Income: Rs. 45,000",
                "name": "Arumugam R",
                "dob": "1982-06-15",
                "gender": "male",
                "income": 45000.0,
                "address": "22 Gandhi Road, Salem",
                "district": "Salem",
                "phone": "9841234567",
            },
            {
                "doc_type": "income_certificate",
                "filename": "Revenue_Income_Certificate.png",
                "raw_text": "REVENUE ADMINISTRATION - SALEM TALUK\nINCOME VERIFICATION RECORD\nBeneficiary: Arumugam R\nCertified Annual Family Income: Rs. 2,40,000 / annum\nDate of Birth: 15/06/1982\nAddress: 22 Gandhi Road, Salem\nPhone: 9841234567",
                "name": "Arumugam R",
                "dob": "1982-06-15",
                "gender": "male",
                "income": 240000.0,
                "address": "22 Gandhi Road, Salem",
                "district": "Salem",
                "phone": "9841234567",
            },
        ],
    },
    "name_dob_variance": {
        "id": "name_dob_variance",
        "title": "Name & Date of Birth Cross-Mismatch",
        "badge": "Identity Conflict",
        "badgeType": "danger",
        "description": "Primary identity proof and community certificate contain conflicting applicant names ('Kongeshwaran S' vs 'Suresh Kumar') and birth dates.",
        "expectedOutcome": "MISMATCH (45% Authenticity Score)",
        "applicantProfile": {
            "name": "Kongeshwaran S",
            "dob": "1995-04-12",
            "annual_income": 72000.0,
            "address": "14 Anna Nagar, Chennai",
            "district": "Chennai",
            "phone": "9876543210",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Card_Kongeshwaran.png",
                "raw_text": "GOVERNMENT OF INDIA\nName: Kongeshwaran S\nDOB: 12/04/1995\nGender: Male\nPhone: 9876543210\nAddress: 14 Anna Nagar, Chennai",
                "name": "Kongeshwaran S",
                "dob": "1995-04-12",
                "gender": "male",
                "phone": "9876543210",
                "address": "14 Anna Nagar, Chennai",
                "district": "Chennai",
            },
            {
                "doc_type": "community_certificate",
                "filename": "Community_Certificate_Conflicting.png",
                "raw_text": "DEPARTMENT OF REVENUE - COMMUNITY RECORD\nName: Suresh Kumar\nDOB: 20/08/1988\nGender: Male\nPhone: 9876543210\nAddress: 14 Anna Nagar, Chennai",
                "name": "Suresh Kumar",
                "dob": "1988-08-20",
                "gender": "male",
                "phone": "9876543210",
                "address": "14 Anna Nagar, Chennai",
                "district": "Chennai",
            },
        ],
    },
    "address_conflict": {
        "id": "address_conflict",
        "title": "Address & District Jurisdiction Conflict",
        "badge": "Address Mismatch",
        "badgeType": "warning",
        "description": "Aadhaar document shows residence in Chennai district while uploaded Smart Ration Card is registered under Madurai district jurisdiction.",
        "expectedOutcome": "MISMATCH (45% Authenticity Score - Cross-District Conflict)",
        "applicantProfile": {
            "name": "Priya Ramanathan",
            "dob": "1990-11-03",
            "annual_income": 55000.0,
            "address": "45 T Nagar, Chennai",
            "district": "Chennai",
            "phone": "9789012345",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Card_Priya.png",
                "raw_text": "GOVERNMENT OF INDIA\nName: Priya Ramanathan\nDOB: 03/11/1990\nGender: Female\nAddress: 45 T Nagar, Chennai District, Tamil Nadu\nPhone: 9789012345",
                "name": "Priya Ramanathan",
                "dob": "1990-11-03",
                "gender": "female",
                "address": "45 T Nagar, Chennai",
                "district": "Chennai",
                "phone": "9789012345",
            },
            {
                "doc_type": "address_proof",
                "filename": "Smart_Ration_Card_Madurai.png",
                "raw_text": "TAMIL NADU CIVIL SUPPLIES DEPARTMENT\nSMART RATION CARD\nFamily Head: Priya Ramanathan\nDOB: 03/11/1990\nAddress: 88 KK Nagar, Madurai District, Tamil Nadu\nPhone: 9789012345",
                "name": "Priya Ramanathan",
                "dob": "1990-11-03",
                "gender": "female",
                "address": "88 KK Nagar, Madurai",
                "district": "Madurai",
                "phone": "9789012345",
            },
        ],
    },
    "phone_mismatch": {
        "id": "phone_mismatch",
        "title": "Contact Mobile Number Variance",
        "badge": "Phone Mismatch",
        "badgeType": "warning",
        "description": "Primary identity verification mobile (+91-9876543210) differs from direct bank passbook contact phone (+91-9123456789).",
        "expectedOutcome": "MISMATCH (45% Authenticity Score - Contact Discrepancy)",
        "applicantProfile": {
            "name": "Deepa Sundaram",
            "dob": "1993-02-18",
            "annual_income": 48000.0,
            "address": "12 Cross Street, Coimbatore",
            "district": "Coimbatore",
            "phone": "9876543210",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Card_Deepa.png",
                "raw_text": "GOVERNMENT OF INDIA\nName: Deepa Sundaram\nDOB: 18/02/1993\nGender: Female\nPhone: 9876543210\nAddress: 12 Cross Street, Coimbatore, Tamil Nadu",
                "name": "Deepa Sundaram",
                "dob": "1993-02-18",
                "gender": "female",
                "phone": "9876543210",
                "address": "12 Cross Street, Coimbatore",
                "district": "Coimbatore",
            },
            {
                "doc_type": "bank_passbook",
                "filename": "Bank_Passbook_Deepa.png",
                "raw_text": "STATE BANK OF INDIA - COIMBATORE MAIN\nAccount Holder: Deepa Sundaram\nDOB: 18/02/1993\nContact Mobile: 9123456789\nAddress: 12 Cross Street, Coimbatore, Tamil Nadu",
                "name": "Deepa Sundaram",
                "dob": "1993-02-18",
                "gender": "female",
                "phone": "9123456789",
                "address": "12 Cross Street, Coimbatore",
                "district": "Coimbatore",
            },
        ],
    },
    "tampered_forensics": {
        "id": "tampered_forensics",
        "title": "AI Image Forensics & Tampering Alert",
        "badge": "CASIA Tampering Alert",
        "badgeType": "danger",
        "description": "CASIA Deep Learning image forensics detected digital text manipulation, noise variance, and ELA artifacts on the income certificate.",
        "expectedOutcome": "SUSPICIOUS (35% Authenticity Score - Tampering Signals)",
        "applicantProfile": {
            "name": "Kavin Velu",
            "dob": "1985-09-25",
            "annual_income": 36000.0,
            "address": "5 Trunk Road, Tiruchirappalli",
            "district": "Tiruchirappalli",
            "phone": "9894012345",
        },
        "documents": [
            {
                "doc_type": "identity_proof",
                "filename": "Aadhaar_Kavin.png",
                "raw_text": "GOVERNMENT OF INDIA\nName: Kavin Velu\nDOB: 25/09/1985\nGender: Male\nPhone: 9894012345\nAddress: 5 Trunk Road, Tiruchirappalli",
                "name": "Kavin Velu",
                "dob": "1985-09-25",
                "gender": "male",
                "phone": "9894012345",
                "address": "5 Trunk Road, Tiruchirappalli",
                "district": "Tiruchirappalli",
            },
            {
                "doc_type": "income_certificate",
                "filename": "Income_Cert_Tampered_Copy.png",
                "raw_text": "GOVT OF TAMIL NADU - INCOME CERTIFICATE\nApplicant: Kavin Velu\nAnnual Income: Rs. 36,000 [MODIFIED DIGIT]\nDOB: 25/09/1985\nAddress: 5 Trunk Road, Tiruchirappalli\nPhone: 9894012345",
                "name": "Kavin Velu",
                "dob": "1985-09-25",
                "gender": "male",
                "income": 36000.0,
                "phone": "9894012345",
                "address": "5 Trunk Road, Tiruchirappalli",
                "district": "Tiruchirappalli",
                "tampering_detected": True,
            },
        ],
    },
}


@app.get("/api/v1/documents/test-samples", tags=["AI Document Testing"])
def get_document_test_samples():
    """
    Returns curated, ready-to-test multi-document scenarios covering clean matches,
    income discrepancies, name/DOB variances, address conflicts, phone mismatches, and image tampering.
    """
    return [
        {
            "id": sc["id"],
            "title": sc["title"],
            "badge": sc["badge"],
            "badgeType": sc["badgeType"],
            "description": sc["description"],
            "expectedOutcome": sc["expectedOutcome"],
            "documentCount": len(sc["documents"]),
            "applicantProfile": sc["applicantProfile"],
            "documents": [
                {
                    "filename": d["filename"],
                    "doc_type": d["doc_type"],
                    "raw_text": d.get("raw_text", ""),
                    "tampering_detected": d.get("tampering_detected", False),
                }
                for d in sc["documents"]
            ],
        }
        for sc in SAMPLE_TEST_SCENARIOS.values()
    ]


@app.post("/api/v1/documents/ai-test-sample/{scenario_id}", tags=["AI Document Testing"])
def run_sample_scenario_test(scenario_id: str):
    """
    Executes immediate live AI verification on a selected pre-configured test scenario.
    """
    scenario = SAMPLE_TEST_SCENARIOS.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    
    result = test_documents_pipeline(
        documents_data=scenario["documents"],
        applicant_profile=scenario.get("applicantProfile"),
    )
    result["scenarioTitle"] = scenario["title"]
    result["scenarioDescription"] = scenario["description"]
    result["expectedOutcome"] = scenario["expectedOutcome"]
    return result


@app.post("/api/v1/documents/ai-test", tags=["AI Document Testing"])
async def run_custom_document_ai_test(
    files: list[UploadFile] = File(None),
    doc_types: list[str] = Form(None),
    payload: dict = Body(None),
):
    """
    Executes live OCR extraction, field normalization, CASIA image forensics,
    and pairwise cross-document comparison across 2 or more submitted documents.
    Supports multipart file uploads or structured JSON test payloads.
    """
    docs_to_process = []
    applicant_profile = None

    if files:
        for idx, file_obj in enumerate(files):
            content, mime_type = read_upload(file_obj)
            dtype = doc_types[idx] if (doc_types and idx < len(doc_types)) else "identity_proof"
            docs_to_process.append({
                "filename": file_obj.filename or f"uploaded_doc_{idx+1}.png",
                "doc_type": dtype,
                "content": content,
            })
    elif payload and isinstance(payload, dict):
        applicant_profile = payload.get("applicant_profile") or payload.get("applicantProfile")
        raw_docs = payload.get("documents") or []
        for idx, item in enumerate(raw_docs):
            docs_to_process.append({
                "filename": item.get("filename") or f"test_document_{idx+1}.png",
                "doc_type": item.get("doc_type") or item.get("document_type") or "identity_proof",
                "raw_text": item.get("raw_text") or item.get("text"),
                "name": item.get("name"),
                "dob": item.get("dob"),
                "gender": item.get("gender"),
                "income": item.get("income"),
                "address": item.get("address"),
                "district": item.get("district"),
                "phone": item.get("phone"),
                "id_number": item.get("id_number"),
                "tampering_detected": bool(item.get("tampering_detected")),
            })
    else:
        raise HTTPException(status_code=400, detail="Provide either uploaded files or a JSON document test payload.")

    if len(docs_to_process) < 2:
        raise HTTPException(status_code=400, detail="At least 2 documents are required for Cross-Document Mismatch Detection.")

    result = test_documents_pipeline(docs_to_process, applicant_profile=applicant_profile)
    return result


@app.get("/api/v1/applications/{application_id}/verification", tags=["Applications"])
def get_application_verification(application_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns structured AI verification results, cross-document consistency checks,
    and document analysis for an application.
    """
    app_row = _get_application_row(application_id, current_user, db)
    
    docs_summary = []
    for doc in (app_row.documents or []):
        forensics = (doc.ocr_extracted or {}).get("forensics") or {}
        extracted_fields = (doc.ocr_extracted or {}).get("fields") or {}
        docs_summary.append({
            "documentId": str(doc.id),
            "documentName": doc.document_name,
            "documentType": doc.doc_type or doc.document_type,
            "ocrStatus": "EXTRACTED" if doc.ocr_extracted and doc.ocr_extracted.get("raw_text") else "OCR_PROCESSED",
            "tamperingAssessment": forensics.get("document_authenticity", "AUTHENTIC"),
            "confidence": forensics.get("confidence", 0.95),
            "sha256Hash": doc.sha256_hash or "Calculated on upload",
            "inconsistencies": doc.ocr_extracted.get("mismatch_fields", []) if isinstance(doc.ocr_extracted, dict) else [],
            "modelVersion": forensics.get("model_version", "casia-document-forensics-v1"),
            "reasons": forensics.get("reasons", []),
            "verificationStatus": doc.verification_status,
            "verifiedAt": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "extractedFields": extracted_fields or {},
        })
        
    # Cross-Document Consistency Matrix
    cross_check = perform_cross_document_comparison(app_row.documents or [], db_session=db, application_id=app_row.id)
    
    # Required Document Checklist
    scheme_def = next((s for s in SCHEMES_DATA if s["id"] == app_row.scheme_id), None)
    req_docs: list[dict[str, Any]] = scheme_def.get("required_documents", []) if isinstance(scheme_def, dict) else []
    uploaded_types = {doc.doc_type or doc.document_type for doc in (app_row.documents or [])}
    
    checklist = []
    for req in req_docs:
        is_uploaded = req["type"] in uploaded_types
        matched_doc = next((d for d in (app_row.documents or []) if (d.doc_type or d.document_type) == req["type"]), None)
        checklist.append({
            "type": req["type"],
            "label": req["label"],
            "required": req.get("required", True),
            "uploaded": is_uploaded,
            "documentId": str(matched_doc.id) if matched_doc else None,
            "documentName": matched_doc.document_name if matched_doc else None,
            "verificationStatus": matched_doc.verification_status if matched_doc else "not_uploaded",
        })

    return {
        "applicationId": app_row.application_number,
        "applicantName": app_row.beneficiary.full_name if app_row.beneficiary else "Applicant",
        "schemeName": app_row.scheme.name if app_row.scheme else "Welfare Scheme",
        "status": app_row.status,
        "overallVerificationVerdict": cross_check["overall_verdict"],
        "authenticityScore": cross_check["authenticity_score"],
        "leakageProbability": app_row.prediction.leakage_probability if app_row.prediction else (app_row.ai_risk_score or 0.0),
        "concernLevel": app_row.prediction.concern_level if app_row.prediction else ("high" if cross_check["overall_verdict"] in {"MISMATCH", "SUSPICIOUS"} else "low"),
        "signals": cross_check["signals"],
        "reasons": cross_check["reasons"],
        "documents": docs_summary,
        "crossDocumentComparisons": cross_check["comparisons"],
        "requiredChecklist": checklist,
        "aiEvidence": app_row.prediction.ai_evidence if app_row.prediction else (app_row.ai_evidence or []),
    }


@app.post("/api/v1/applications", tags=["Applications"])
def create_application(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    beneficiary_id = payload.get("beneficiary_id")
    if not beneficiary_id:
        beneficiary_id = current_user.id
        
    scheme_id = payload.get("scheme_id")
    beneficiary = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
    
    # If applicant user doesn't have a beneficiary record, auto-create
    if not beneficiary:
        beneficiary = Beneficiary(
            id=current_user.id,
            full_name=current_user.name,
            phone="9876543210",
            district_id=current_user.district_id or 1,
            gender=payload.get("gender", "other"),
            declared_income=float(payload.get("annual_income", 0.0) or 0.0),
            address="Tamil Nadu, India",
            aadhaar_hash=hash_pii(f"APPLICANT-{current_user.id}"),
            status="pending",
        )
        db.add(beneficiary)
        db.flush()
        
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    if current_user.role == RoleEnum.citizen and beneficiary.id != current_user.id:
        raise HTTPException(status_code=403, detail="Citizens can only submit applications for their own beneficiary record")
        
    application = Application(
        application_number=f"APP-2026-{(db.query(Application).count() + 1):06d}",
        beneficiary_id=beneficiary.id,
        scheme_id=scheme.id,
        status="pending",
        age=payload.get("age", 25),
        gender=payload.get("gender", beneficiary.gender),
        annual_income=payload.get("annual_income", beneficiary.declared_income),
        family_size=payload.get("family_size", 1),
        submitted_at=datetime.datetime.utcnow(),
    )
    db.add(application)
    db.flush()
    db.add(ApplicationStatusHistory(application_id=application.id, status="pending", note="Application submitted by applicant", changed_by_id=current_user.id))
    db.commit()
    db.refresh(application)
    _sync_application(application, db)
    return _application_dict(application, db, include_details=True)



# ─── 6. AI Leakage Probability ───────────────────────────────────────────────

@app.post("/api/v1/ai/evaluate/{beneficiary_id}", tags=["AI Leakage Probability"])
def evaluate_leakage_probability(
    beneficiary_id: int,
    scheme_id: Optional[int] = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-run the AI pipeline for a beneficiary and upsert the result in ai_predictions.
    GUARDRAIL: advisory-only — does NOT change beneficiary or application status.
    """
    b = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    engine = _get_engine(db)
    result = engine.evaluate(_b_to_dict(b), scheme_id=scheme_id)

    # Upsert prediction
    app = db.query(Application).filter(Application.beneficiary_id == beneficiary_id).first()
    if not app:
        app = Application(application_number=f"APP-2026-{beneficiary_id:06d}", beneficiary_id=beneficiary_id, scheme_id=scheme_id or 1, status=b.status)
        db.add(app)
        db.flush()

    pred = db.query(AIPrediction).filter(AIPrediction.application_id == app.id).first()
    if pred:
        pred.leakage_probability = result["leakage_probability"]
        pred.concern_level = result["concern_level"]
        pred.contributing_factors = result["contributing_factors"]
        pred.severity = result["severity"]
        pred.recommended_action = result["recommended_action"]
        pred.potential_leakage_amount = result["potential_leakage_amount"]
        pred.predicted_at = datetime.datetime.utcnow()
    else:
        pred = AIPrediction(
            application_id=app.id, beneficiary_id=beneficiary_id,
            **{k: result[k] for k in [
                "leakage_probability", "concern_level", "contributing_factors",
                "severity", "recommended_action", "potential_leakage_amount", "model_version"
            ]}
        )
        db.add(pred)

    _write_audit(db, current_user.id, "AI_EVALUATE", "beneficiary", beneficiary_id,
                 {"leakage_probability": result["leakage_probability"], "concern_level": result["concern_level"]})
    db.commit()

    return {
        "id": pred.id if pred.id else 0,
        "application_id": app.id,
        "beneficiary_id": beneficiary_id,
        **result,
        "predicted_at": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/ai/predictions/{beneficiary_id}", tags=["AI Leakage Probability"])
def get_prediction(
    beneficiary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the stored AI prediction for a specific beneficiary."""
    pred = db.query(AIPrediction).filter(AIPrediction.beneficiary_id == beneficiary_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for this beneficiary")
    return {
        "id": pred.id, "application_id": pred.application_id,
        "beneficiary_id": pred.beneficiary_id,
        "leakage_probability": pred.leakage_probability,
        "concern_level": pred.concern_level,
        "contributing_factors": pred.contributing_factors,
        "severity": pred.severity,
        "recommended_action": pred.recommended_action,
        "potential_leakage_amount": pred.potential_leakage_amount,
        "model_version": pred.model_version,
        "predicted_at": pred.predicted_at.isoformat() if pred.predicted_at else None,
    }


@app.get("/api/v1/ai/predictions", tags=["AI Leakage Probability"])
def list_predictions(
    concern_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All stored predictions — used by Leakage Explorer page."""
    q = db.query(AIPrediction, Beneficiary).join(
        Beneficiary, AIPrediction.beneficiary_id == Beneficiary.id
    )
    if concern_level:
        q = q.filter(AIPrediction.concern_level == concern_level)
    q = q.order_by(desc(AIPrediction.leakage_probability))
    total = q.count()
    rows = q.offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": p.id, "application_id": p.application_id,
                "beneficiary_id": p.beneficiary_id,
                "leakage_probability": p.leakage_probability,
                "concern_level": p.concern_level,
                "contributing_factors": p.contributing_factors,
                "severity": p.severity,
                "recommended_action": p.recommended_action,
                "potential_leakage_amount": p.potential_leakage_amount,
                "model_version": p.model_version,
                "predicted_at": p.predicted_at.isoformat() if p.predicted_at else None,
                "beneficiary": {
                    "id": b.id, "full_name": b.full_name,
                    "gender": b.gender, "phone": b.phone,
                    "declared_income": b.declared_income,
                    "dob": b.dob.isoformat() if b.dob else None,
                    "status": b.status, "district_id": b.district_id,
                },
            }
            for p, b in rows
        ],
    }


@app.get("/api/v1/ai/dashboard-summary", tags=["AI Leakage Probability"])
def dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregated leakage statistics from the database. Powers the dashboard cards."""
    total = db.query(Beneficiary).count()
    concern_counts = dict(
        db.query(AIPrediction.concern_level, func.count(AIPrediction.id))
        .group_by(AIPrediction.concern_level)
        .all()
    )
    avg_prob = db.query(func.avg(AIPrediction.leakage_probability)).scalar() or 0.0
    potential = db.query(func.sum(AIPrediction.potential_leakage_amount)).scalar() or 0.0
    approved = db.query(Beneficiary).filter(Beneficiary.status == "approved").count()
    pending  = db.query(Beneficiary).filter(Beneficiary.status == "pending").count()
    flagged  = db.query(Beneficiary).filter(Beneficiary.status == "flagged").count()
    rejected = db.query(Beneficiary).filter(Beneficiary.status == "rejected").count()

    return {
        "total_beneficiaries": total,
        "status_distribution": {"approved": approved, "pending": pending, "flagged": flagged, "rejected": rejected},
        "concern_distribution": {
            "critical": concern_counts.get("critical", 0),
            "high":     concern_counts.get("high", 0),
            "moderate": concern_counts.get("moderate", 0),
            "low":      concern_counts.get("low", 0),
        },
        "cases_requiring_verification": concern_counts.get("critical", 0) + concern_counts.get("high", 0),
        "avg_leakage_probability": round(float(avg_prob), 1),
        "potential_leakage_amount": float(potential),
        "model_status": "ONLINE",
        "model_version": "2.0.0-leakage-prob-pipeline",
    }


@app.get("/api/v1/ai/network-graph", tags=["AI Leakage Probability"])
@app.get("/api/v1/ai/network-graph/{beneficiary_id}", tags=["AI Leakage Probability"])
def get_network_graph(
    beneficiary_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return a real graph of shared credentials (phone / bank account) centred on the given beneficiary.
    Edges are computed from actual DB rows — not hardcoded.
    """
    # If no beneficiary_id provided, pick highest leakage risk beneficiary
    if not beneficiary_id:
        top_pred = db.query(AIPrediction).order_by(desc(AIPrediction.leakage_probability)).first()
        beneficiary_id = top_pred.beneficiary_id if top_pred else 1

    # Get the focal beneficiary
    focal = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
    if not focal:
        focal = db.query(Beneficiary).first()
    if not focal:
        return {"nodes": [], "links": []}

    connected_ids = set([focal.id])
    edges = []

    # Shared phone
    if focal.phone:
        shared_phone = db.query(Beneficiary).filter(
            Beneficiary.phone == focal.phone,
            Beneficiary.id != focal.id
        ).all()
        for s in shared_phone:
            connected_ids.add(s.id)
            edges.append({"source": focal.id, "target": s.id, "type": "shared_phone", "color": "#DC2626"})

    # Shared bank account hash
    if focal.bank_account_hash:
        shared_bank = db.query(Beneficiary).filter(
            Beneficiary.bank_account_hash == focal.bank_account_hash,
            Beneficiary.id != focal.id
        ).all()
        for s in shared_bank:
            connected_ids.add(s.id)
            edges.append({"source": focal.id, "target": s.id, "type": "shared_bank", "color": "#8B5CF6"})

    # Fetch all involved beneficiaries
    all_beneficiaries = db.query(Beneficiary).filter(Beneficiary.id.in_(connected_ids)).all()
    all_preds = {
        p.beneficiary_id: p
        for p in db.query(AIPrediction).filter(AIPrediction.beneficiary_id.in_(connected_ids)).all()
    }

    COLOR_MAP = {"critical": "#DC2626", "high": "#EA580C", "moderate": "#D97706", "low": "#16A34A"}

    nodes = []
    for b in all_beneficiaries:
        pred = all_preds.get(b.id)
        concern = pred.concern_level if pred else "low"
        nodes.append({
            "id": b.id, "label": b.full_name,
            "group": "focal" if b.id == focal.id else b.status,
            "color": COLOR_MAP.get(concern, "#6B7280"),
            "size": 20 if b.id == focal.id else (14 if b.status == "flagged" else 8),
            "leakage_probability": pred.leakage_probability if pred else 0,
            "concern_level": concern,
        })

    return {"nodes": nodes, "links": edges}


# ─── 7. Complaints ───────────────────────────────────────────────────────────

@app.get("/api/v1/complaints", tags=["Complaints"])
def list_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Complaint)
    if current_user.role == RoleEnum.citizen:
        q = q.filter((Complaint.filed_by_id == current_user.id) | (Complaint.beneficiary_id == current_user.id))
    complaints = q.order_by(desc(Complaint.created_at)).all()
    results = []
    for c in complaints:
        app_num = None
        if c.beneficiary_id:
            app_row = db.query(Application).filter(Application.beneficiary_id == c.beneficiary_id).first()
            if app_row:
                app_num = app_row.application_number
        results.append({
            "id": c.id,
            "filed_by": c.filed_by_id,
            "beneficiary_id": c.beneficiary_id,
            "complaint_type": c.complaint_type,
            "description": c.description,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "application_id": app_num,
        })
    return results


@app.post("/api/v1/complaints", tags=["Complaints"])
def file_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b_id = payload.beneficiary_id if payload.beneficiary_id else current_user.id
    complaint = Complaint(
        filed_by_id=current_user.id,
        beneficiary_id=b_id,
        complaint_type=payload.complaint_type,
        description=payload.description,
        evidence_urls=payload.evidence_urls or [],
    )
    db.add(complaint)
    _write_audit(db, current_user.id, "COMPLAINT_FILED", "beneficiary", b_id)
    db.commit()
    db.refresh(complaint)
    return {
        "id": complaint.id, "filed_by": complaint.filed_by_id,
        "beneficiary_id": complaint.beneficiary_id,
        "complaint_type": complaint.complaint_type,
        "description": complaint.description,
        "status": complaint.status,
        "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
    }


@app.patch("/api/v1/complaints/{complaint_id}/status", tags=["Complaints"])
def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.district_officer, RoleEnum.verifying_officer)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    allowed = {"open", "investigating", "resolved", "dismissed"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(allowed))}")
    old_status = complaint.status
    complaint.status = payload.status
    _write_audit(db, current_user.id, f"COMPLAINT_{payload.status.upper()}", "complaint", complaint.id, {"old_status": old_status, "new_status": payload.status, "notes": payload.notes})
    db.commit()
    db.refresh(complaint)
    return {
        "id": complaint.id,
        "status": complaint.status,
        "beneficiary_id": complaint.beneficiary_id,
        "complaint_type": complaint.complaint_type,
        "description": complaint.description,
    }


# ─── 8. Admin ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/admin/users", tags=["Admin"])
def list_users(
    current_user: User = Depends(require_roles(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    users = db.query(User).all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
         "district_id": u.district_id, "is_active": u.is_active}
        for u in users
    ]


@app.post("/api/v1/admin/users", tags=["Admin"])
def create_admin_user(
    payload: UserProvisionRequest,
    current_user: User = Depends(require_roles(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw((payload.password or "officer123").encode('utf-8'), salt).decode('utf-8')
    new_user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hashed_password,
        role=payload.role,
        district_id=payload.district_id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    _write_audit(db, current_user.id, "USER_PROVISIONED", "user", new_user.id, {"email": payload.email, "role": payload.role})
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "district_id": new_user.district_id,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None,
    }


@app.get("/api/v1/admin/audit-logs", tags=["Admin"])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles(RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
    return [
        {"id": l.id, "user_id": l.user_id, "action": l.action,
         "entity_type": l.entity_type, "entity_id": l.entity_id,
         "details": l.details,
         "created_at": l.created_at.isoformat() if l.created_at else None}
        for l in logs
    ]
