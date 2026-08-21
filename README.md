# 🛡️ GovKavach AI — AI Government Scheme Leakage & Fraud Detection Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=Docker&logoColor=white)](https://www.docker.com/)

GovKavach AI is an enterprise welfare scheme fraud detection, AI document verification, and explainable risk-scoring platform built for government administrators, district officers, and verifying authorities.

---

## ✨ Key Features

1. **AI Risk Scoring Engine (0–100 score + Green / Yellow / Red tiers):**
   - **Duplicate Aadhaar Check (+40 pts):** Hash matching with zero raw PII storage.
   - **Duplicate Bank Account (+30 pts):** Cross-applicant payout account detection.
   - **Network Ring Cluster Analysis (+20 pts):** Graph centrality and middleman ring detection using NetworkX algorithms.
   - **Income Eligibility Mismatch (+15–25 pts):** Variance detection against scheme thresholds.
   - **Fuzzy Identity Deduplication (+20 pts):** Phonetic and Levenshtein distance matching.
   - **Multi-Scheme Conflict (+10 pts):** Double-dipping detection across simultaneous welfare schemes.

2. **Visual & Explainable Differentiators:**
   - **Explainability First:** Every flagged case displays inline human-readable reasons (e.g. *"Bank account shared with 2 other applicants"*).
   - **Interactive Force-Directed Network Graph:** Live visualization of middleman clusters, duplicate Aadhaar nodes, and shared bank links.
   - **District Geographic Heatmap:** Interactive 20-district risk-intensity map.
   - **Real-Time Analytics & Disposition Trends:** Monthly volumes, fraud type distributions, and estimated leakage prevented.

3. **Role-Based Access Control (RBAC):**
   - **System Admin:** Full dashboard, scheme management, user provisioning, and audit logs.
   - **District Officer:** District-scoped analytics and investigation queues.
   - **Verifying Officer:** Daily verification queue with approve / reject / flag workflow.
   - **Citizen Representative:** Anonymous whistle-blower grievance portal with status tracking.

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@gov.in` | `admin123` | Global Jurisdiction |
| **District Officer** | `do.rao@gov.in` | `officer123` | Lucknow District |
| **Verifying Officer** | `vo.k@gov.in` | `verify123` | Mumbai District |
| **Citizen** | `citizen@gmail.com` | `citizen123` | Grievance Portal |

*(You can also use password `demo` on any account)*

---

## 🚀 Quickstart Guide

### 1. Run Frontend (Instant Demo Mode)
The frontend comes pre-loaded with synthetic data containing planted fraud patterns:
```bash
npm install
npm run dev
```
Open your browser at **`http://localhost:5173`**.

### 2. Run Backend (FastAPI + Swagger Docs)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at **`http://localhost:8000/docs`**.

### 3. Full Stack with Docker
```bash
docker-compose up --build
```

### 4. Optional MongoDB Atlas Sidecar Migration

SQLAlchemy remains the source of truth during the incremental migration. MongoDB is disabled by default. Configure these values in `backend/.env` or the process environment only when an Atlas deployment is available:

```env
MONGODB_ENABLED=true
MONGODB_DUAL_WRITE=true
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
MONGODB_DATABASE=government_scheme_leakage
```

Mirror applications and documents in repeatable batches:

```bash
cd backend
python -m scripts.migrate_sql_to_mongo --batch-size 100 --after-id 0
```

The command upserts by stable `applicationId` and `documentId`, creates indexes, and can be resumed with a higher `--after-id`. API writes remain SQL-first; Mongo dual writes are best-effort and never make a request fail. `/health` reports Mongo as `not_configured`, `connected`, or `unavailable`.

---

## 📂 Project Architecture

```
AI GOVERNMENT SCHEME LEAKAGE DETECTOR/
├── backend/
│   ├── main.py              # FastAPI REST endpoints
│   ├── ai_engine.py         # Multi-stage risk scoring & NetworkX graph engine
│   ├── mongodb/              # Optional Atlas repositories and dual-write adapter
│   ├── scripts/              # Incremental SQL-to-Mongo migration commands
│   ├── models.py            # Pydantic data schemas
│   ├── synthetic_data.py    # Seed generator with planted fraud patterns
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile.backend
├── src/
│   ├── components/          # StatCard, RiskBadge, ReasonList, Sidebar, Header, Layout
│   ├── data/                # Synthetic datasets (120+ beneficiaries, 12 schemes, 20 districts)
│   ├── pages/
│   │   ├── auth/            # Animated login with demo accounts
│   │   ├── dashboard/       # KPI cards, Recharts pie/line/bar charts
│   │   ├── beneficiaries/   # Filterable list + AI detail view with SVG gauge
│   │   ├── ai/              # Risk Explorer + Force-Directed Network Graph
│   │   ├── geomap/          # District fraud heatmap
│   │   ├── schemes/         # Scheme registry & eligibility
│   │   ├── analytics/       # Reports & model metrics
│   │   ├── complaints/      # Citizen grievance portal
│   │   └── admin/           # User management & audit logs
│   ├── App.jsx              # Routing & session state
│   ├── index.css            # Dark slate design system & tokens
│   └── main.jsx
├── docker-compose.yml
├── Dockerfile.frontend
└── package.json
```

---

## 🔒 Security & Privacy Architecture
- **Salted SHA-256 Hashing:** Raw Aadhaar and bank account numbers are hashed before ingestion.
- **Zero Raw PII Storage:** Strict data-masking across all UI components.
- **Immutable Audit Trails:** Every officer action (Approve, Reject, Flag) is logged with timestamps.
>>>>>>> 99c32ba (Initial commit: AI Government Scheme Leakage Detector full platform)
