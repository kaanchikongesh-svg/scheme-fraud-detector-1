"""
Synthetic data generator + database seeder.

Two usage modes:
  1. Seed Database: imported by seed.py -> seed_database(db)
  2. In-memory demo: generate_synthetic_dataset(n) -> dict (legacy fallback)
"""
import random
import datetime
import bcrypt
from typing import List, Dict, Any
from ai_engine import hash_pii

# ─── Reference Data ──────────────────────────────────────────────────────────

DISTRICTS_DATA = [
    {"id": 1,  "name": "Chennai",     "state": "Tamil Nadu",     "lat": 13.0827, "lng": 80.2707},
    {"id": 2,  "name": "Coimbatore",  "state": "Tamil Nadu",     "lat": 11.0168, "lng": 76.9558},
    {"id": 3,  "name": "Madurai",     "state": "Tamil Nadu",     "lat": 9.9252,  "lng": 78.1198},
    {"id": 4,  "name": "Mumbai",      "state": "Maharashtra",    "lat": 19.0760, "lng": 72.8777},
    {"id": 5,  "name": "Pune",        "state": "Maharashtra",    "lat": 18.5204, "lng": 73.8567},
    {"id": 6,  "name": "Delhi",       "state": "Delhi",          "lat": 28.6139, "lng": 77.2090},
    {"id": 7,  "name": "Bengaluru",   "state": "Karnataka",      "lat": 12.9716, "lng": 77.5946},
    {"id": 8,  "name": "Hyderabad",   "state": "Telangana",      "lat": 17.3850, "lng": 78.4867},
    {"id": 9,  "name": "Kolkata",     "state": "West Bengal",    "lat": 22.5726, "lng": 88.3639},
    {"id": 10, "name": "Lucknow",     "state": "Uttar Pradesh",  "lat": 26.8467, "lng": 80.9462},
    {"id": 11, "name": "Patna",       "state": "Bihar",          "lat": 25.5941, "lng": 85.1376},
    {"id": 12, "name": "Jaipur",      "state": "Rajasthan",      "lat": 26.9124, "lng": 75.7873},
    {"id": 13, "name": "Ahmedabad",   "state": "Gujarat",        "lat": 23.0225, "lng": 72.5714},
    {"id": 14, "name": "Bhopal",      "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126},
    {"id": 15, "name": "Chandigarh",  "state": "Punjab",         "lat": 30.7333, "lng": 76.7794},
    {"id": 16, "name": "Thiruvananthapuram", "state": "Kerala",  "lat": 8.5241,  "lng": 76.9366},
    {"id": 17, "name": "Guwahati",    "state": "Assam",          "lat": 26.1445, "lng": 91.7362},
    {"id": 18, "name": "Ranchi",      "state": "Jharkhand",      "lat": 23.3441, "lng": 85.3096},
    {"id": 19, "name": "Bhubaneswar", "state": "Odisha",         "lat": 20.2961, "lng": 85.8245},
    {"id": 20, "name": "Nagpur",      "state": "Maharashtra",    "lat": 21.1458, "lng": 79.0882},
]

SCHEMES_DATA: List[Dict[str, Any]] = [
    {
        "id": 1,  "name": "Kalaignar Magalir Urimai Thittam (KMUT) — Tamil Nadu",
        "description": "Monthly direct benefit transfer of ₹1,000 for women heads of eligible households in Tamil Nadu.",
        "category": "Women & Social Welfare",
        "eligibility_criteria": {"max_income": 250000, "min_age": 21, "gender": "female"},
        "benefit_amount": 12000,
        "required_documents": [
            {"type": "identity_proof", "label": "Identity Proof (Aadhaar / Voter ID)", "required": True},
            {"type": "address_proof", "label": "Smart Ration Card / Electricity Bill", "required": True},
            {"type": "income_certificate", "label": "Income Certificate", "required": True},
            {"type": "bank_passbook", "label": "Bank Account Passbook (Linked to Aadhaar)", "required": True}
        ]
    },
    {
        "id": 2,  "name": "Pudhumai Penn Higher Education Scheme — Tamil Nadu",
        "description": "₹1,000 per month financial grant for female students from government schools pursuing undergraduate education.",
        "category": "Higher Education",
        "eligibility_criteria": {"max_income": 300000, "min_age": 17, "max_age": 25, "gender": "female"},
        "benefit_amount": 12000,
        "required_documents": [
            {"type": "identity_proof", "label": "Student Identity Proof (Aadhaar)", "required": True},
            {"type": "income_certificate", "label": "Family Income Certificate", "required": True},
            {"type": "address_proof", "label": "School Transfer Certificate (Govt School 6th-12th)", "required": True},
            {"type": "bank_passbook", "label": "Student Bank Passbook", "required": True}
        ]
    },
    {
        "id": 3,  "name": "Chief Minister's Comprehensive Health Insurance Scheme (CMCHIS)",
        "description": "Cashless health coverage up to ₹5,00,000 per year per family for empanelled hospital procedures in Tamil Nadu.",
        "category": "Healthcare",
        "eligibility_criteria": {"max_income": 120000},
        "benefit_amount": 500000,
        "required_documents": [
            {"type": "identity_proof", "label": "Aadhaar Card / Smart Family Card", "required": True},
            {"type": "income_certificate", "label": "Revenue Department Income Certificate", "required": True},
            {"type": "address_proof", "label": "Residential / Ration Proof", "required": True}
        ]
    },
    {
        "id": 4,  "name": "Tamil Nadu Uzhavar Pathukappu Thittam (Farmers Welfare Scheme)",
        "description": "Comprehensive social security, input subsidy, and accident relief for agricultural cultivators in Tamil Nadu.",
        "category": "Agriculture",
        "eligibility_criteria": {"max_income": 180000, "min_age": 18, "occupation": "farmer"},
        "benefit_amount": 15000,
        "required_documents": [
            {"type": "identity_proof", "label": "Farmer Identity Proof", "required": True},
            {"type": "address_proof", "label": "Land Ownership Records (Patta / Chitta)", "required": True},
            {"type": "income_certificate", "label": "Agricultural Income Certificate", "required": True},
            {"type": "bank_passbook", "label": "Bank Passbook", "required": True}
        ]
    },
    {
        "id": 5,  "name": "Moovalur Ramamirtham Ammaiyar Marriage Assistance Scheme",
        "description": "Financial assistance of ₹50,000 and 8 grams gold coin for brides from economically weaker families.",
        "category": "Social Security",
        "eligibility_criteria": {"max_income": 72000, "min_age": 18, "gender": "female"},
        "benefit_amount": 50000,
        "required_documents": [
            {"type": "identity_proof", "label": "Bride & Parent Identity Proof", "required": True},
            {"type": "income_certificate", "label": "Income Certificate (< ₹72,000/yr)", "required": True},
            {"type": "address_proof", "label": "Community & Residence Certificate", "required": True},
            {"type": "bank_passbook", "label": "Bride Savings Bank Passbook", "required": True}
        ]
    },
    {
        "id": 6,  "name": "PM Kisan Samman Nidhi",
        "description": "Direct income support of ₹6,000 per year in three equal installments to all landholding farmer families.",
        "category": "Agriculture",
        "eligibility_criteria": {"max_income": 150000, "min_age": 18},
        "benefit_amount": 6000,
        "required_documents": [
            {"type": "identity_proof", "label": "Aadhaar Card", "required": True},
            {"type": "address_proof", "label": "Land Record (Patta/Khasra)", "required": True},
            {"type": "bank_passbook", "label": "Aadhaar-Seeded Bank Passbook", "required": True}
        ]
    },
    {
        "id": 7,  "name": "MGNREGA (Mahatma Gandhi National Rural Employment)",

        "description": "100 days of guaranteed wage employment per rural household per year.",
        "category": "Employment",
        "eligibility_criteria": {"max_income": 200000, "min_age": 18},
        "benefit_amount": 25000,
        "required_documents": [
            {"type": "identity_proof", "label": "Job Card / Aadhaar", "required": True},
            {"type": "address_proof", "label": "Gram Panchayat Residence Proof", "required": True},
            {"type": "bank_passbook", "label": "Bank / Post Office Passbook", "required": True}
        ]
    },
    {
        "id": 8,  "name": "Pradhan Mantri Ujjwala Yojana",
        "description": "LPG connection subsidy for BPL women households.",
        "category": "Energy",
        "eligibility_criteria": {"max_income": 180000, "min_age": 18, "gender": "female"},
        "benefit_amount": 3200,
        "required_documents": [
            {"type": "identity_proof", "label": "Aadhaar Card of Woman Head", "required": True},
            {"type": "address_proof", "label": "BPL Ration Card / Address Proof", "required": True},
            {"type": "bank_passbook", "label": "Bank Passbook", "required": True}
        ]
    },
    {
        "id": 9,  "name": "National Social Assistance Programme",
        "description": "Monthly pension for elderly, widows, and disabled persons.",
        "category": "Social Welfare",
        "eligibility_criteria": {"max_income": 100000, "min_age": 60},
        "benefit_amount": 3600,
        "required_documents": [
            {"type": "identity_proof", "label": "Age & Identity Proof (Aadhaar / Voter ID)", "required": True},
            {"type": "income_certificate", "label": "Income Certificate (< ₹1,00,000/yr)", "required": True},
            {"type": "bank_passbook", "label": "Bank Passbook for DBT", "required": True}
        ]
    },
    {
        "id": 10, "name": "Beti Bachao Beti Padhao",
        "description": "Educational support and conditional cash transfers for girl children.",
        "category": "Education",
        "eligibility_criteria": {"max_income": 200000, "gender": "female"},
        "benefit_amount": 15000,
        "required_documents": [
            {"type": "identity_proof", "label": "Child Birth Certificate & Parent Aadhaar", "required": True},
            {"type": "address_proof", "label": "Residential Proof", "required": True},
            {"type": "bank_passbook", "label": "Sukanya Samriddhi / Bank Passbook", "required": True}
        ]
    },
    {
        "id": 11, "name": "Skill India Mission",
        "description": "Free vocational training and certification for youth.",
        "category": "Employment",
        "eligibility_criteria": {"max_income": 300000, "max_age": 35},
        "benefit_amount": 8000,
        "required_documents": [
            {"type": "identity_proof", "label": "Aadhaar Card", "required": True},
            {"type": "address_proof", "label": "Educational Certificate / Residence Proof", "required": True},
            {"type": "bank_passbook", "label": "Bank Account Passbook", "required": True}
        ]
    },
    {
        "id": 12, "name": "PM SVANidhi — Street Vendor Loan",
        "description": "Collateral-free working capital loan for street vendors.",
        "category": "Finance",
        "eligibility_criteria": {"max_income": 150000},
        "benefit_amount": 20000,
        "required_documents": [
            {"type": "identity_proof", "label": "Aadhaar / Voter ID", "required": True},
            {"type": "address_proof", "label": "Vending Certificate / Urban Local Body ID", "required": True},
            {"type": "bank_passbook", "label": "Bank Passbook", "required": True}
        ]
    },
]

USERS_SEED: List[Dict[str, Any]] = [
    {"id": 1, "name": "Admin Singh",         "email": "admin@gov.in",      "password": "admin123",   "role": "admin",             "district_id": None},
    {"id": 2, "name": "District Officer Rao", "email": "do.rao@gov.in",     "password": "officer123", "role": "district_officer",  "district_id": 10},
    {"id": 3, "name": "Verifying Officer K",  "email": "vo.k@gov.in",       "password": "officer123", "role": "verifying_officer", "district_id": 4},
    {"id": 4, "name": "Citizen User",         "email": "citizen@gmail.com", "password": "citizen123", "role": "citizen",           "district_id": 4},
]

FIRST_NAMES = ["Ramesh", "Suresh", "Priya", "Anita", "Deepak", "Sunita", "Mohan",
               "Kavitha", "Rajesh", "Meena", "Arjun", "Divya", "Arun", "Lakshmi",
               "Vijay", "Pooja", "Sanjay", "Rekha", "Manoj", "Geeta"]
LAST_NAMES  = ["Kumar", "Sharma", "Patel", "Singh", "Reddy", "Nair", "Iyer",
               "Rao", "Gupta", "Das", "Verma", "Joshi", "Shah", "Pandey",
               "Mishra", "Yadav", "Tiwari", "Chaudhary", "Saxena", "Bose"]


def _rand_date(start_year: int, end_year: int) -> str:
    return f"{random.randint(start_year, end_year)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"


def _rand_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_beneficiary_records(num: int = 500) -> List[Dict[str, Any]]:
    beneficiaries = []

    # Pattern 1: Duplicate Aadhaar (IDs 1-3)
    shared_aadhaar = hash_pii("999900001111")
    for i in range(1, 4):
        beneficiaries.append({
            "id": i, "full_name": f"Ramesh Kumar {chr(64 + i)}",
            "dob": "1980-05-12", "gender": "male",
            "aadhaar_hash": shared_aadhaar,
            "phone": f"987654320{i}",
            "address": f"{10 * i} MG Road, Civil Lines",
            "district_id": 4,
            "bank_account_hash": hash_pii(f"BANK_ACC_00{i}"),
            "ifsc_code": "SBIN0001234",
            "declared_income": 75000.0, "status": "flagged",
            "created_at": "2024-01-15",
        })

    # Pattern 2: Duplicate bank account (IDs 4-6)
    shared_bank = hash_pii("987654321098")
    for i in range(4, 7):
        beneficiaries.append({
            "id": i, "full_name": _rand_name(),
            "dob": "1985-08-20", "gender": "female",
            "aadhaar_hash": hash_pii(f"AADHAAR_999{i}"),
            "phone": f"987654330{i}",
            "address": f"Sector {i}, Lucknow",
            "district_id": 10,
            "bank_account_hash": shared_bank,
            "ifsc_code": "PUNB0004567",
            "declared_income": 65000.0, "status": "flagged",
            "created_at": "2024-02-10",
        })

    # Pattern 3: Fraud ring — shared phone (IDs 7-12)
    ring_phone = "9900112233"
    for i in range(7, 13):
        beneficiaries.append({
            "id": i, "full_name": f"{random.choice(FIRST_NAMES)} Gupta",
            "dob": f"19{70 + i}-01-01",
            "gender": "male" if i % 2 == 0 else "female",
            "aadhaar_hash": hash_pii(f"AADHAAR_RING_{i}"),
            "phone": ring_phone,
            "address": "5 Ring Road Cluster, Lucknow",
            "district_id": 10,
            "bank_account_hash": hash_pii(f"BANK_RING_{i % 3}"),
            "ifsc_code": "SBIN0009999",
            "declared_income": float(80000 + (i * 2000)), "status": "flagged",
            "created_at": "2024-03-01",
        })

    # Remaining: random low-risk + occasional high-income outlier
    for i in range(13, num + 1):
        is_high_income = random.random() < 0.05
        income = random.randint(400000, 600000) if is_high_income else random.randint(45000, 180000)
        status = "flagged" if is_high_income else random.choice(["approved", "pending", "approved", "approved"])
        created = _rand_date(2023, 2024)
        district = random.choice(DISTRICTS_DATA)
        beneficiaries.append({
            "id": i, "full_name": _rand_name(),
            "dob": _rand_date(1960, 2004),
            "gender": random.choice(["male", "female"]),
            "aadhaar_hash": hash_pii(f"AADHAAR_{i:06d}"),
            "phone": f"9{random.randint(700000000, 999999999)}",
            "address": f"{random.randint(1, 99)} Ward {random.randint(1, 15)}, Sector {random.randint(1, 20)}",
            "district_id": district["id"],
            "bank_account_hash": hash_pii(f"BANK_{i:06d}"),
            "ifsc_code": f"SBIN00{random.randint(1000, 9999)}",
            "declared_income": float(income), "status": status,
            "created_at": created,
        })

    return beneficiaries


def generate_synthetic_dataset(num_beneficiaries: int = 500) -> Dict[str, Any]:
    return {
        "districts": DISTRICTS_DATA,
        "schemes": SCHEMES_DATA,
        "beneficiaries": generate_beneficiary_records(num_beneficiaries),
    }


def seed_database(db, count: int = 500):
    from db_models import District, User, Scheme, Beneficiary, Application, ApplicationStatusHistory, AIPrediction
    from ai_engine import LeakageProbabilityEngine
    import datetime as dt

    if db.query(Beneficiary).count() > 0:
        print("[SEED] Database already contains records — skipping.")
        return

    print("[SEED] Starting database seed...")

    # 1. Districts
    district_map = {}
    for d in DISTRICTS_DATA:
        obj = District(id=d["id"], name=d["name"], state=d["state"], lat=d["lat"], lng=d["lng"])
        db.add(obj)
        district_map[d["id"]] = obj
    db.flush()
    print(f"  -> Added {len(DISTRICTS_DATA)} districts")

    # 2. Schemes
    scheme_map = {}
    for s in SCHEMES_DATA:
        obj = Scheme(
            id=s["id"], name=s["name"], description=s["description"],
            category=s["category"], eligibility_criteria=s["eligibility_criteria"],
            benefit_amount=s["benefit_amount"],
        )
        db.add(obj)
        scheme_map[s["id"]] = obj
    db.flush()
    print(f"  -> Added {len(SCHEMES_DATA)} schemes")

    # 3. Users (bcrypt hashed passwords)
    user_map = {}
    for u in USERS_SEED:
        obj = User(
            id=u["id"], name=u["name"], email=u["email"],
            hashed_password=hash_password(u["password"]),
            role=u["role"], district_id=u.get("district_id"),
        )
        db.add(obj)
        user_map[u["id"]] = obj
    db.flush()
    print(f"  -> Added {len(USERS_SEED)} users")

    # 4. Beneficiaries
    beneficiary_records = generate_beneficiary_records(count)
    beneficiary_map = {}
    for b in beneficiary_records:
        dob = dt.date.fromisoformat(b["dob"]) if b.get("dob") else None
        obj = Beneficiary(
            id=b["id"], full_name=b["full_name"],
            dob=dob, gender=b.get("gender", "other"),
            aadhaar_hash=b["aadhaar_hash"],
            phone=b.get("phone"), address=b.get("address"),
            district_id=b.get("district_id"),
            bank_account_hash=b.get("bank_account_hash"),
            ifsc_code=b.get("ifsc_code"),
            declared_income=b.get("declared_income", 0.0),
            status=b.get("status", "pending"),
        )
        db.add(obj)
        beneficiary_map[b["id"]] = obj
    db.flush()
    print(f"  -> Added {count} beneficiaries")

    # 5. Applications (one per beneficiary, random scheme)
    scheme_ids = list(scheme_map.keys())
    application_map = {}
    for b_id, b_obj in beneficiary_map.items():
        scheme_id = random.choice(scheme_ids)
        app = Application(
            application_number=f"APP-2026-{b_id:06d}",
            beneficiary_id=b_id, scheme_id=scheme_id,
            status=b_obj.status,
        )
        db.add(app)
        application_map[b_id] = (app, scheme_id)
    db.flush()
    print(f"  -> Created {count} applications")

    # 6. Run AI Leakage Probability pipeline + write ai_predictions
    engine = LeakageProbabilityEngine(beneficiary_records, SCHEMES_DATA)
    pred_count = 0
    for b_id, (app, scheme_id) in application_map.items():
        b_dict = next(b for b in beneficiary_records if b["id"] == b_id)
        result = engine.evaluate(b_dict, scheme_id=scheme_id)
        pred = AIPrediction(
            application_id=app.id,
            beneficiary_id=b_id,
            leakage_probability=result["leakage_probability"],
            concern_level=result["concern_level"],
            contributing_factors=result["contributing_factors"],
            severity=result["severity"],
            recommended_action=result["recommended_action"],
            potential_leakage_amount=result["potential_leakage_amount"],
            model_version=result["model_version"],
        )
        db.add(pred)
        db.add(ApplicationStatusHistory(
            application_id=app.id,
            status=b_obj.status,
            note="Application seeded from synthetic development dataset",
        ))
        pred_count += 1

    db.commit()
    print(f"  -> Stored {pred_count} AI leakage predictions")
    ensure_application_support_records(db)
    print("[SEED] Seeding successfully completed!")


def ensure_application_support_records(db):
    """Backfill IDs and history for legacy demo DBs without creating fake files."""
    from db_models import Application, ApplicationStatusHistory

    applications = db.query(Application).all()
    for application in applications:
        if not application.application_number:
            application.application_number = f"APP-2026-{application.id:06d}"
        if not application.status_history:
            db.add(ApplicationStatusHistory(
                application_id=application.id,
                status=str(application.status),
                note="Legacy application migrated from synthetic development dataset",
            ))
    db.commit()
