# 🛡️ SchemeSecure AI — Backend API & AI Forensics Engine

FastAPI-powered backend for **SchemeSecure AI**, providing enterprise welfare fraud detection, AI document forensics, middleman syndicate graph analysis, and secure authentication.

---

## 🚀 Quick Start

### 1. Set Up Virtual Environment
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Seed Database (Optional / Automatic)
```bash
python seed.py
```

### 5. Run the FastAPI Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation will be live at `http://127.0.0.1:8000/docs`.

---

## 📁 Architecture & File Structure

```
backend/
├── main.py                   # FastAPI ASGI Application & REST API Endpoints
├── config.py                 # Pydantic BaseSettings & multi-path .env loader
├── database.py               # SQLAlchemy Engine, SessionLocal, Base & pool manager
├── db_models.py              # SQLAlchemy ORM Database Schemas
├── models.py                 # Pydantic Request/Response validation schemas
├── ai_engine.py              # ML risk scorer, NetworkX syndicate graph & anomaly detector
├── document_service.py       # CASIA document forensics, ELA, and OCR parsing
├── email_service.py          # Resilient SMTP delivery service
├── synthetic_data.py         # Seed dataset generator (500+ records, 12 schemes, 20 districts)
├── seed.py                   # Standalone database initialization script
├── mongodb/                  # Optional MongoDB Atlas repositories & dual-write adapter
│   ├── repository.py         # Atlas async/sync collection helpers
│   └── sync.py               # SQL-to-Mongo dual write hooks
├── scripts/                  # Data migration & management utilities
│   └── migrate_sql_to_mongo.py # Incremental batch migration command
├── tests/                    # Automated test suites
│   ├── test_live_system.py   # Full 10-module end-to-end integration suite
│   ├── test_forgot_reset_password.py # 14-point password security suite
│   └── verify_endpoints.py   # Quick endpoint verification script
├── requirements.txt          # Python dependencies
├── .env.example              # Environment configuration template
└── README.md                 # Backend documentation
```

---

## 🔒 Endpoints Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | System health check (database & services) |
| `/docs` | `GET` | Interactive Swagger UI API documentation |
| `/api/v1/auth/login` | `POST` | User authentication & JWT issuance |
| `/api/v1/auth/register` | `POST` | Citizen registration |
| `/api/v1/auth/forgot-password` | `POST` | Password reset request |
| `/api/v1/auth/reset-password` | `POST` | Password reset execution |
| `/api/v1/schemes` | `GET` | Government welfare scheme registry |
| `/api/v1/applications` | `GET`, `POST` | Scheme applications queue & submission |
| `/api/v1/applications/{id}/status` | `PUT` | Officer decision workflow (Approve/Reject/Flag) |
| `/api/v1/complaints` | `GET`, `POST` | Citizen grievance portal & tracking |
| `/api/v1/ai/dashboard-summary` | `GET` | AI fraud metrics & leakage overview |
| `/api/v1/ai/network-graph` | `GET` | Middleman ring & shared credential graph |
| `/api/v1/ai/evaluate/{id}` | `POST` | Instant ML fraud risk evaluation |
| `/api/v1/documents/ai-test-sample/{id}` | `POST` | Forensic document authenticity testing |
| `/api/v1/admin/users` | `GET` | System user administration |
| `/api/v1/admin/audit-logs` | `GET` | Immutable officer audit trail logs |
