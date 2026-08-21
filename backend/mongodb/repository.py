from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable

try:
    from pymongo import ASCENDING, DESCENDING, MongoClient
    from pymongo.collection import Collection
except ImportError:  # Optional until MongoDB is configured.
    ASCENDING = DESCENDING = MongoClient = Collection = None

from config import settings


class MongoRepository:
    """MongoDB Atlas repository used alongside, never instead of, SQLAlchemy."""

    def __init__(self, uri: str | None = None, database_name: str | None = None):
        self.uri = uri or settings.MONGODB_URI
        self.database_name = database_name or settings.MONGODB_DATABASE
        self._client = None
        self._database = None
        self._initialized = False
        self.last_error: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(settings.MONGODB_ENABLED and self.uri)

    def _get_database(self):
        if not self.enabled:
            return None
        if self._database is None:
            if MongoClient is None:
                self.last_error = "pymongo is not installed"
                return None
            try:
                self._client = MongoClient(self.uri, serverSelectionTimeoutMS=settings.MONGODB_CONNECT_TIMEOUT_MS)
                self._client.admin.command("ping")
                self._database = self._client[self.database_name]
                self.ensure_indexes()
            except Exception as exc:
                self.last_error = str(exc)
                self.close()
                return None
        return self._database

    def ensure_indexes(self) -> None:
        if self._database is None or ASCENDING is None:
            return
        self._database.users.create_index([("email", ASCENDING)], unique=True)
        self._database.users.create_index([("userId", ASCENDING)], unique=True)
        self._database.applications.create_index([("applicationId", ASCENDING)], unique=True)
        self._database.applications.create_index([("applicantId", ASCENDING)])
        self._database.applications.create_index([("schemeId", ASCENDING)])
        self._database.applications.create_index([("status", ASCENDING), ("createdAt", DESCENDING)])
        self._database.documents.create_index([("documentId", ASCENDING)], unique=True)
        self._database.documents.create_index([("applicationId", ASCENDING)])
        self._database.documents.create_index([("sha256Hash", ASCENDING)])
        self._database.documents.create_index([("createdAt", DESCENDING)])
        self._database.verification_audits.create_index([("applicationId", ASCENDING), ("timestamp", DESCENDING)])

    def upsert_user(self, user_doc: dict[str, Any]) -> bool:
        database = self._get_database()
        if database is None:
            return False
        try:
            user_id = str(user_doc.get("userId") or user_doc.get("id"))
            database.users.replace_one(
                {"userId": user_id},
                {**user_doc, "userId": user_id, "updatedAt": datetime.utcnow()},
                upsert=True,
            )
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False

    def upsert_application(self, document: dict[str, Any]) -> bool:
        database = self._get_database()
        if database is None:
            return False
        try:
            application_id = str(document["applicationId"])
            database.applications.replace_one(
                {"applicationId": application_id},
                {**document, "applicationId": application_id, "updatedAt": datetime.utcnow()},
                upsert=True,
            )
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False

    def upsert_document(self, document: dict[str, Any]) -> bool:
        database = self._get_database()
        if database is None:
            return False
        try:
            document_id = str(document["documentId"])
            database.documents.replace_one(
                {"documentId": document_id},
                {**document, "documentId": document_id, "updatedAt": datetime.utcnow()},
                upsert=True,
            )
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False

    def append_verification_audit(self, audit: dict[str, Any]) -> bool:
        database = self._get_database()
        if database is None:
            return False
        try:
            database.verification_audits.insert_one({**audit, "timestamp": audit.get("timestamp", datetime.utcnow())})
            return True
        except Exception as exc:
            self.last_error = str(exc)
            return False

    def migrate_documents(self, documents: Iterable[dict[str, Any]]) -> int:
        count = 0
        for document in documents:
            count += int(self.upsert_document(document))
        return count

    def migrate_applications(self, applications: Iterable[dict[str, Any]]) -> int:
        count = 0
        for application in applications:
            count += int(self.upsert_application(application))
        return count

    def health(self) -> dict[str, Any]:
        if not self.enabled:
            return {"enabled": False, "status": "not_configured"}
        database = self._get_database()
        return {"enabled": True, "status": "connected" if database is not None else "unavailable", "error": self.last_error}

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
        self._client = None
        self._database = None


mongo_repository = MongoRepository()
