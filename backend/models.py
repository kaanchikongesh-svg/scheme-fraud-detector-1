from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import date, datetime
from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    DISTRICT_OFFICER = "district_officer"
    VERIFYING_OFFICER = "verifying_officer"
    CITIZEN = "citizen"


class StatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class ConcernLevelEnum(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# ─── Authentication ───────────────────────────────────────────

class UserLogin(BaseModel):
    email: Optional[str] = None
    mobile: Optional[str] = None
    password: str


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str
    mobile: Optional[str] = None
    district_id: Optional[int] = 1
    gender: Optional[str] = "other"
    dob: Optional[date] = None
    annual_income: Optional[float] = 0.0
    address: Optional[str] = None
    aadhaar_number: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    mobile: Optional[str] = None
    role: RoleEnum
    district_id: Optional[int] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    mobile: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


# ─── Beneficiaries ────────────────────────────────────────────

class BeneficiaryBase(BaseModel):
    full_name: str
    dob: Optional[date] = None
    gender: Optional[str] = "other"
    phone: Optional[str] = None
    address: Optional[str] = None
    district_id: Optional[int] = None
    ifsc_code: Optional[str] = None
    declared_income: float = 0.0


class BeneficiaryCreate(BeneficiaryBase):
    raw_aadhaar: str          # Salted and hashed immediately on ingestion
    raw_bank_account: Optional[str] = None


class BeneficiaryResponse(BeneficiaryBase):
    id: int
    aadhaar_hash: str
    bank_account_hash: Optional[str] = None
    status: StatusEnum = StatusEnum.PENDING
    photo_url: Optional[str] = None
    created_at: Optional[str] = None


# ─── Schemes ─────────────────────────────────────────────────

class SchemeBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    eligibility_criteria: Dict[str, Any] = Field(default_factory=dict)
    benefit_amount: float = 0.0


class SchemeResponse(SchemeBase):
    id: int
    beneficiary_count: int = 0
    flagged_count: int = 0
    created_at: Optional[str] = None


# ─── AI Leakage Probability ───────────────────────────────────

class AIProbabilityResponse(BaseModel):
    """
    AI Leakage Probability evaluation result.
    leakage_probability replaces the old risk_score field.
    concern_level replaces the old risk_tier field.
    contributing_factors use neutral, non-accusatory language.
    recommended_action is always derived from concern_level — never hardcoded.
    potential_leakage_amount = scheme benefit_amount when concern is high/critical.
    """
    id: int
    application_id: int
    beneficiary_id: int
    leakage_probability: float      # 0-100, displayed as %
    concern_level: ConcernLevelEnum  # low | moderate | high | critical
    contributing_factors: List[str]  # Neutral, non-accusatory explanations
    severity: List[str]
    recommended_action: str          # Derived from concern_level
    potential_leakage_amount: float  # ₹ exposure estimate
    model_version: str = "2.0.0-leakage-prob-pipeline"
    predicted_at: Optional[str] = None


# ─── Network Graph ────────────────────────────────────────────

class GraphNode(BaseModel):
    id: int
    label: str
    group: str
    color: str
    size: int


class GraphLink(BaseModel):
    source: int
    target: int
    type: str
    color: str


class NetworkGraphResponse(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]


# ─── Complaints ───────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    beneficiary_id: Optional[Union[int, str]] = None
    reported_target: Optional[str] = None
    complaint_type: str
    description: str
    evidence_urls: Optional[List[str]] = None


class ComplaintResponse(BaseModel):
    id: int
    grievance_id: Optional[str] = None
    filed_by: int
    beneficiary_id: Optional[int] = None
    reported_target: Optional[str] = None
    complaint_type: str
    category: Optional[str] = None
    description: str
    status: str = "open"
    officer_action: Optional[str] = None
    evidence_urls: Optional[List[str]] = None
    created_at: Optional[str] = None
    filed_date: Optional[str] = None
    updated_at: Optional[str] = None
    application_id: Optional[str] = None


class DocumentVerificationRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class UserProvisionRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = "officer123"
    role: RoleEnum = RoleEnum.VERIFYING_OFFICER
    district_id: Optional[int] = 1


class ComplaintStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    officer_action: Optional[str] = None

