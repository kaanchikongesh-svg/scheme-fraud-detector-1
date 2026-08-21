"""
Test Live SMTP Socket Delivery and Email Construction.
Spins up a lightweight local SMTP server, sends a real reset email through EmailService,
and validates email headers, multipart text/html, tokens, and security notices.
"""
import sys
import os
import threading
import socketserver
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from email_service import EmailService
from config import settings


captured_emails = []


class LocalSMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.wfile.write(b"220 127.0.0.1 VerdantShield SMTP Ready\r\n")
        self.wfile.flush()
        data_buffer = []
        is_data_mode = False

        while True:
            line = self.rfile.readline()
            if not line:
                break

            if is_data_mode:
                if line == b".\r\n" or line == b".\n" or line.strip() == b".":
                    is_data_mode = False
                    full_content = b"".join(data_buffer)
                    captured_emails.append(full_content)
                    self.wfile.write(b"250 2.0.0 OK Message accepted for delivery\r\n")
                    self.wfile.flush()
                else:
                    data_buffer.append(line)
            else:
                line_str = line.decode("utf-8", errors="ignore").strip()
                cmd = line_str.upper()
                if cmd.startswith("EHLO") or cmd.startswith("HELO"):
                    self.wfile.write(b"250-127.0.0.1 Hello\r\n250 HELP\r\n")
                    self.wfile.flush()
                elif cmd.startswith("MAIL FROM:"):
                    self.wfile.write(b"250 2.1.0 Sender OK\r\n")
                    self.wfile.flush()
                elif cmd.startswith("RCPT TO:"):
                    self.wfile.write(b"250 2.1.5 Recipient OK\r\n")
                    self.wfile.flush()
                elif cmd == "DATA":
                    is_data_mode = True
                    self.wfile.write(b"354 Start mail input; end with <CRLF>.<CRLF>\r\n")
                    self.wfile.flush()
                elif cmd == "QUIT":
                    self.wfile.write(b"221 2.0.0 Bye\r\n")
                    self.wfile.flush()
                    break
                else:
                    self.wfile.write(b"250 OK\r\n")
                    self.wfile.flush()


def run_live_smtp_test():
    # 1. Start test SMTP server on port 1025
    server = socketserver.TCPServer(("127.0.0.1", 1025), LocalSMTPHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print("[OK] Test SMTP Server listening on 127.0.0.1:1025")

    try:
        # 2. Configure EmailService for local test server
        test_email_service = EmailService()
        test_email_service.host = "127.0.0.1"
        test_email_service.port = 1025
        test_email_service.username = ""
        test_email_service.password = ""
        test_email_service.use_tls = False
        test_email_service.use_ssl = False
        test_email_service.from_email = "noreply@verdantshield.gov.in"
        test_email_service.from_name = "Verdant Shield — AI Leakage Detector"
        test_email_service.frontend_url = "http://localhost:5173"

        # 3. Send real email via SMTP
        test_token = "secure_random_single_use_token_987654321"
        result = test_email_service.send_password_reset_email(
            to_email="citizen.applicant@example.com",
            user_name="Kongeshwaran K",
            reset_token=test_token
        )

        assert result["success"] is True, f"Email delivery failed: {result}"
        print("[OK] EmailService.send_password_reset_email completed with success=True")

        # 4. Verify message received by SMTP server
        assert len(captured_emails) == 1, f"Expected 1 captured email, got {len(captured_emails)}"
        raw_email_bytes = captured_emails[0]

        import email
        parsed_msg = email.message_from_bytes(raw_email_bytes)

        assert parsed_msg["Subject"] == "Reset your AI Government Scheme Leakage Detector password"
        assert "citizen.applicant@example.com" in parsed_msg["To"]

        # Extract text and html payloads
        text_content = ""
        html_content = ""
        for part in parsed_msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                text_content += part.get_payload(decode=True).decode("utf-8")
            elif ct == "text/html":
                html_content += part.get_payload(decode=True).decode("utf-8")

        assert "Kongeshwaran K" in text_content
        assert "Kongeshwaran K" in html_content
        assert "http://localhost:5173/reset-password/secure_random_single_use_token_987654321" in text_content
        assert "http://localhost:5173/reset-password/secure_random_single_use_token_987654321" in html_content
        assert "15 minutes" in text_content
        assert "safely ignore this email" in text_content
        assert "password_hash" not in text_content
        assert "aadhaar" not in text_content.lower()
        print("[OK] Real email payload verified: Subject, Recipient, Reset Link, Expiry, Security Warning, No PII leakage")

    finally:
        server.shutdown()
        server.server_close()
        print("[OK] Local test SMTP Server stopped cleanly")


if __name__ == "__main__":
    run_live_smtp_test()
    print("\nALL REAL SMTP DELIVERY TESTS PASSED SUCCESSFULLY!")
