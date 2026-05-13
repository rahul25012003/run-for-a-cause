"""80G tax-receipt PDF generation using ReportLab."""
from __future__ import annotations

import os
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.config import settings


def _ensure_local_dir() -> Path:
    path = Path(settings.LOCAL_UPLOAD_DIR) / "receipts"
    path.mkdir(parents=True, exist_ok=True)
    return path


def generate_80g_receipt_pdf(
    *,
    receipt_number: str,
    donation_id: UUID,
    donor_name: str,
    donor_email: str,
    donor_pan: str | None,
    donor_address: str | None,
    amount_inr: Decimal,
    payment_method: str | None,
    payment_id: str | None,
    issued_at: datetime,
    organisation_name: str,
    organisation_address: str | None,
    organisation_pan: str | None,
    organisation_80g: str | None,
) -> Path:
    """Generate an 80G-compliant PDF receipt and save it to local storage.

    Returns the local filesystem path. Replace with S3 upload in production.
    """
    out_dir = _ensure_local_dir()
    file_path = out_dir / f"{receipt_number}.pdf"

    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title=f"80G Receipt {receipt_number}",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=colors.HexColor("#1A1612"),
    )
    body = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#3D352D"),
    )
    eyebrow = ParagraphStyle(
        "eyebrow",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=colors.HexColor("#ED6C0F"),
        spaceAfter=2,
    )

    story: list = []
    story.append(Paragraph("80G TAX EXEMPTION RECEIPT", eyebrow))
    story.append(Paragraph(organisation_name, h1))
    if organisation_address:
        story.append(Paragraph(organisation_address, body))
    org_meta = []
    if organisation_pan:
        org_meta.append(f"PAN: <b>{organisation_pan}</b>")
    if organisation_80g:
        org_meta.append(f"80G Reg. No: <b>{organisation_80g}</b>")
    if org_meta:
        story.append(Paragraph(" &nbsp;|&nbsp; ".join(org_meta), body))
    story.append(Spacer(1, 18))

    meta_table = Table(
        [
            ["Receipt number", receipt_number],
            ["Date issued", issued_at.strftime("%d %b %Y")],
            ["Donation ID", str(donation_id)],
            ["Payment ID", payment_id or "—"],
            ["Payment method", payment_method or "—"],
        ],
        colWidths=[40 * mm, 120 * mm],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#857F77")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1A1612")),
                ("FONT", (1, 0), (1, -1), "Helvetica-Bold", 9.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E8E2DA")),
            ],
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 18))

    story.append(Paragraph("DONOR DETAILS", eyebrow))
    donor_table_data = [
        ["Name", donor_name],
        ["Email", donor_email],
    ]
    if donor_pan:
        donor_table_data.append(["PAN", donor_pan])
    if donor_address:
        donor_table_data.append(["Address", donor_address])
    donor_table = Table(donor_table_data, colWidths=[40 * mm, 120 * mm])
    donor_table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#857F77")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1A1612")),
                ("FONT", (1, 0), (1, -1), "Helvetica-Bold", 9.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E8E2DA")),
            ],
        )
    )
    story.append(donor_table)
    story.append(Spacer(1, 18))

    story.append(Paragraph("AMOUNT RECEIVED", eyebrow))
    amount_str = f"₹ {amount_inr:,.2f}".replace(",", "_temp_").replace("_temp_", ",")
    amount_box = Table(
        [[f"<b><font size=20 color='#ED6C0F'>{amount_str}</font></b>"]],
        colWidths=[160 * mm],
    )
    amount_box.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#FFE4CB")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF5EC")),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    story.append(amount_box)
    story.append(Spacer(1, 18))

    legal_text = (
        "This receipt is issued for income-tax exemption under Section 80G "
        "of the Income Tax Act, 1961. Donations to "
        f"<b>{organisation_name}</b> are eligible for deduction subject to "
        "the limits and conditions specified in the Act. Please retain this "
        "document for your records."
    )
    story.append(Paragraph(legal_text, body))
    story.append(Spacer(1, 14))

    story.append(
        Paragraph(
            "<i>This is a system-generated receipt. No signature is required.</i>",
            ParagraphStyle(
                "legal",
                parent=body,
                fontSize=8,
                textColor=colors.HexColor("#857F77"),
            ),
        )
    )

    story.append(Spacer(1, 22))
    story.append(
        Paragraph(
            "Issued via RunForACause &nbsp;·&nbsp; runforacause.in",
            ParagraphStyle(
                "footer",
                parent=body,
                fontSize=8,
                textColor=colors.HexColor("#ABA39B"),
                alignment=1,
            ),
        )
    )

    doc.build(story)
    return file_path


def _draw_diamond(c: canvas.Canvas, cx: float, cy: float, size: float, color_hex: str) -> None:
    """Filled diamond ornament — used as corner accents and dividers."""
    c.setFillColor(colors.HexColor(color_hex))
    p = c.beginPath()
    p.moveTo(cx, cy + size)
    p.lineTo(cx + size, cy)
    p.lineTo(cx, cy - size)
    p.lineTo(cx - size, cy)
    p.close()
    c.drawPath(p, fill=1, stroke=0)


def _draw_seal(c: canvas.Canvas, cx: float, cy: float, year: int) -> None:
    """Official finisher medallion — concentric rings, star, FINISHER {year}."""
    # Outer thick orange ring
    c.setStrokeColor(colors.HexColor("#ED6C0F"))
    c.setLineWidth(2.4)
    c.circle(cx, cy, 30, stroke=1, fill=0)
    # Inner cream disc with thin dark border
    c.setFillColor(colors.HexColor("#FFE4CB"))
    c.setStrokeColor(colors.HexColor("#1A1612"))
    c.setLineWidth(0.4)
    c.circle(cx, cy, 25, stroke=1, fill=1)
    # Centred star
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(colors.HexColor("#ED6C0F"))
    c.drawCentredString(cx, cy + 1, "★")
    # FINISHER label below star
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.HexColor("#1A1612"))
    c.drawCentredString(cx, cy - 12, "FINISHER")
    c.drawCentredString(cx, cy - 19, str(year))
    # Tiny tick marks around the outer ring (12 ticks = clock face feel)
    import math
    c.setStrokeColor(colors.HexColor("#ED6C0F"))
    c.setLineWidth(0.6)
    for i in range(12):
        angle = (i / 12.0) * 2 * math.pi
        x1 = cx + 32 * math.cos(angle)
        y1 = cy + 32 * math.sin(angle)
        x2 = cx + 35 * math.cos(angle)
        y2 = cy + 35 * math.sin(angle)
        c.line(x1, y1, x2, y2)


def generate_certificate_pdf(
    *,
    certificate_number: str,
    runner_name: str,
    event_title: str,
    cause_summary: str,
    organisation_name: str,
    distance_km: Decimal,
    amount_raised: Decimal,
    issued_at: datetime,
) -> Path:
    """Generate a runner finisher certificate PDF.

    Editorial landscape A4 design — ornamental frame, calligraphic name,
    official medallion, three-stat row, verification footer. Inspired by
    World Marathon Majors (Boston / NYC / Tokyo / Berlin / London).

    Returns local filesystem path. In production this would upload to S3.
    """
    from reportlab.lib.pagesizes import landscape

    out_dir = Path(settings.LOCAL_UPLOAD_DIR) / "certificates"
    out_dir.mkdir(parents=True, exist_ok=True)
    file_path = out_dir / f"{certificate_number}.pdf"

    # Landscape A4 — 841.89 × 595.27 pt
    PW, PH = landscape(A4)

    c = canvas.Canvas(str(file_path), pagesize=landscape(A4))
    c.setTitle(f"Certificate of Completion — {runner_name}")
    c.setAuthor("RunForACause")
    c.setSubject(f"Finisher certificate for {event_title}")

    # Brand colours
    INK = colors.HexColor("#1A1612")
    INK_SOFT = colors.HexColor("#3D352D")
    MUTED = colors.HexColor("#857F77")
    ORANGE = colors.HexColor("#ED6C0F")
    CREAM = colors.HexColor("#FBF6EE")
    PEACH = colors.HexColor("#FFE4CB")
    LINE = colors.HexColor("#E8E2DA")

    # ---------------- BACKGROUND ----------------
    c.setFillColor(CREAM)
    c.rect(0, 0, PW, PH, fill=1, stroke=0)
    # Subtle warm wash at the bottom for editorial depth
    c.setFillColor(PEACH)
    c.setFillAlpha(0.22)
    c.rect(0, 0, PW, PH * 0.45, fill=1, stroke=0)
    c.setFillAlpha(1.0)

    # ---------------- ORNAMENTAL FRAME ----------------
    # Thick outer orange border
    c.setStrokeColor(ORANGE)
    c.setLineWidth(2.4)
    c.rect(18, 18, PW - 36, PH - 36, fill=0, stroke=1)
    # Thin inner dark border
    c.setStrokeColor(INK)
    c.setLineWidth(0.4)
    c.rect(28, 28, PW - 56, PH - 56, fill=0, stroke=1)
    # Corner diamonds
    for cx, cy in (
        (28, 28),
        (PW - 28, 28),
        (28, PH - 28),
        (PW - 28, PH - 28),
    ):
        _draw_diamond(c, cx, cy, 4.5, "#ED6C0F")

    # ---------------- TOP BRAND STRIP ----------------
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(INK)
    c.drawString(48, PH - 52, "R U N F O R A C A U S E")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawString(48, PH - 64, "Run. Give. Move.")

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(INK)
    c.drawRightString(PW - 48, PH - 52, f"EDITION  {issued_at.year}")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawRightString(PW - 48, PH - 64, f"No.  {certificate_number}")

    # Hairline under brand strip
    c.setStrokeColor(LINE)
    c.setLineWidth(0.3)
    c.line(48, PH - 73, PW - 48, PH - 73)

    # ---------------- EYEBROW ----------------
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(ORANGE)
    c.drawCentredString(
        PW / 2,
        PH - 100,
        "·   O F F I C I A L   F I N I S H E R   C E R T I F I C A T E   ·",
    )

    # ---------------- HERO TITLE ----------------
    c.setFont("Times-Bold", 38)
    c.setFillColor(INK)
    c.drawCentredString(PW / 2, PH - 145, "CERTIFICATE  OF  COMPLETION")

    # ---------------- ORNAMENT DIVIDER ----------------
    div_y = PH - 172
    c.setStrokeColor(ORANGE)
    c.setLineWidth(0.6)
    c.line(PW / 2 - 95, div_y, PW / 2 - 12, div_y)
    c.line(PW / 2 + 12, div_y, PW / 2 + 95, div_y)
    _draw_diamond(c, PW / 2, div_y, 3.5, "#ED6C0F")

    # ---------------- "THIS IS TO CERTIFY THAT" ----------------
    c.setFont("Times-Italic", 12)
    c.setFillColor(INK_SOFT)
    c.drawCentredString(PW / 2, PH - 200, "This is to certify that")

    # ---------------- BIG NAME (calligraphic serif italic) ----------------
    name = (runner_name or "").strip() or "—"
    # Auto-shrink if name is unusually long so it never overflows
    name_size = 38
    while c.stringWidth(name, "Times-BoldItalic", name_size) > PW - 220 and name_size > 24:
        name_size -= 2
    c.setFont("Times-BoldItalic", name_size)
    c.setFillColor(ORANGE)
    c.drawCentredString(PW / 2, PH - 250, name)
    # Underline beneath name
    name_w = c.stringWidth(name, "Times-BoldItalic", name_size)
    c.setStrokeColor(INK)
    c.setLineWidth(0.5)
    c.line(PW / 2 - name_w / 2 - 14, PH - 260, PW / 2 + name_w / 2 + 14, PH - 260)

    # ---------------- ACHIEVEMENT DESCRIPTION ----------------
    # Two-line elegant description, centred
    safe_event = (event_title or "").strip()
    safe_org = (organisation_name or "").strip()
    c.setFont("Times-Roman", 12.5)
    c.setFillColor(INK)
    c.drawCentredString(
        PW / 2,
        PH - 295,
        f"has successfully completed {distance_km} km in",
    )
    c.setFont("Times-Bold", 14)
    c.setFillColor(INK)
    # Truncate event title gracefully if needed
    title_max = PW - 260
    drawable_title = safe_event
    while c.stringWidth(drawable_title, "Times-Bold", 14) > title_max and len(drawable_title) > 5:
        drawable_title = drawable_title[:-1]
    if drawable_title != safe_event:
        drawable_title = drawable_title.rstrip() + "…"
    c.drawCentredString(PW / 2, PH - 318, drawable_title)
    c.setFont("Times-Italic", 11)
    c.setFillColor(INK_SOFT)
    c.drawCentredString(
        PW / 2,
        PH - 338,
        f"raising INR {int(amount_raised):,} for {safe_org}",
    )

    # ---------------- STATS ROW (3 columns with vertical dividers) ----------------
    stats_y_value = 130
    stats_y_label = stats_y_value - 18
    col_centers = (PW * 0.18, PW * 0.50, PW * 0.82)

    # Distance value
    c.setFont("Times-Bold", 24)
    c.setFillColor(INK)
    c.drawCentredString(col_centers[0], stats_y_value, f"{distance_km} km")
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(MUTED)
    c.drawCentredString(col_centers[0], stats_y_label, "DISTANCE COVERED")

    # Funds raised — INR prefix to avoid Type 1 font rupee glyph issues
    c.setFont("Times-Bold", 24)
    c.setFillColor(INK)
    c.drawCentredString(col_centers[1], stats_y_value, f"INR {int(amount_raised):,}")
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(MUTED)
    c.drawCentredString(col_centers[1], stats_y_label, "FUNDS RAISED FOR THE CAUSE")

    # Date of issue
    c.setFont("Times-Bold", 24)
    c.setFillColor(INK)
    c.drawCentredString(col_centers[2], stats_y_value, issued_at.strftime("%d %b %Y"))
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(MUTED)
    c.drawCentredString(col_centers[2], stats_y_label, "DATE OF ISSUE")

    # Vertical dividers between the three columns
    c.setStrokeColor(LINE)
    c.setLineWidth(0.4)
    for div_x in (PW * 0.34, PW * 0.66):
        c.line(div_x, stats_y_value - 24, div_x, stats_y_value + 22)

    # ---------------- SIGNATURE LINE (left) + MEDALLION (right) ----------------
    # Signature line — left side, above bottom rule
    sig_x_start, sig_x_end = 90, 270
    sig_y = 75
    c.setStrokeColor(INK)
    c.setLineWidth(0.5)
    c.line(sig_x_start, sig_y, sig_x_end, sig_y)
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(INK)
    c.drawString(sig_x_start, sig_y - 12, "EVENT  DIRECTOR")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    org_label = safe_org if len(safe_org) <= 38 else safe_org[:36] + "…"
    c.drawString(sig_x_start, sig_y - 22, org_label)

    # Medallion — right side
    _draw_seal(c, PW - 130, 80, issued_at.year)

    # ---------------- BOTTOM HAIRLINE + FOOTER ----------------
    c.setStrokeColor(LINE)
    c.setLineWidth(0.3)
    c.line(48, 45, PW - 48, 45)

    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    c.drawString(48, 33, "Issued via RUNFORACAUSE  ·  runforacause.in")
    c.drawRightString(
        PW - 48,
        33,
        f"Verify: runforacause.in/c/{certificate_number}",
    )

    c.showPage()
    c.save()
    return file_path


def generate_event_analytics_pdf(
    *,
    event_title: str,
    organisation_name: str,
    period_label: str,
    issued_at: datetime,
    totals: dict,
    top_runners: list[dict],
    top_donors: list[dict],
) -> bytes:
    """Manager analytics report — landscape A4. Returns the PDF bytes
    so the router can stream it as an attachment without writing to disk.

    `totals`        : {raised, donations, runners, distance_km, donors}
    `top_runners`   : [{name, slug, distance_km, amount}, ...] (up to 10)
    `top_donors`    : [{name, amount, count}, ...] (up to 10)
    """
    from reportlab.lib.pagesizes import landscape

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    W, H = landscape(A4)

    # Header band
    c.setFillColorRGB(0.93, 0.42, 0.06)  # #ED6C0F
    c.rect(0, H - 22 * mm, W, 22 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(15 * mm, H - 14 * mm, "Event analytics")
    c.setFont("Helvetica", 10)
    c.drawRightString(
        W - 15 * mm, H - 14 * mm, period_label
    )

    # Subhead
    c.setFillColor(colors.HexColor("#1A1612"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(15 * mm, H - 32 * mm, event_title)
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#5B5650"))
    c.drawString(15 * mm, H - 38 * mm, f"By {organisation_name}")
    c.drawString(
        15 * mm,
        H - 43 * mm,
        f"Generated {issued_at.strftime('%d %b %Y, %H:%M IST')}",
    )

    # Totals row — five large stat cards
    stats = [
        ("Total raised", f"INR {totals.get('raised', 0):,.0f}"),
        ("Donations", str(totals.get("donations", 0))),
        ("Donors", str(totals.get("donors", 0))),
        ("Runners", str(totals.get("runners", 0))),
        ("Distance", f"{totals.get('distance_km', 0):,.1f} km"),
    ]
    card_w = (W - 30 * mm - 4 * 5 * mm) / 5
    card_y = H - 75 * mm
    for i, (label, val) in enumerate(stats):
        x = 15 * mm + i * (card_w + 5 * mm)
        c.setFillColor(colors.HexColor("#FFE4CB"))
        c.roundRect(x, card_y, card_w, 22 * mm, 4 * mm, fill=True, stroke=False)
        c.setFillColor(colors.HexColor("#5B5650"))
        c.setFont("Helvetica", 8)
        c.drawString(x + 4 * mm, card_y + 16 * mm, label.upper())
        c.setFillColor(colors.HexColor("#1A1612"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 4 * mm, card_y + 5 * mm, val)

    # Two-column tables: top runners + top donors
    table_y = card_y - 12 * mm
    col_w = (W - 30 * mm - 10 * mm) / 2

    def _draw_table(x: float, title: str, rows: list[list[str]]):
        c.setFillColor(colors.HexColor("#1A1612"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, table_y, title)
        c.setFont("Helvetica", 9)
        y = table_y - 7 * mm
        c.setFillColor(colors.HexColor("#9C928B"))
        c.drawString(x, y, "#")
        c.drawString(x + 8 * mm, y, "Name")
        c.drawRightString(x + col_w - 4 * mm, y, "Amount")
        y -= 2 * mm
        c.setStrokeColor(colors.HexColor("#E8DFD0"))
        c.line(x, y, x + col_w, y)
        c.setFillColor(colors.HexColor("#1A1612"))
        for i, row in enumerate(rows[:10]):
            y -= 6 * mm
            c.drawString(x, y, str(i + 1))
            c.drawString(x + 8 * mm, y, row[0][:48])
            c.drawRightString(x + col_w - 4 * mm, y, row[1])

    runner_rows = [
        [r["name"], f"INR {float(r['amount']):,.0f}"] for r in top_runners
    ]
    donor_rows = [
        [d["name"], f"INR {float(d['amount']):,.0f}"] for d in top_donors
    ]
    _draw_table(15 * mm, "Top fundraising runners", runner_rows)
    _draw_table(15 * mm + col_w + 10 * mm, "Top donors", donor_rows)

    # Footer
    c.setFillColor(colors.HexColor("#9C928B"))
    c.setFont("Helvetica", 8)
    c.drawString(
        15 * mm,
        12 * mm,
        "Generated by RunForACause · This data is for the event manager. "
        "Donor PII shown only when consent is on file.",
    )

    c.showPage()
    c.save()
    return buf.getvalue()
