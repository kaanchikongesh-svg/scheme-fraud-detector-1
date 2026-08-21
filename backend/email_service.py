"""
Email Service for Verdant Shield — AI Government Scheme Leakage Detector.
Handles SMTP connection, email template compilation, and password reset delivery.
"""
import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Dict, Any

from config import settings

logger = logging.getLogger("verdant_shield.email_service")


class EmailService:
    """Manages real SMTP email delivery with TLS/SSL support and error handling."""

    def __init__(self):
        self.host = settings.SMTP_HOST.strip() if settings.SMTP_HOST else ""
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME.strip() if settings.SMTP_USERNAME else ""
        self.password = settings.SMTP_PASSWORD.strip() if settings.SMTP_PASSWORD else ""
        self.from_email = settings.SMTP_FROM_EMAIL.strip() if settings.SMTP_FROM_EMAIL else (self.username or "noreply@example.com")
        self.from_name = settings.SMTP_FROM_NAME or "Verdant Shield — AI Leakage Detector"
        self.use_tls = settings.SMTP_USE_TLS
        self.use_ssl = settings.SMTP_USE_SSL
        self.frontend_url = (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")

    @property
    def is_configured(self) -> bool:
        """Returns True if the necessary SMTP settings are present."""
        return bool(self.host and (self.username or self.port == 1025))

    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> Dict[str, Any]:
        """
        Send a real, secure password reset email with single-use token link.
        Raises specific errors if email delivery fails.
        """
        if not self.is_configured:
            logger.warning("SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD in .env")
            return {
                "success": False,
                "error_code": "EMAIL_SERVICE_UNAVAILABLE",
                "message": "SMTP email service is not configured on the server.",
            }

        recipient_name = user_name or "Applicant"
        reset_link = f"{self.frontend_url}/reset-password/{reset_token}"
        expire_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES

        subject = "Reset your GovKavach AI Password — Welfare Scheme Leakage Detector"

        # Plain Text Body
        text_body = f"""Hello {recipient_name},

We received a request to reset your account password for GovKavach AI - AI Government Scheme Leakage & Fraud Detector.

Reset your password using the secure link below:
{reset_link}

This link expires in {expire_minutes} minutes and can only be used once.

If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.

---
GovKavach AI Security Team
AI Government Scheme Leakage Detector
"""

        # Rich Responsive HTML Body
        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080f1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f0f6ff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080f1e; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #111f35; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f1e4a 0%, #1E40AF 100%); padding: 24px 30px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                      GovKavach AI
                    </div>
                    <div style="font-size: 12px; color: #93c5fd; margin-top: 4px; letter-spacing: 0.5px;">
                      AI Government Scheme Leakage & Fraud Detector
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff;">Password Reset Request</h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f0f6ff;">{recipient_name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                We received a request to reset your account password. Click the secure button below to set a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: #2563EB;">
                    <a href="{reset_link}" target="_blank" style="font-size: 14px; font-weight: 700; font-family: inherit; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; background-color: #2563EB; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback Box -->
              <div style="background-color: #0d1829; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; margin-bottom: 24px;">
                <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; font-weight: 600;">
                  Or copy and paste this link in your browser:
                </div>
                <div style="font-size: 12px; color: #60a5fa; word-break: break-all; font-family: monospace;">
                  {reset_link}
                </div>
              </div>

              <!-- Security Notice -->
              <div style="border-left: 3px solid #f59e0b; padding-left: 12px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  ⏳ <strong>Security Notice:</strong> This link expires in <strong>{expire_minutes} minutes</strong> and can only be used once.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you did not request this password reset, please safely ignore this email. Your password will remain unchanged and your account is secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a1222; padding: 18px 30px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © 2026 AI Government Scheme Leakage Detector · Government of Tamil Nadu
              </p>
              <p style="margin: 4px 0 0; font-size: 10px; color: #475569;">
                This is an automated system email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((self.from_name, self.from_email))
        msg["To"] = to_email
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            logger.info(f"Connecting to SMTP server {self.host}:{self.port} to send password reset...")

            if self.use_ssl or self.port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=15) as server:
                    if self.username and self.password:
                        server.login(self.username, self.password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                    server.ehlo()
                    if self.use_tls and server.has_extn("STARTTLS"):
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    if self.username and self.password:
                        server.login(self.username, self.password)
                    server.send_message(msg)

            logger.info(f"Password reset email successfully dispatched to {to_email}")
            return {
                "success": True,
                "message": "Password reset email sent successfully.",
            }

        except smtplib.SMTPAuthenticationError as auth_err:
            logger.error(f"SMTP Authentication Error: {auth_err.smtp_error.decode() if isinstance(auth_err.smtp_error, bytes) else str(auth_err)}")
            return {
                "success": False,
                "error_code": "SMTP_AUTHENTICATION_ERROR",
                "message": "Failed to authenticate with SMTP email server. If using Gmail, an App Password is required.",
            }
        except (smtplib.SMTPConnectError, ConnectionRefusedError, TimeoutError, OSError) as conn_err:
            logger.error(f"SMTP Connection Error: {str(conn_err)}")
            return {
                "success": False,
                "error_code": "SMTP_CONNECTION_ERROR",
                "message": f"Could not connect to SMTP server {self.host}:{self.port}.",
            }
        except smtplib.SMTPException as smtp_err:
            logger.error(f"SMTP Protocol Error: {str(smtp_err)}")
            return {
                "success": False,
                "error_code": "SMTP_DELIVERY_ERROR",
                "message": f"SMTP delivery error: {str(smtp_err)}",
            }
        except Exception as exc:
            logger.error(f"Unexpected email delivery exception: {str(exc)}")
            return {
                "success": False,
                "error_code": "EMAIL_SERVICE_UNAVAILABLE",
                "message": "An unexpected error occurred while sending the email.",
            }

    def test_smtp_connection(self) -> Dict[str, Any]:
        """Verify SMTP connectivity and credentials without sending an email."""
        if not self.is_configured:
            return {
                "success": False,
                "error_code": "EMAIL_NOT_CONFIGURED",
                "message": "SMTP configuration missing in .env",
            }
        try:
            if self.use_ssl or self.port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=10) as server:
                    if self.username and self.password:
                        server.login(self.username, self.password)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                    server.ehlo()
                    if self.use_tls and server.has_extn("STARTTLS"):
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    if self.username and self.password:
                        server.login(self.username, self.password)
            return {
                "success": True,
                "message": f"Successfully connected and authenticated to {self.host}:{self.port}",
            }
        except smtplib.SMTPAuthenticationError:
            return {
                "success": False,
                "error_code": "SMTP_AUTHENTICATION_ERROR",
                "message": "SMTP Authentication failed. For Gmail, use an App Password.",
            }
        except Exception as exc:
            return {
                "success": False,
                "error_code": "SMTP_CONNECTION_ERROR",
                "message": str(exc),
            }


email_service = EmailService()
