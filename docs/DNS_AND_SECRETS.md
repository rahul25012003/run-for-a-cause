# Production DNS + secrets cutover

Step-by-step for the day you flip from test/dev keys to live production.
Each section is independent — flip them in any order.

---

## 1. Resend transactional email (E3)

### DNS records

After adding `runforacause.in` to your Resend dashboard, Resend gives you
3 records to add at your DNS provider:

| Type | Host | Value (placeholder — copy from Resend) |
|---|---|---|
| `MX` | `send.runforacause.in` | `feedback-smtp.<region>.amazonses.com` priority 10 |
| `TXT` | `send.runforacause.in` | `v=spf1 include:amazonses.com ~all` |
| `TXT` | `resend._domainkey.runforacause.in` | (long DKIM key from Resend) |

Recommended additions (not required by Resend, but improve deliverability):

| Type | Host | Value |
|---|---|---|
| `TXT` | `_dmarc.runforacause.in` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@runforacause.in` |
| `TXT` | `runforacause.in` | (additional SPF if you also send from Google Workspace, etc.) |

### Verify

```powershell
# DNS propagation check
nslookup -type=TXT resend._domainkey.runforacause.in

# Resend domain status — should be "verified"
curl -H "Authorization: Bearer $env:RESEND_API_KEY" `
     https://api.resend.com/domains
```

### Cutover

```bash
# .env on production
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@runforacause.in
FROM_NAME=RunForACause
```

Restart the backend. The startup validator in `main.py` will scream loudly
if you missed any of the above.

---

## 2. Razorpay live keys (E1)

### Steps in Razorpay dashboard

1. KYC complete? Razorpay won't issue live keys until your business KYC is approved.
2. Settings → API Keys → Generate Live Key
3. Copy `Key Id` (starts with `rzp_live_`) and `Key Secret`
4. Webhooks → Add → URL: `https://api.runforacause.in/api/v1/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`, `refund.processed`, `fund_account.validation.completed`
   - Copy webhook secret

### .env on production

```bash
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=<live secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>
```

### Smoke test

After deploy:

1. Make a real ₹1 donation through the public site — verify it captures
2. Check Razorpay dashboard → Payments — the donation must appear there
3. Check `/admin/donations` shows `status = captured`
4. Check Razorpay → Webhooks → Recent deliveries — all 200 OK

If the webhook fails, look at backend logs for `webhooks.razorpay.invalid_signature`. Most common cause: webhook secret mismatch.

---

## 3. KYC penny-drop (E2)

Razorpay automatically enables Fund Account Validation API when your
account is on the **Razorpay Route** (or RazorpayX) plan. This is a
contact-Razorpay-sales step — doesn't need code changes once enabled.

After it's enabled:

- Super-admin opens `/admin/organisations/{slug}/kyc`
- New "Run penny-drop" button appears (because `kyc_verification_service.is_available()` returns True)
- Razorpay sends ₹1 to the org's bank account, returns the registered name
- Webhook fires `fund_account.validation.completed` → backend updates `kyc_metadata` and surfaces the name match for super-admin review

The button is hidden when running with `rzp_test_*` keys (test-mode rejects validation requests).

---

## 4. SECRET_KEY rotation

Generate a fresh, never-checked-in JWT signing secret:

```powershell
python -c "import secrets; print(secrets.token_hex(64))"
```

Set `SECRET_KEY=<that value>` in production env. **Don't commit it.**

Rotation cost: every existing JWT (logged-in user) becomes invalid and
must re-login. Plan for a slot when usage is low.

---

## 5. CORS_ORIGINS

```bash
CORS_ORIGINS=["https://runforacause.in","https://www.runforacause.in"]
```

Drop `localhost` and `127.0.0.1` for production.

---

## 6. iOS PWA preflight (E6)

Things to verify on a real iPhone (not simulator):

1. Open `https://runforacause.in` in Safari
2. Share menu → Add to Home Screen
3. App icon appears with the right brand orange tile (from `apple-touch-icon`)
4. Tap the home-screen icon → opens fullscreen, no Safari chrome
5. Status bar reads brand orange (theme-color)
6. Bottom tab bar respects safe-area-inset (no overlap with home indicator)
7. Web share button on any event detail page → invokes native share sheet
8. Donate flow completes — Razorpay's iOS Safari modal works (some apps have compat issues)
9. Pull-to-refresh works
10. App launches quickly cold-start (bundle size matters)

If any of those break, the fix is in `app/layout.tsx` (theme-color, viewport),
`public/manifest.json`, or component-level `pb-[env(safe-area-inset-bottom)]`.

---

## Production go-live checklist

```
[ ] DNS: Resend records added + verified
[ ] DNS: api.runforacause.in → backend  (A or CNAME)
[ ] DNS: runforacause.in → frontend  (A or CNAME)
[ ] TLS: HTTPS certs issued (Let's Encrypt or Cloudflare)
[ ] .env: APP_ENV=production
[ ] .env: COOKIE_SECURE=true
[ ] .env: SECRET_KEY rotated (64 hex chars)
[ ] .env: RAZORPAY_KEY_ID is rzp_live_*
[ ] .env: EMAIL_PROVIDER=resend
[ ] .env: FRONTEND_URL=https://runforacause.in
[ ] .env: ENABLE_SCHEDULER=1 on EXACTLY ONE worker
[ ] .env: SENTRY_DSN set (optional but recommended)
[ ] DB: backups cron is running (scripts/backup_db.sh)
[ ] Monitor: UptimeRobot pinging /health
[ ] Smoke: real ₹1 donation captures end-to-end
[ ] Smoke: 80G receipt PDF emails to test inbox
[ ] iOS: real device install + share + donate flow
```
