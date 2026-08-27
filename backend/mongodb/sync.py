import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

# Ensure backend directory is in sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from .repository import mongo_repository
from config import settings


def _application_document(application: dict[str, Any]) -> dict[str, Any]:
    return {
        "applicationId": str(application.get("application_id") or application.get("id")),
        "sqlId": application.get("id"),
        "applicantId": application.get("beneficiary_id"),
        "schemeId": application.get("scheme_id"),
        "status": application.get("status"),
        "concernLevel": application.get("concern_level"),
        "leakageProbability": application.get("leakage_probability"),
        "createdAt": application.get("application_date"),
        "updatedAt": datetime.now(timezone.utc),
    }


def _document_document(document: dict[str, Any], application_id: str | None = None) -> dict[str, Any]:
    return {
        "documentId": str(document.get("id")),
        "sqlId": document.get("id"),
        "applicationId": application_id or document.get("application_id"),
        "documentType": document.get("doc_type") or document.get("document_type"),
        "originalFilename": document.get("original_filename") or document.get("document_name"),
        "storageReference": document.get("storage_path"),
        "mimeType": document.get("mime_type"),
        "fileSize": document.get("size_bytes"),
        "sha256Hash": document.get("sha256_hash"),
        "processingStatus": document.get("processing_status", "uploaded"),
        "ocrStatus": document.get("ocr_status", "not_started"),
        "verificationStatus": document.get("verification_status") or document.get("status"),
        "ocrExtracted": document.get("ocr_extracted"),
        "createdAt": document.get("uploaded_at"),
        "updatedAt": datetime.now(timezone.utc),
    }


class MongoSync:
    """Best-effort dual-write adapter. SQL transactions remain authoritative."""

    def user(self, user: dict[str, Any]) -> bool:
        if not settings.MONGODB_DUAL_WRITE:
            return False
        user_doc = {
            "userId": str(user.get("id")),
            "sqlId": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "mobile": user.get("mobile"),
            "role": user.get("role"),
            "districtId": user.get("district_id"),
            "dob": str(user.get("dob")) if user.get("dob") else None,
            "address": user.get("address"),
            "createdAt": user.get("created_at") or datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        return mongo_repository.upsert_user(user_doc)

    def application(self, application: dict[str, Any]) -> bool:
        if not settings.MONGODB_DUAL_WRITE:
            return False
        return mongo_repository.upsert_application(_application_document(application))

    def document(self, document: dict[str, Any], application_id: str | None = None) -> bool:
        if not settings.MONGODB_DUAL_WRITE:
            return False
        return mongo_repository.upsert_document(_document_document(document, application_id))

    def verification_audit(self, application_id: str, document_id: str, decision: str, evidence: list[str] | None = None) -> bool:
        if not settings.MONGODB_DUAL_WRITE:
            return False
        return mongo_repository.append_verification_audit({
            "applicationId": application_id,
            "documentId": document_id,
            "action": "document_verification",
            "decision": decision,
            "evidence": evidence or [],
            "modelVersion": "sqlalchemy-document-pipeline",
            "timestamp": datetime.now(timezone.utc),
        })

    def health(self) -> dict[str, Any]:
        return mongo_repository.health()



mongo_sync = MongoSync()
