---
name: send-test-email
description: Render and dispatch any of the platform's email templates so you can preview the output in the dev console (or, with EMAIL_PROVIDER=resend, in your inbox). Use when iterating on email design.
allowed-tools: PowerShell, Bash
---

# Send a test email

The console backend (default in dev) prints the email payload to the
backend stdout instead of actually sending it. This skill triggers
each template so you can read the rendered HTML.

## Command

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
import asyncio
from app.services.email_service import (
    EmailMessage,
    send_email,
    render_donation_confirmation,
    render_milestone_email,
    render_tax_receipt_email,
)

async def m():
    # Donation confirmation
    s, h = render_donation_confirmation(
        donor_name='Rahul Sharma',
        runner_name='Ravi Kumar',
        event_title='Run for Education 2026',
        amount='₹5,000',
        donation_type='fixed',
    )
    await send_email(EmailMessage(to='preview@example.com', subject=s, html=h))

    # Milestone (halfway)
    s, h = render_milestone_email(
        runner_first_name='Ravi',
        event_title='Run for Education 2026',
        milestone_title='Halfway hero',
        milestone_body='Halfway to the personal distance goal.',
        distance_km='50 km',
        amount_raised='INR 23,500',
        public_url='http://localhost:3000/runners/ravi-kumar-...',
    )
    await send_email(EmailMessage(to='preview@example.com', subject=s, html=h))

    # 80G receipt
    s, h = render_tax_receipt_email(
        donor_name='Rahul Sharma',
        organisation_name='Asha Foundation',
        receipt_number='RFAC-RCPT-2026-PREVIEW-01',
    )
    await send_email(EmailMessage(to='preview@example.com', subject=s, html=h))

    print('Sent 3 test emails (check backend dev console for HTML output).')
asyncio.run(m())
"@
```

## After

Look at the `npm run dev:backend` terminal — the `ConsoleBackend` will
log each `email_dispatched_console` event with the subject + first 200
chars of the body. To see the full HTML, run with `EMAIL_PROVIDER=resend`
and a real Resend API key (it'll send for real to the `to:` address).

## Tips

- Inline CSS only — most email clients strip `<style>` blocks
- Test in actual mail clients (Gmail, Outlook, Apple Mail) before claiming a template "ships". They render very differently.
- Use https://putsmail.com or https://litmus.com for visual testing in real clients.
