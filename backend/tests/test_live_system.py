"""
Comprehensive Full-Stack Backend End-to-End Test Suite for SchemeSecure AI
Tests every API route against live running server.
"""
import sys
import json
import httpx
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_full_system():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    print("================================================================")
    print("  SCHEMESECURE AI - FULL SYSTEM INTEGRATION TEST SUITE")
    print("================================================================")

    # 1. Health & Root
    print("\n[1] Testing Health & Root Endpoints...")
    r = client.get("/")
    assert r.status_code == 200, f"Root endpoint failed: {r.status_code}"
    print(f"  [PASS] GET / -> {r.json()['message']}")

    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    health_data = r.json()
    assert health_data["status"] == "ok"
    assert health_data["database"] == "connected"
    print(f"  [PASS] GET /health -> status: {health_data['status']}, db: {health_data['database']}")

    r = client.get("/api/v1/auth/smtp-status")
    assert r.status_code == 200
    print(f"  [PASS] GET /api/v1/auth/smtp-status -> configured: {r.json().get('configured')}")

    # 2. Reference Data: Schemes & Districts
    print("\n[2] Testing Schemes & Districts APIs...")
    r = client.get("/api/v1/schemes")
    assert r.status_code == 200
    schemes = r.json()
    assert len(schemes) > 0, "No schemes returned"
    print(f"  [PASS] GET /api/v1/schemes -> {len(schemes)} schemes loaded (First: {schemes[0]['name']})")

    r = client.get("/api/v1/districts")
    assert r.status_code == 200
    districts = r.json()
    assert len(districts) > 0, "No districts returned"
    print(f"  [PASS] GET /api/v1/districts -> {len(districts)} districts loaded")

    # 3. Authentication: Admin & Verifying Officer Login
    print("\n[3] Testing Officer & Admin Authentication...")
    r = client.post("/api/v1/auth/login", json={"email": "admin@gov.in", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_data = r.json()
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"  [PASS] POST /api/v1/auth/login -> Logged in as: {admin_data['user']['email']} ({admin_data['user']['role']})")

    # Also test Verifying Officer Login
    r = client.post("/api/v1/auth/login", json={"email": "vo.k@gov.in", "password": "officer123"})
    assert r.status_code == 200, f"Officer login failed: {r.text}"
    officer_token = r.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}
    print(f"  [PASS] POST /api/v1/auth/login -> Logged in as Verifying Officer: vo.k@gov.in")

    # 4. Citizen Registration Flow
    print("\n[4] Testing Citizen Registration & Login...")
    unique_suffix = uuid.uuid4().hex[:6]
    citizen_email = f"citizen_{unique_suffix}@schemesecure.tn.gov.in"
    citizen_mobile = f"98765{unique_suffix[:5]}"
    citizen_pwd = "SecureCitizenPass@2026"

    register_payload = {
        "name": f"Murugan Ramanathan {unique_suffix}",
        "email": citizen_email,
        "password": citizen_pwd,
        "confirm_password": citizen_pwd,
        "mobile": citizen_mobile,
        "district_id": 3,
        "gender": "male",
        "annual_income": 85000.0,
        "address": "12/4 Anna Salai, Madurai, Tamil Nadu",
        "aadhaar_number": "123456789012"
    }

    r = client.post("/api/v1/auth/register", json=register_payload)
    assert r.status_code == 200, f"Registration failed ({r.status_code}): {r.text}"
    reg_data = r.json()
    citizen_token = reg_data["access_token"]
    citizen_user = reg_data["user"]
    print(f"  [PASS] POST /api/v1/auth/register -> Registered citizen #{citizen_user['id']}: {citizen_user['name']}")

    # Validate Citizen Profile
    auth_headers = {"Authorization": f"Bearer {citizen_token}"}
    r = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == citizen_email
    print(f"  [PASS] GET /api/v1/auth/me -> Verified session profile for {citizen_email}")

    # 5. Beneficiaries & Applications
    print("\n[5] Testing Beneficiary & Application Data...")
    r = client.get("/api/v1/beneficiaries?limit=10", headers=admin_headers)
    assert r.status_code == 200
    beneficiaries = r.json()
    items = beneficiaries.get("items", beneficiaries) if isinstance(beneficiaries, dict) else beneficiaries
    print(f"  [PASS] GET /api/v1/beneficiaries -> Returned {len(items)} beneficiaries")

    r = client.get("/api/v1/applications?limit=10", headers=admin_headers)
    assert r.status_code == 200
    apps_data = r.json()
    app_items = apps_data.get("items", apps_data) if isinstance(apps_data, dict) else apps_data
    print(f"  [PASS] GET /api/v1/applications -> Returned {len(app_items)} applications")

    r = client.get("/api/v1/applications/summary", headers=admin_headers)
    assert r.status_code == 200
    summary = r.json()
    print(f"  [PASS] GET /api/v1/applications/summary -> Total: {summary.get('total_applications')}, Pending: {summary.get('pending')}, Flagged: {summary.get('flagged')}")

    # 6. Citizen Applies for Scheme
    print("\n[6] Testing Scheme Application Submission...")
    apply_payload = {
        "scheme_id": schemes[0]["id"],
        "beneficiary_id": citizen_user["id"],
        "age": 28,
        "gender": "male",
        "annual_income": 85000.0,
        "family_size": 3,
    }
    r = client.post("/api/v1/applications", json=apply_payload, headers=auth_headers)
    assert r.status_code == 200, f"Apply scheme failed: {r.text}"
    created_app = r.json()
    app_id = created_app["id"]
    print(f"  [PASS] POST /api/v1/applications -> Created application #{created_app.get('application_number')} (ID: {app_id})")

    # Fetch citizen's applications
    r = client.get("/api/v1/applications/my", headers=auth_headers)
    assert r.status_code == 200
    my_apps = r.json()
    assert len(my_apps) >= 1
    print(f"  [PASS] GET /api/v1/applications/my -> Citizen has {len(my_apps)} active application(s)")

    # 7. Citizen Files a Grievance / Complaint
    print("\n[7] Testing Grievance & Complaint Filing & Tracking...")
    complaint_payload = {
        "beneficiary_id": citizen_user["id"],
        "reported_target": f"Shop Agent #{unique_suffix}",
        "complaint_type": "duplicate_application",
        "description": "Suspicious agent collecting documents for unauthorized multi-scheme payouts in Madurai.",
        "evidence_urls": ["https://evidence.example.com/receipt.pdf"]
    }
    r = client.post("/api/v1/complaints", json=complaint_payload, headers=auth_headers)
    assert r.status_code == 200, f"Complaint submission failed: {r.text}"
    created_complaint = r.json()
    complaint_id = created_complaint["id"]
    print(f"  [PASS] POST /api/v1/complaints -> Filed complaint {created_complaint.get('grievance_id')} (ID: {complaint_id})")

    # Track complaints
    r = client.get("/api/v1/complaints", headers=auth_headers)
    assert r.status_code == 200
    complaints_list = r.json()
    assert any(c["id"] == complaint_id for c in complaints_list), "Newly created complaint not found in list"
    print(f"  [PASS] GET /api/v1/complaints -> Tracked {len(complaints_list)} complaints. Verified #{complaint_id} exists.")

    r = client.get(f"/api/v1/complaints/{complaint_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == complaint_id
    print(f"  [PASS] GET /api/v1/complaints/{complaint_id} -> Retrieved details for {r.json().get('grievance_id')}")

    # 8. AI Fraud Detection & Verification Engine
    print("\n[8] Testing AI Fraud Scoring & Anomaly Detection...")
    r = client.get("/api/v1/ai/dashboard-summary", headers=admin_headers)
    assert r.status_code == 200
    ai_dashboard = r.json()
    print(f"  [PASS] GET /api/v1/ai/dashboard-summary -> High Concern: {ai_dashboard.get('high_concern_count')}, Critical: {ai_dashboard.get('critical_concern_count')}")

    r = client.get("/api/v1/ai/predictions?limit=5", headers=admin_headers)
    assert r.status_code == 200
    preds = r.json()
    pred_items = preds.get("items", preds) if isinstance(preds, dict) else preds
    print(f"  [PASS] GET /api/v1/ai/predictions -> {len(pred_items)} AI leakage predictions loaded")

    # Evaluate AI for beneficiary
    r = client.post(f"/api/v1/ai/evaluate/{citizen_user['id']}", headers=officer_headers)
    assert r.status_code == 200
    eval_res = r.json()
    print(f"  [PASS] POST /api/v1/ai/evaluate/{citizen_user['id']} -> Leakage Prob: {eval_res.get('leakage_probability')}%, Concern: {eval_res.get('concern_level')}")

    # Network Graph Anomaly Detection
    r = client.get("/api/v1/ai/network-graph", headers=admin_headers)
    assert r.status_code == 200
    graph_data = r.json()
    print(f"  [PASS] GET /api/v1/ai/network-graph -> {len(graph_data.get('nodes', []))} nodes, {len(graph_data.get('links', []))} links in credential syndicate graph")

    # 9. Document Verification Lab & AI Cross-Check Pipeline
    print("\n[9] Testing Document Verification Lab & Cross-Checks...")
    r = client.get("/api/v1/documents/test-samples", headers=auth_headers)
    assert r.status_code == 200
    samples = r.json()
    sample_items = samples if isinstance(samples, list) else samples.get("samples", [])
    print(f"  [PASS] GET /api/v1/documents/test-samples -> {len(sample_items)} preconfigured verification scenarios")

    if sample_items:
        first_scenario = sample_items[0]["id"]
        r = client.post(f"/api/v1/documents/ai-test-sample/{first_scenario}", headers=auth_headers)
        assert r.status_code == 200
        test_run = r.json()
        print(f"  [PASS] POST /api/v1/documents/ai-test-sample/{first_scenario} -> Verdict: {test_run.get('overall_verdict') or test_run.get('verdict')}, Authenticity Score: {test_run.get('authenticity_score') or test_run.get('authenticityScore')}")

    # 10. Officer & Admin Status Updates & Logs
    print("\n[10] Testing Officer Actions & Admin Endpoints...")
    r = client.put(f"/api/v1/applications/{app_id}/status?new_status=under_review&note=Initial+document+audit", headers=officer_headers)
    assert r.status_code == 200, f"Update app status failed: {r.text}"
    print(f"  [PASS] PUT /api/v1/applications/{app_id}/status -> Application status updated to under_review")

    r = client.patch(f"/api/v1/complaints/{complaint_id}/status", json={"status": "investigating", "notes": "Assigned to vigilance officer"}, headers=officer_headers)
    assert r.status_code == 200, f"Update complaint status failed: {r.text}"
    print(f"  [PASS] PATCH /api/v1/complaints/{complaint_id}/status -> Complaint status updated to investigating")

    r = client.get("/api/v1/admin/users", headers=admin_headers)
    assert r.status_code == 200, f"Admin get users failed: {r.text}"
    users_list = r.json()
    print(f"  [PASS] GET /api/v1/admin/users -> Retrieved {len(users_list)} system users")

    r = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert r.status_code == 200, f"Admin audit logs failed: {r.text}"
    logs = r.json()
    print(f"  [PASS] GET /api/v1/admin/audit-logs -> Retrieved {len(logs)} audit entries")

    print("\n================================================================")
    print("  ALL 10 FULL-STACK MODULE TESTS COMPLETED WITH 100% SUCCESS!")
    print("================================================================")


if __name__ == "__main__":
    test_full_system()
