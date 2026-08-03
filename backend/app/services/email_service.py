"""
PricePilot AI - Email Service

Best-effort transactional email delivery via SMTP. When SMTP is not configured
the service logs a notice instead of raising, so the approval workflow never
breaks because of email.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


class EmailService:
    """Sends application emails (access approvals / rejections)."""

    def __init__(self):
        self.enabled = bool(settings.SMTP_HOST and settings.SMTP_PORT)

    def _send(self, to_email: str, subject: str, body_html: str) -> bool:
        """Send an HTML email. Returns True when delivered (or when skipped)."""
        if not self.enabled:
            print(f"[email] SMTP not configured - skipped sending '{subject}' to {to_email}")
            return False
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            print(f"[email] Sent '{subject}' to {to_email}")
            return True
        except Exception as e:
            print(f"[email] Delivery failed to {to_email}: {e}")
            return False

    def send_access_approved(self, to_email: str, name: str, role: str = "data_analyst") -> bool:
        """Notify a user that their access request was approved."""
        role_label = role.replace("_", " ").title()
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #111827; margin-top: 0;">Access Approved 🎉</h2>
          <p style="color: #374151; line-height: 1.6;">Hi {name},</p>
          <p style="color: #374151; line-height: 1.6;">
            Great news — your access request to <strong>PricePilot AI</strong> has been
            approved by an administrator. You can now sign in and start using the platform.
          </p>
          <p style="color: #374151; line-height: 1.6;">Your role: <strong>{role_label}</strong></p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
            If you have any questions, contact your administrator.
          </p>
        </div>
        """
        return self._send(to_email, "PricePilot AI - Your access request was approved", body)

    def send_access_rejected(self, to_email: str, name: str) -> bool:
        """Notify a user that their access request was rejected."""
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #111827; margin-top: 0;">Access Request Update</h2>
          <p style="color: #374151; line-height: 1.6;">Hi {name},</p>
          <p style="color: #374151; line-height: 1.6;">
            We're sorry, but your access request to <strong>PricePilot AI</strong> was not
            approved by the administrator at this time.
          </p>
          <p style="color: #374151; line-height: 1.6;">
            You are welcome to submit a new request on the sign-up page if your situation changes.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
            If you believe this is a mistake, contact your administrator.
          </p>
        </div>
        """
        return self._send(to_email, "PricePilot AI - Your access request was not approved", body)
