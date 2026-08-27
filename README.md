# 🛡️ SchemeSecure AI — AI Government Scheme Fraud Detection & Verification System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=Docker&logoColor=white)](https://www.docker.com/)

SchemeSecure AI is an enterprise welfare scheme fraud detection, AI document verification, and explainable risk-scoring platform built for government administrators, district officers, and verifying authorities.

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
| **Verifying Officer** | `vo.k@gov.in` | `officer123` | Mumbai District |
| **Citizen** | `citizen@gmail.com` | `citizen123` | Grievance Portal |

---

## 📁 Project Architecture & Directory Structure

```
├── frontend/             # React 19 + Vite Web Application
│   ├── src/              # Components, Contexts, Pages, Hooks
│   ├── public/           # Favicon, SVG Logo Assets
│   ├── package.json      # Dependencies & Scripts
│   ├── vite.config.js    # Vite Bundler Configuration
│   ├── vercel.json       # Vercel Deployment Configuration
│   └── Dockerfile        # Production Multi-Stage NGINX Image
├── backend/              # Python FastAPI + PyMuPDF + RapidOCR AI Engine
│   ├── main.py           # Single ASGI Application Entrypoint
│   ├── ai_engine.py      # Graph Centrality & Risk Scorer
│   ├── document_service.py # OCR Extraction & Tampering Forensics
│   ├── db_models.py      # SQLAlchemy Schema Models
│   ├── database.py       # DB Session & Connection Manager
│   ├── mongodb/          # MongoDB Atlas Dual-Write Repository
│   ├── requirements.txt  # Python Dependencies
│   └── Dockerfile        # Backend Production Container Image
├── docker-compose.yml    # Full-Stack Orchestration (Frontend + Backend + DB)
├── render.yaml           # Render Cloud Blueprint
└── .env.example          # Environment Configuration Checklist
```

---

## 🚀 Quickstart Guide

### 1. Run Development (Both Backend & Frontend)
```bash
npm run dev
```
- React Frontend: **`http://localhost:5173`**
- FastAPI Backend: **`http://127.0.0.1:8000`**
- Swagger Documentation: **`http://127.0.0.1:8000/docs`**

---

## 🔒 Security & Privacy Architecture
- **Salted SHA-256 Hashing:** Raw Aadhaar and bank account numbers are hashed before ingestion.
- **Zero Raw PII Storage:** Strict data-masking across all UI components.
- **Immutable Audit Trails:** Every officer action (Approve, Reject, Flag) is logged with timestamps.

