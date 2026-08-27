from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import SessionLocal, create_tables
from db_models import Application, ApplicationDocument
from mongodb import mongo_repository


def application_record(application: Application) -> dict:
    return {
        "applicationId": application.application_number or str(application.id),
        "sqlId": application.id,
        "applicantId": application.beneficiary_id,
        "schemeId": application.scheme_id,
        "status": str(getattr(application.status, "value", application.status)),
        "concernLevel": application.prediction.concern_level if application.prediction else None,
        "leakageProbability": application.prediction.leakage_probability if application.prediction else None,
        "createdAt": application.submitted_at or datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }


def document_record(document: ApplicationDocument) -> dict:
    return {
        "documentId": str(document.id),
        "sqlId": document.id,
        "applicationId": document.application.application_number or str(document.application_id),
        "applicantId": document.application.beneficiary_id,
        "schemeId": document.application.scheme_id,
        "documentType": document.doc_type or document.document_type,
        "originalFilename": document.original_filename or document.document_name,
        "storageReference": document.storage_path,
        "mimeType": document.mime_type,
        "fileSize": document.size_bytes,
        "sha256Hash": getattr(document, "sha256_hash", None),
        "processingStatus": getattr(document, "processing_status", "uploaded"),
        "ocrStatus": getattr(document, "ocr_status", "not_started"),
        "verificationStatus": document.verification_status,
        "ocrExtracted": document.ocr_extracted,
        "createdAt": document.uploaded_at,
        "updatedAt": datetime.now(timezone.utc),
    }



def migrate(batch_size: int, after_id: int) -> tuple[int, int]:
    if not mongo_repository.enabled:
        raise RuntimeError("MongoDB is not configured. Set MONGODB_ENABLED=true and MONGODB_URI before migrating.")
    db = SessionLocal()
    applications_written = 0
    documents_written = 0
    try:
        create_tables()
        applications = (
            db.query(Application)
            .filter(Application.id > after_id)
            .order_by(Application.id.asc())
            .limit(batch_size)
            .all()
        )
        for application in applications:
            if mongo_repository.upsert_application(application_record(application)):
                applications_written += 1
            for document in application.documents:
                if mongo_repository.upsert_document(document_record(document)):
                    documents_written += 1
        return applications_written, documents_written
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Incrementally mirror SQLAlchemy applications/documents into MongoDB Atlas.")
    parser.add_argument("--batch-size", type=int, default=100, help="Maximum applications per run")
    parser.add_argument("--after-id", type=int, default=0, help="Only migrate SQL application IDs greater than this value")
    args = parser.parse_args()
    applications, documents = migrate(args.batch_size, args.after_id)
    print(f"Mongo migration complete: applications={applications}, documents={documents}")


if __name__ == "__main__":
    main()
