---
name: preview-pdf
description: Generate a sample 80G receipt or runner finisher certificate PDF without making a real donation/event. Use when iterating on the PDF design (changing layout, fonts, colors).
allowed-tools: PowerShell, Bash
---

# Preview PDF

The PDFs live at `backend/uploads/receipts/` and `backend/uploads/certificates/`.

## Sample 80G receipt

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
import uuid
from datetime import datetime, UTC
from decimal import Decimal
from app.utils.pdf_generator import generate_80g_receipt_pdf

p = generate_80g_receipt_pdf(
    receipt_number='RFAC-RCPT-2026-PREVIEW-01',
    donation_id=uuid.uuid4(),
    donor_name='Rahul Sharma',
    donor_email='rahul@example.com',
    donor_pan='AAAPR1234B',
    donor_address='42 MG Road, Bengaluru 560001',
    amount_inr=Decimal('5000.00'),
    payment_method='upi',
    payment_id='pay_PREVIEW1234',
    issued_at=datetime.now(UTC),
    organisation_name='Asha Foundation',
    organisation_address='Bengaluru, Karnataka',
    organisation_pan='AAATA1234B',
    organisation_80g='AAATA1234B/80G/2024',
)
print(p)
"@
```

Tell the user to open the printed path.

## Sample runner certificate

```powershell
$env:PYTHONIOENCODING="utf-8"
cd C:\Users\Rahul\run-for-a-cause\backend
.\.venv\Scripts\python.exe -c @"
from datetime import datetime, UTC
from decimal import Decimal
from app.utils.pdf_generator import generate_certificate_pdf

p = generate_certificate_pdf(
    certificate_number='RFAC-CERT-2026-PREVIEW-01',
    runner_name='Ravi Kumar',
    event_title='Run for Education 2026',
    cause_summary='Education for underprivileged girls in rural Karnataka',
    organisation_name='Asha Foundation',
    distance_km=Decimal('100'),
    amount_raised=Decimal('47300'),
    issued_at=datetime.now(UTC),
)
print(p)
"@
```

## After

Once the user confirms the design, the production flow generates these
automatically (`certificate_service.generate_for_event_runner`,
`receipt_service.generate_and_email_receipt`).
