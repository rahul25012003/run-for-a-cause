"""Email dispatch — console logger in dev, swappable to Resend/SES in prod."""
from __future__ import annotations

from typing import Protocol

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmailMessage:
    def __init__(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: str | None = None,
        attachments: list[tuple[str, bytes, str]] | None = None,
    ) -> None:
        self.to = to
        self.subject = subject
        self.html = html
        self.text = text or ""
        self.attachments = attachments or []


class EmailBackend(Protocol):
    async def send(self, message: EmailMessage) -> None: ...


class ConsoleBackend:
    """Dev backend — logs the email instead of sending it."""

    async def send(self, message: EmailMessage) -> None:
        logger.info(
            "email_dispatched_console",
            to=message.to,
            subject=message.subject,
            attachments=[a[0] for a in message.attachments],
            preview=message.text[:200] if message.text else message.html[:200],
        )


class ResendBackend:
    """Production backend using Resend's HTTP API. Supports attachments."""

    async def send(self, message: EmailMessage) -> None:
        if not settings.RESEND_API_KEY:
            logger.warning("resend_no_key_falling_back_to_console")
            await ConsoleBackend().send(message)
            return
        import base64

        import httpx

        attachments_payload: list[dict] = []
        for filename, content, _content_type in message.attachments:
            attachments_payload.append(
                {
                    "filename": filename,
                    "content": base64.b64encode(content).decode("ascii"),
                }
            )

        payload: dict = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": [message.to],
            "subject": message.subject,
            "html": message.html,
        }
        if message.text:
            payload["text"] = message.text
        if attachments_payload:
            payload["attachments"] = attachments_payload

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            )
            if resp.status_code >= 400:
                logger.error(
                    "resend_send_failed",
                    status=resp.status_code,
                    body=resp.text,
                )
                raise RuntimeError(f"Resend rejected message: {resp.status_code}")
            logger.info(
                "email_sent_via_resend",
                to=message.to,
                subject=message.subject,
                attachments=len(attachments_payload),
            )


def get_backend() -> EmailBackend:
    if settings.EMAIL_PROVIDER == "resend":
        return ResendBackend()
    return ConsoleBackend()


async def send_email(message: EmailMessage) -> None:
    """Public entrypoint for sending mail."""
    await get_backend().send(message)


# --- Templated helpers ----------------------------------------------------


def render_donation_confirmation(
    donor_name: str,
    runner_name: str,
    event_title: str,
    amount: str,
    donation_type: str,
) -> tuple[str, str]:
    """Return (subject, html) for the donation confirmation email."""
    subject = f"Your donation to {runner_name} is confirmed"
    body_intro = (
        f"You're sponsoring {runner_name} for {event_title}."
        if donation_type == "per_km"
        else f"Your gift to {runner_name} ({event_title}) is in."
    )
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF7F2;border-radius:16px;color:#1A1612;">
      <p style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ED6C0F;">Confirmation</p>
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:28px;margin:8px 0 0;">Thank you, {donor_name}.</h1>
      <p style="margin-top:14px;color:#3D352D;line-height:1.6;">{body_intro}</p>
      <div style="margin:22px 0;padding:18px;background:#FFF;border:1px solid #E8E2DA;border-radius:12px;">
        <p style="margin:0;font-size:11px;color:#6B6259;text-transform:uppercase;letter-spacing:.1em;">Amount</p>
        <p style="margin:6px 0 0;font-size:28px;font-family:'Courier New',monospace;color:#ED6C0F;">{amount}</p>
      </div>
      <p style="font-size:13px;color:#6B6259;line-height:1.6;">
        You'll get progress updates as {runner_name} runs. Once the event closes, you'll receive an
        impact report showing exactly where your money went.
      </p>
      <p style="margin-top:22px;font-size:12px;color:#857F77;">— RunForACause</p>
    </div>
    """
    return subject, html


def render_milestone_email(
    runner_first_name: str,
    event_title: str,
    milestone_title: str,
    milestone_body: str,
    distance_km: str,
    amount_raised: str,
    public_url: str,
) -> tuple[str, str]:
    """Return (subject, html) for a runner-milestone email."""
    subject = f"🏅 {milestone_title} — {event_title}"
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF7F2;border-radius:16px;color:#1A1612;">
      <p style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ED6C0F;">Milestone unlocked</p>
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:30px;line-height:1.1;margin:8px 0 0;">
        {milestone_title}.
      </h1>
      <p style="margin-top:14px;color:#3D352D;line-height:1.6;font-size:15px;">
        {runner_first_name}, that's a real one. {milestone_body}
      </p>
      <div style="margin:22px 0;padding:18px;background:#FFF;border:1px solid #E8E2DA;border-radius:12px;display:flex;gap:24px;">
        <div>
          <p style="margin:0;font-size:10px;color:#857F77;text-transform:uppercase;letter-spacing:.18em;font-weight:700;">Distance</p>
          <p style="margin:6px 0 0;font-size:22px;font-family:'Courier New',monospace;color:#1A1612;font-weight:700;">{distance_km}</p>
        </div>
        <div>
          <p style="margin:0;font-size:10px;color:#857F77;text-transform:uppercase;letter-spacing:.18em;font-weight:700;">Raised</p>
          <p style="margin:6px 0 0;font-size:22px;font-family:'Courier New',monospace;color:#ED6C0F;font-weight:700;">{amount_raised}</p>
        </div>
      </div>
      <p style="font-size:14px;color:#3D352D;line-height:1.6;">
        Now is a great moment to share your page — momentum begets momentum.
      </p>
      <a href="{public_url}" style="display:inline-block;margin-top:14px;padding:12px 22px;background:#ED6C0F;color:#FFF;text-decoration:none;font-weight:600;border-radius:10px;font-size:14px;">
        View my page →
      </a>
      <p style="margin-top:30px;font-size:12px;color:#857F77;">— RunForACause</p>
    </div>
    """
    return subject, html


def render_tax_receipt_email(
    donor_name: str,
    organisation_name: str,
    receipt_number: str,
) -> tuple[str, str]:
    subject = f"Your 80G receipt — {organisation_name}"
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF7F2;border-radius:16px;color:#1A1612;">
      <p style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#2D6A4F;">80G Receipt</p>
      <h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;margin:8px 0 0;">Hi {donor_name},</h1>
      <p style="margin-top:14px;color:#3D352D;line-height:1.6;">
        Your 80G tax receipt for the donation to <b>{organisation_name}</b> is attached. Receipt
        number <b>{receipt_number}</b>.
      </p>
      <p style="font-size:13px;color:#6B6259;line-height:1.6;">
        Keep this for your tax filing. Donations to {organisation_name} are eligible for deduction
        under Section 80G of the Income Tax Act, 1961, subject to the Act's conditions.
      </p>
      <p style="margin-top:22px;font-size:12px;color:#857F77;">— RunForACause</p>
    </div>
    """
    return subject, html
