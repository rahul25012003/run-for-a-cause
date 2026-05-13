"""Seed (or upsert) default site settings — idempotent."""
from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.site_setting import SettingType, SiteSetting

DEFAULTS: list[dict] = [
    # ===== HERO =====
    {
        "key": "hero.eyebrow",
        "label": "Hero eyebrow text",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "Transparent giving · Made in India",
        "sort_order": 1,
    },
    {
        "key": "hero.heading",
        "label": "Hero headline (first line)",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "Every kilometre",
        "sort_order": 2,
    },
    {
        "key": "hero.italic_word",
        "label": "Hero headline italicised phrase",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "tells a story",
        "description": "The phrase rendered in italic on the hero",
        "sort_order": 3,
    },
    {
        "key": "hero.subheading",
        "label": "Hero headline (continuation)",
        "group": "hero",
        "type": SettingType.LONGTEXT,
        "value": ".\nEvery rupee finds a cause.",
        "sort_order": 4,
    },
    {
        "key": "hero.subtitle",
        "label": "Hero subtitle paragraph",
        "group": "hero",
        "type": SettingType.LONGTEXT,
        "value": "Run for a verified NGO. Sponsor someone you know. Watch the money move — from card to cause to impact — on a public audit page.",
        "sort_order": 5,
    },
    {
        "key": "hero.primary_cta",
        "label": "Primary CTA label",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "Start running for a cause",
        "sort_order": 6,
    },
    {
        "key": "hero.secondary_cta",
        "label": "Secondary CTA label",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "Browse live events",
        "sort_order": 7,
    },
    {
        "key": "hero.trust_line",
        "label": "Hero trust line",
        "group": "hero",
        "type": SettingType.TEXT,
        "value": "Every NGO is KYC-verified · Every event has a public audit page",
        "sort_order": 8,
    },
    {
        "key": "hero.image_url",
        "label": "Hero background image URL",
        "group": "hero",
        "type": SettingType.IMAGE,
        "value": "https://images.unsplash.com/photo-1486218119243-13883505764c?w=3000&q=92",
        "description": "4K landscape — single runner heading toward mountains. Used as background, and as poster while a hero video loads.",
        "sort_order": 9,
    },
    {
        "key": "hero.video_url",
        "label": "Hero background video URL (optional)",
        "group": "hero",
        "type": SettingType.URL,
        "value": "",
        "description": (
            "Optional MP4/WEBM URL. When set, a muted looping video plays over "
            "the hero photo (image acts as the poster). Compress to <10MB for "
            "1080p — ffmpeg with crf=24 works well. Leave empty for image-only."
        ),
        "sort_order": 10,
    },
    # ===== HOW IT WORKS =====
    {
        "key": "howitworks.eyebrow",
        "label": "Section eyebrow",
        "group": "howitworks",
        "type": SettingType.TEXT,
        "value": "How it works",
        "sort_order": 1,
    },
    {
        "key": "howitworks.heading",
        "label": "Section heading",
        "group": "howitworks",
        "type": SettingType.LONGTEXT,
        "value": "Four steps. Zero opacity. Every rupee accounted for.",
        "sort_order": 2,
    },
    {
        "key": "howitworks.subtitle",
        "label": "Section subtitle",
        "group": "howitworks",
        "type": SettingType.LONGTEXT,
        "value": "Most giving platforms ask for trust. We make it earnable — with verification at the start, escrow in the middle, and a public audit page at the end.",
        "sort_order": 3,
    },
    # ===== CTA BANNER =====
    {
        "key": "cta.eyebrow",
        "label": "CTA banner eyebrow",
        "group": "cta",
        "type": SettingType.TEXT,
        "value": "Ready when you are",
        "sort_order": 1,
    },
    {
        "key": "cta.heading",
        "label": "CTA banner heading",
        "group": "cta",
        "type": SettingType.LONGTEXT,
        "value": "The next event you fund\ncould change a life this year.",
        "sort_order": 2,
    },
    {
        "key": "cta.subtitle",
        "label": "CTA banner subtitle",
        "group": "cta",
        "type": SettingType.LONGTEXT,
        "value": "Sign up as a runner. Host an event for your NGO. Sponsor a cause that matters. It takes ninety seconds to get started.",
        "sort_order": 3,
    },
    # ===== TRUST STRIP =====
    {
        "key": "truststrip.eyebrow",
        "label": "Trust strip eyebrow",
        "group": "truststrip",
        "type": SettingType.TEXT,
        "value": "Built on trust",
        "sort_order": 1,
    },
    {
        "key": "truststrip.heading",
        "label": "Trust strip heading",
        "group": "truststrip",
        "type": SettingType.LONGTEXT,
        "value": "Donors don't need faith.\nThey need proof.",
        "sort_order": 2,
    },
    {
        "key": "truststrip.subtitle",
        "label": "Trust strip subtitle",
        "group": "truststrip",
        "type": SettingType.LONGTEXT,
        "value": "Most platforms ask donors to trust them. We make trust earnable — at every stage, with every rupee.",
        "sort_order": 3,
    },
    # ===== TESTIMONIAL =====
    {
        "key": "testimonial.quote",
        "label": "Featured testimonial quote",
        "group": "testimonial",
        "type": SettingType.LONGTEXT,
        "value": "The only fundraising platform where I can show my donors exactly where their money went, before they ask.",
        "sort_order": 1,
    },
    {
        "key": "testimonial.author",
        "label": "Testimonial author name",
        "group": "testimonial",
        "type": SettingType.TEXT,
        "value": "Sneha M.",
        "sort_order": 2,
    },
    {
        "key": "testimonial.role",
        "label": "Testimonial author role",
        "group": "testimonial",
        "type": SettingType.TEXT,
        "value": "Asha Foundation",
        "sort_order": 3,
    },
    # ===== EVENTS PAGE =====
    {
        "key": "events.heading",
        "label": "Events page heading",
        "group": "events",
        "type": SettingType.TEXT,
        "value": "Browse events",
        "sort_order": 1,
    },
    {
        "key": "events.subtitle",
        "label": "Events page subtitle",
        "group": "events",
        "type": SettingType.LONGTEXT,
        "value": "Verified NGOs hosting cause-driven runs. Pick one that resonates.",
        "sort_order": 2,
    },
    # ===== CAUSES PAGE =====
    {
        "key": "causes.heading",
        "label": "Causes page heading",
        "group": "causes",
        "type": SettingType.TEXT,
        "value": "Causes",
        "sort_order": 1,
    },
    {
        "key": "causes.subtitle",
        "label": "Causes page subtitle",
        "group": "causes",
        "type": SettingType.LONGTEXT,
        "value": "Each cause is a long-term commitment. Multiple events. One mission.",
        "sort_order": 2,
    },
    # ===== MAP / DISCOVERY =====
    {
        "key": "map.heading",
        "label": "Map page heading",
        "group": "map",
        "type": SettingType.TEXT,
        "value": "Find events near you",
        "sort_order": 1,
    },
    {
        "key": "map.subtitle",
        "label": "Map page subtitle",
        "group": "map",
        "type": SettingType.LONGTEXT,
        "value": "Every dot is a verified NGO running a fundraiser. Pan, zoom, and tap to learn more.",
        "sort_order": 2,
    },
    # ===== TRANSPARENCY =====
    {
        "key": "transparency.heading",
        "label": "Transparency page heading",
        "group": "transparency",
        "type": SettingType.TEXT,
        "value": "Transparency, by design",
        "sort_order": 1,
    },
    {
        "key": "transparency.subtitle",
        "label": "Transparency page subtitle",
        "group": "transparency",
        "type": SettingType.LONGTEXT,
        "value": "We built RunForACause around a simple promise: every donor should be able to follow their money from card → cause → impact. Here's how.",
        "sort_order": 2,
    },
    # ===== ABOUT =====
    {
        "key": "about.heading",
        "label": "About page heading",
        "group": "about",
        "type": SettingType.TEXT,
        "value": "About RunForACause",
        "sort_order": 1,
    },
    {
        "key": "about.subtitle",
        "label": "About page subtitle",
        "group": "about",
        "type": SettingType.LONGTEXT,
        "value": "We're a platform that helps NGOs and communities raise funds through cause-based run events — with transparency baked in from the first kilometre to the final bank transfer.",
        "sort_order": 2,
    },
    {
        "key": "about.mission",
        "label": "About — mission paragraph",
        "group": "about",
        "type": SettingType.LONGTEXT,
        "value": "Indian giving is held back by trust gaps. Donors don't know where their money goes. We're building a different model: low platform fees, high transparency, and audit pages anyone can read.",
        "sort_order": 3,
    },
    # ===== FOOTER =====
    {
        "key": "footer.tagline",
        "label": "Footer tagline",
        "group": "footer",
        "type": SettingType.LONGTEXT,
        "value": "India's most transparent crowd-funding run platform. Verified NGOs, escrow-protected funds, and a public audit page for every event.",
        "sort_order": 1,
    },
    {
        "key": "footer.contact_email",
        "label": "Contact email",
        "group": "footer",
        "type": SettingType.TEXT,
        "value": "hello@runforacause.in",
        "sort_order": 2,
    },
    {
        "key": "footer.contact_phone",
        "label": "Contact phone",
        "group": "footer",
        "type": SettingType.TEXT,
        "value": "+91 80 4956 1234",
        "sort_order": 3,
    },
    {
        "key": "footer.contact_city",
        "label": "Contact city / location",
        "group": "footer",
        "type": SettingType.TEXT,
        "value": "Bengaluru, India",
        "sort_order": 4,
    },
    {
        "key": "footer.newsletter_text",
        "label": "Newsletter blurb",
        "group": "footer",
        "type": SettingType.LONGTEXT,
        "value": "Quarterly impact reports — no fundraising spam.",
        "sort_order": 5,
    },
    # ===== HOWITWORKS STEPS =====
    {
        "key": "howitworks.steps",
        "label": "How it works — 4 steps (JSON)",
        "group": "howitworks",
        "type": SettingType.JSON,
        "description": (
            "JSON array of 4 step objects. Each: icon (lucide name), title, body, metric, metricLabel."
        ),
        "value": (
            '[{"icon":"Calendar","title":"NGO opens an event",'
            '"body":"PAN, GST, and 80G are verified before the event ever goes live. Bank accounts are validated by penny-drop. Donors only see what\'s earned trust.",'
            '"metric":"100%","metricLabel":"of NGOs are KYC-verified"},'
            '{"icon":"Footprints","title":"Runner builds their page",'
            '"body":"Personal story, distance pledge, shareable URL. Every kilometre is logged with proof — Strava, Apple Health, or screenshot. Approval before it counts.",'
            '"metric":"1 km","metricLabel":"= one promise kept"},'
            '{"icon":"HandHeart","title":"Donors sponsor every km",'
            '"body":"Pay per km up to a cap, or give a fixed amount. Money sits in escrow — not in the NGO\'s account — until distance is verified and the event closes.",'
            '"metric":"₹0","metricLabel":"released without verification"},'
            '{"icon":"Eye","title":"The audit page tells all",'
            '"body":"Gross raised, platform fee, gateway fee, net payout, bank UTR, utilisation report. Public. Permanent. No login required.",'
            '"metric":"100%","metricLabel":"publicly traceable"}]'
        ),
        "sort_order": 10,
    },
    # ===== TRUSTSTRIP ITEMS =====
    {
        "key": "truststrip.items",
        "label": "Trust strip — 4 items (JSON)",
        "group": "truststrip",
        "type": SettingType.JSON,
        "description": "JSON array of 4 trust items. Each: icon, title, body.",
        "value": (
            '[{"icon":"ShieldCheck","title":"Verified NGOs only",'
            '"body":"PAN, GST, and 80G are checked before any organisation can collect a rupee."},'
            '{"icon":"Lock","title":"Escrow-protected funds",'
            '"body":"Donations sit in platform escrow until distance is verified and the event closes."},'
            '{"icon":"FileSpreadsheet","title":"Public audit page",'
            '"body":"Gross raised, fees, payout UTR, utilisation report — visible to anyone, no login."},'
            '{"icon":"BadgeCheck","title":"80G receipts",'
            '"body":"Auto-generated and emailed for every eligible donation. Nothing manual."}]'
        ),
        "sort_order": 5,
    },
    # ===== CTA BANNER VALUE PROPS =====
    {
        "key": "cta.value_props",
        "label": "CTA banner — bullet value props (JSON)",
        "group": "cta",
        "type": SettingType.JSON,
        "description": "JSON array of 3 strings.",
        "value": (
            '["Free to start — no platform fees on your first event",'
            '"80G receipts auto-issued for eligible donations",'
            '"Public audit page for every rupee, every event"]'
        ),
        "sort_order": 6,
    },
    # ===== ACHIEVEMENT RULES =====
    {
        "key": "achievement.rules",
        "label": "Achievement rules (title + description per type, JSON)",
        "group": "achievements",
        "type": SettingType.JSON,
        "is_public": False,
        "description": (
            "JSON object keyed by AchievementType.value. Each entry: title, description, icon. Empty {} uses code defaults."
        ),
        "value": "{}",
        "sort_order": 1,
    },
    # ===== BRAND LOGOS =====
    {
        "key": "brand.logo_url",
        "label": "Brand logo URL (replaces inline SVG when set)",
        "group": "brand",
        "type": SettingType.IMAGE,
        "description": "Upload a logo image. PNG with transparent background recommended. Empty = use built-in SVG.",
        "value": "",
        "sort_order": 1,
    },
    {
        "key": "brand.summit_logo_url",
        "label": "Summit Solutions logo URL (footer credit)",
        "group": "brand",
        "type": SettingType.IMAGE,
        "value": "",
        "sort_order": 2,
    },
    # ===== SOCIAL =====
    {
        "key": "social.twitter_url",
        "label": "Twitter / X profile URL",
        "group": "social",
        "type": SettingType.URL,
        "value": "https://twitter.com/runforacause",
        "sort_order": 1,
    },
    {
        "key": "social.instagram_url",
        "label": "Instagram profile URL",
        "group": "social",
        "type": SettingType.URL,
        "value": "https://instagram.com/runforacause",
        "sort_order": 2,
    },
    {
        "key": "social.linkedin_url",
        "label": "LinkedIn company URL",
        "group": "social",
        "type": SettingType.URL,
        "value": "https://linkedin.com/company/runforacause",
        "sort_order": 3,
    },
    {
        "key": "social.youtube_url",
        "label": "YouTube channel URL",
        "group": "social",
        "type": SettingType.URL,
        "value": "https://youtube.com/@runforacause",
        "sort_order": 4,
    },
    # ===== LEGAL: Privacy Policy =====
    {
        "key": "legal.privacy_body",
        "label": "Privacy policy body (markdown-ish, blank lines = paragraph breaks)",
        "group": "legal",
        "type": SettingType.LONGTEXT,
        "description": "Plain-text body. Blank lines split paragraphs. Lines starting with '## ' become H2 headings.",
        "value": (
            "## Who we are\n"
            "RunForACause is operated by Summit Solutions Pvt. Ltd. (\"we\"). When you sign up, donate, or run with us, you trust us with personal data — this page explains what we collect, why, and what you can do about it.\n"
            "\n"
            "## What we collect\n"
            "Account: name, email, phone, password (hashed), avatar.\n"
            "Donations: name, email, PAN (for 80G receipts), payment ID. We never store your card.\n"
            "Runners: profile photo, cover photo, gallery, story, distance logs with proof URLs.\n"
            "Usage: only with consent. Essential cookies always; analytics and marketing only if you opt in.\n"
            "\n"
            "## Why we collect it\n"
            "To run your fundraising page, issue 80G receipts, settle payouts to NGOs, prevent fraud, and meet legal/tax obligations.\n"
            "\n"
            "## Your rights under DPDP Act 2023\n"
            "Access, correction, erasure, portability, withdrawal of consent, grievance redressal. From the My Account page you can download every record we hold about you (data portability) or delete your account (right to erasure). Financial records are retained for tax/audit reasons but de-identified after deletion.\n"
            "\n"
            "## Data Protection Officer\n"
            "Each NGO hosting an event names its own DPO, displayed on their organisation page. For platform-level concerns, write to dpo@runforacause.in.\n"
            "\n"
            "## Sharing\n"
            "We share with: Razorpay (to process payments), Resend (to send transactional email), and the NGO you donate to (so they can issue receipts and updates). Never with marketing brokers.\n"
            "\n"
            "## Retention\n"
            "Account data: until you delete it (with a 30-day grace).\n"
            "Donations and receipts: 7 years (Income Tax Act).\n"
            "Audit logs: 7 years.\n"
            "\n"
            "## Contact\n"
            "Questions or grievances: dpo@runforacause.in"
        ),
        "sort_order": 1,
    },
    {
        "key": "legal.privacy_updated_at",
        "label": "Privacy policy last-updated date (display only)",
        "group": "legal",
        "type": SettingType.TEXT,
        "value": "2026-05-07",
        "sort_order": 2,
    },
    # ===== LEGAL: Terms of Use =====
    {
        "key": "legal.terms_body",
        "label": "Terms of use body",
        "group": "legal",
        "type": SettingType.LONGTEXT,
        "description": "Plain-text body. Blank lines split paragraphs. Lines starting with '## ' become H2 headings.",
        "value": (
            "## Agreement\n"
            "By using RunForACause you agree to these terms. If you don't, please don't use the site.\n"
            "\n"
            "## Accounts\n"
            "You're responsible for keeping your password safe. One human, one account. NGOs sign up as event managers and must complete KYC before going live.\n"
            "\n"
            "## Donations\n"
            "All donations are routed via Razorpay and held in escrow until the event closes and runner distance is verified. Refunds follow Razorpay's policy. 80G receipts are issued only when the recipient NGO has valid 80G registration.\n"
            "\n"
            "## Running and proof\n"
            "Runners commit to a distance goal. Every kilometre logged needs proof (Strava, Apple Health, or photo). Manager approval is required before donations match the kilometre.\n"
            "\n"
            "## Acceptable use\n"
            "Don't use the platform to defraud donors, impersonate NGOs, or post unlawful content. We can suspend any account that does, with no refund of platform fees.\n"
            "\n"
            "## Liability\n"
            "We do our best, but we provide the service 'as is'. We are not liable for losses from delays, system errors, or third-party failures (payment gateways, banking systems).\n"
            "\n"
            "## Changes\n"
            "We may update these terms; the last-updated date below is authoritative. Continued use after changes = acceptance.\n"
            "\n"
            "## Jurisdiction\n"
            "Indian law applies. Disputes go to Bengaluru courts."
        ),
        "sort_order": 3,
    },
    {
        "key": "legal.terms_updated_at",
        "label": "Terms of use last-updated date",
        "group": "legal",
        "type": SettingType.TEXT,
        "value": "2026-05-07",
        "sort_order": 4,
    },
]


async def upsert_defaults(db: AsyncSession) -> int:
    inserted = 0
    for d in DEFAULTS:
        result = await db.execute(
            select(SiteSetting).where(SiteSetting.key == d["key"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            continue
        db.add(
            SiteSetting(
                key=d["key"],
                value=d.get("value", ""),
                value_type=d.get("type", SettingType.TEXT),
                label=d["label"],
                group=d.get("group", "general"),
                description=d.get("description"),
                is_public=d.get("is_public", True),
                sort_order=d.get("sort_order", 0),
            )
        )
        inserted += 1
    await db.commit()
    return inserted


async def main() -> None:
    async with AsyncSessionLocal() as db:
        n = await upsert_defaults(db)
        print(f"✅ Site settings: {n} new keys inserted ({len(DEFAULTS)} total).")


if __name__ == "__main__":
    asyncio.run(main())
