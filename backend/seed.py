"""
Database seed entry point.
Safe for all terminal encodings (ASCII/UTF-8).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import create_tables, SessionLocal
from synthetic_data import seed_database, seed_complaints
from config import settings




def main():
    print(f"[SEED] Database URL: {settings.DATABASE_URL}")
    print("[SEED] Creating tables...")
    create_tables()
    print("[SEED] Tables created successfully.")

    db = SessionLocal()
    try:
        seed_database(db, count=settings.SEED_COUNT)
        complaints_count = seed_complaints(db)
        print(f"[SEED] Grievances/complaints verified in DB: {complaints_count}")
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
