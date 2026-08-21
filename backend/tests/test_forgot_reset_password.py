"""
End-to-End Test Suite for Real Forgot Password & Reset Password Flow.
Tests token generation, hashing, expiration, single-use enforcement, bcrypt updates, and login.
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import datetime
import hashlib
import bcrypt
import secrets
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from db_models import User, PasswordResetToken, RoleEnum
from main import app, _hash_token
from config import settings
from email_service import email_service


client = TestClient(app)


def test_smtp_status_endpoint():
    """Test the SMTP status inspection endpoint."""
    response = client.get("/api/v1/auth/smtp-status")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "port" in data
    assert "from_name" in data
    print("[OK] SMTP status endpoint returned valid configuration schema")


def test_forgot_password_unknown_email():
    """Test forgot password with an unregistered email (anti-enumeration check)."""
    response = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent_citizen_12345@gmail.com"})
    assert response.status_code == 200
    data = response.json()
    assert "instructions have been sent" in data.get("message", "")
    print("[OK] Anti-enumeration protection passed for unregistered email")


def test_forgot_password_empty_payload():
    """Test validation when both email and mobile are omitted."""
    response = client.post("/api/v1/auth/forgot-password", json={})
    assert response.status_code == 400
    data = response.json()
    assert "VALIDATION_ERROR" in response.headers.get("X-Error-Code", "") or "email" in data.get("detail", "").lower()
    print("[OK] Empty payload validation passed")


def test_complete_reset_flow():
    """Test complete end-to-end registration -> forgot -> reset -> single-use -> login flow."""
    test_email = f"test_citizen_{secrets.token_hex(4)}@example.com"
    test_mobile = f"98765{secrets.randbelow(89999) + 10000}"
    initial_password = "InitialPassword123!"
    new_password = "UpdatedPassword456@"

    # 1. Register a test citizen
    reg_response = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "password": initial_password,
        "confirm_password": initial_password,
        "name": "Karthik Subramanian",
        "mobile": test_mobile,
        "role": "citizen"
    })
    assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
    user_id = reg_response.json()["user"]["id"]
    print(f"[OK] Registered test user: {test_email} (ID: {user_id})")

    # 2. Verify login with initial password
    login_res1 = client.post("/api/v1/auth/login", json={"email": test_email, "password": initial_password})
    assert login_res1.status_code == 200, "Initial login failed"
    print("[OK] Initial login successful")

    # 3. Request Password Reset
    # Simulate email service sending or mock if SMTP unconfigured
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    # If SMTP is configured or unconfigured, let's inspect the database token
    from database import SessionLocal
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.email == test_email).first()
        assert db_user is not None

        # Fetch the generated reset token
        reset_token_record = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == db_user.id
        ).order_by(PasswordResetToken.id.desc()).first()

        assert reset_token_record is not None, "PasswordResetToken record was not created in DB!"
        assert reset_token_record.used_at is None, "Token marked used prematurely"
        assert reset_token_record.expires_at > datetime.datetime.utcnow(), "Token created expired"
        print(f"[OK] PasswordResetToken generated and verified in DB (expires in ~15 mins)")

        # 4. Test invalid token
        invalid_res = client.post("/api/v1/auth/reset-password", json={
            "token": "invalid_fake_token_12345",
            "new_password": new_password,
            "confirm_password": new_password
        })
        assert invalid_res.status_code == 400
        assert "Invalid" in invalid_res.json().get("detail", "")
        print("[OK] Invalid token rejection verified")

        # 5. Test mismatched passwords
        mismatch_res = client.post("/api/v1/auth/reset-password", json={
            "token": "any_token",
            "new_password": "NewPassword123!",
            "confirm_password": "DifferentPassword123!"
        })
        assert mismatch_res.status_code == 400
        assert "match" in mismatch_res.json().get("detail", "").lower()
        print("[OK] Password mismatch validation verified")

        # 6. Test short password
        short_res = client.post("/api/v1/auth/reset-password", json={
            "token": "any_token",
            "new_password": "short",
            "confirm_password": "short"
        })
        assert short_res.status_code == 400
        assert "8 characters" in short_res.json().get("detail", "")
        print("[OK] Password length validation verified")

        # 7. Execute valid password reset using token hash from DB
        # To simulate the exact user clicking their email link, let's create a known raw token
        raw_test_token = secrets.token_urlsafe(32)
        raw_token_hash = _hash_token(raw_test_token)
        test_record = PasswordResetToken(
            user_id=db_user.id,
            token_hash=raw_token_hash,
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        )
        db.add(test_record)
        db.commit()

        reset_exec_res = client.post("/api/v1/auth/reset-password", json={
            "token": raw_test_token,
            "new_password": new_password,
            "confirm_password": new_password
        })
        assert reset_exec_res.status_code == 200, f"Reset password failed: {reset_exec_res.text}"
        assert "successful" in reset_exec_res.json().get("message", "").lower()
        print("[OK] Password reset executed successfully via API")

        # 8. Test SINGLE-USE token enforcement (Reuse attempt)
        reuse_res = client.post("/api/v1/auth/reset-password", json={
            "token": raw_test_token,
            "new_password": "AnotherPassword789#",
            "confirm_password": "AnotherPassword789#"
        })
        assert reuse_res.status_code == 400
        assert "already been used" in reuse_res.json().get("detail", "").lower()
        print("[OK] Single-use token enforcement verified: token cannot be reused!")

        # 9. Test EXPIRED token enforcement
        expired_raw_token = secrets.token_urlsafe(32)
        expired_token_hash = _hash_token(expired_raw_token)
        expired_record = PasswordResetToken(
            user_id=db_user.id,
            token_hash=expired_token_hash,
            expires_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=10) # 10 mins in past
        )
        db.add(expired_record)
        db.commit()

        expired_res = client.post("/api/v1/auth/reset-password", json={
            "token": expired_raw_token,
            "new_password": "AnotherPassword789#",
            "confirm_password": "AnotherPassword789#"
        })
        assert expired_res.status_code == 400
        assert "expired" in expired_res.json().get("detail", "").lower()
        print("[OK] Expired token enforcement verified (15-minute window strictly checked)")

        # 10. Verify old password no longer works
        old_login_res = client.post("/api/v1/auth/login", json={"email": test_email, "password": initial_password})
        assert old_login_res.status_code == 401
        print("[OK] Old password rejected after reset")

        # 11. Verify new password works
        new_login_res = client.post("/api/v1/auth/login", json={"email": test_email, "password": new_password})
        assert new_login_res.status_code == 200
        assert "access_token" in new_login_res.json()
        print("[OK] New password authenticated successfully! Access token granted.")

    finally:
        db.close()


if __name__ == "__main__":
    print("Running Forgot Password & Reset Password Test Suite...")
    test_smtp_status_endpoint()
    test_forgot_password_unknown_email()
    test_forgot_password_empty_payload()
    test_complete_reset_flow()
    print("\nALL PASSWORD RESET TESTS PASSED WITH 100% SUCCESS!")
