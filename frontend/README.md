# 🛡️ SchemeSecure AI — Frontend Application

Modern React 19 + Vite web application for the **SchemeSecure AI** Fraud Detection & Verification System.

---

## 🚀 Quick Start

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The React 19 web application will be live at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 📁 Directory Structure

```
frontend/
├── src/                          # React Source Code
│   ├── components/               # Header, Sidebar, Badges, StatCards, Skeleton Loaders
│   ├── contexts/                 # AuthContext (JWT session management)
│   ├── hooks/                    # Live data hooks (useApplications, useBeneficiaries, useComplaints, etc.)
│   ├── lib/                      # Centralized API client & HTTP interceptors
│   ├── pages/                    # Core Route Pages
│   │   ├── admin/                # System Administration & Audit Logs
│   │   ├── ai/                   # AI Risk Explorer & Force-Directed Network Graph
│   │   ├── analytics/            # Predictive Analytics & Reports
│   │   ├── applications/         # Scheme Application Queue & Decision Workflow
│   │   ├── auth/                 # Login, Registration, Forgot/Reset Password
│   │   ├── beneficiaries/        # Beneficiary Roster & Detail Gauges
│   │   ├── complaints/           # Citizen Grievance Portal
│   │   ├── dashboard/            # Executive Overview & KPI Summary
│   │   ├── document-verification/# AI Document Authenticity Forensic Studio
│   │   ├── geomap/               # District Risk Intensity Heatmap
│   │   └── schemes/              # Welfare Scheme Registry & Eligibility
│   ├── App.jsx                   # React Router v7 Configuration
│   ├── main.jsx                  # React DOM Entrypoint
│   └── index.css                 # Dark slate design system & responsive styling
├── public/                       # Static assets, SVG icons, and HTML portal pages
├── package.json                  # Frontend dependencies & scripts
├── vite.config.js                # Vite configuration with backend proxy
├── index.html                    # Single Page Application HTML entrypoint
└── .env.example                  # Environment configuration template
```

---

## 🌐 API Connection
The frontend communicates with the FastAPI backend on `http://127.0.0.1:8000` via Vite's high-speed proxy in development, and resolves to `VITE_API_URL` in production.
