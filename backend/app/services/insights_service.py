"""Donor insights — surfaces patterns from a manager's donation history.

Two backends:
1. Anthropic (when ANTHROPIC_API_KEY is set) — generates a 3-bullet summary
   in plain English about peak donation times, top runners, and trends.
2. Rule-based fallback (always available) — computes the same metrics
   deterministically. Ships out of the box with no API key.

The router calls `generate_insights(event_id, db)` and gets back a dict
with `summary` (str), `bullets` (list[str]), and `source` ("ai"|"rules").
"""
from __future__ import annotations

import os
import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.donation import Donation, DonationStatus
from app.models.event_runner import EventRunner


async def _gather_metrics(
    event_id: uuid.UUID, db: AsyncSession
) -> dict[str, Any]:
    """Compute the underlying metrics. Both backends start from this."""
    cutoff = datetime.now(UTC) - timedelta(days=30)
    res = await db.execute(
        select(Donation, EventRunner.public_slug)
        .join(EventRunner, Donation.event_runner_id == EventRunner.id)
        .where(
            Donation.event_id == event_id,
            Donation.status.in_(
                (DonationStatus.CAPTURED, DonationStatus.SETTLED)
            ),
            Donation.created_at >= cutoff,
        )
    )
    rows = res.all()

    if not rows:
        return {
            "donations_30d": 0,
            "total_30d": Decimal("0"),
            "avg_amount": Decimal("0"),
            "peak_hour": None,
            "top_runner_slug": None,
            "top_runner_count": 0,
            "anonymous_pct": 0,
        }

    hours: Counter[int] = Counter()
    runners: Counter[str] = Counter()
    total = Decimal("0")
    anonymous = 0
    for donation, runner_slug in rows:
        hours[donation.created_at.hour] += 1
        runners[runner_slug] += 1
        amt = donation.final_amount or donation.estimated_amount or Decimal("0")
        total += amt
        if donation.is_anonymous:
            anonymous += 1

    peak_hour, _ = hours.most_common(1)[0]
    top_runner_slug, top_runner_count = runners.most_common(1)[0]
    return {
        "donations_30d": len(rows),
        "total_30d": total,
        "avg_amount": (total / len(rows)).quantize(Decimal("0.01")),
        "peak_hour": peak_hour,
        "top_runner_slug": top_runner_slug,
        "top_runner_count": top_runner_count,
        "anonymous_pct": round(100 * anonymous / len(rows)),
    }


def _format_hour(h: int) -> str:
    if h == 0:
        return "midnight"
    if h == 12:
        return "noon"
    if h < 12:
        return f"{h} AM"
    return f"{h - 12} PM"


def _rule_based(metrics: dict[str, Any]) -> dict[str, Any]:
    n = metrics["donations_30d"]
    if n == 0:
        return {
            "summary": "No donations in the last 30 days yet.",
            "bullets": [
                "Share the event link on social channels to seed momentum.",
                "Reach out personally to your top 5 supporters first.",
                "Consider a launch-week match-funding partner.",
            ],
            "source": "rules",
            "metrics": metrics,
        }

    bullets = [
        f"{n} donations in the last 30 days, totalling "
        f"₹{metrics['total_30d']:,.0f} (avg ₹{metrics['avg_amount']:,.0f}).",
        f"Peak donation activity around {_format_hour(metrics['peak_hour'])} "
        "(IST) — schedule outreach 2 hours before for the best response.",
        f"Top fundraiser brought in {metrics['top_runner_count']} of those — "
        "ask them what messaging is resonating with their network.",
    ]
    if metrics["anonymous_pct"] >= 30:
        bullets.append(
            f"{metrics['anonymous_pct']}% chose anonymous — your donor wall "
            "should keep that opt-out prominent."
        )
    summary = (
        f"In the last 30 days you've raised ₹{metrics['total_30d']:,.0f} "
        f"from {n} donations."
    )
    return {
        "summary": summary,
        "bullets": bullets,
        "source": "rules",
        "metrics": metrics,
    }


async def _ai_summary(metrics: dict[str, Any]) -> dict[str, Any] | None:
    """Try Anthropic; on any failure return None so caller falls back."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        # Lazy import — anthropic is optional. If not installed, fall back.
        from anthropic import Anthropic  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        client = Anthropic(api_key=api_key)
        prompt = (
            "You are a fundraising analyst. Given these metrics for a "
            "30-day window on a charity run event, return a 1-sentence "
            "summary and 3 specific actionable bullets. Be concrete, "
            "warm, and Indian-context aware (mention IST timing, "
            "WhatsApp outreach where helpful). Metrics: "
            f"{metrics}"
        )
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text if msg.content else ""
        # Naive parse: first line summary, rest bullets
        lines = [line.strip("-• ").strip() for line in text.splitlines() if line.strip()]
        if not lines:
            return None
        return {
            "summary": lines[0],
            "bullets": lines[1:5],
            "source": "ai",
            "metrics": metrics,
        }
    except Exception:
        return None


async def generate_insights(
    event_id: uuid.UUID, db: AsyncSession
) -> dict[str, Any]:
    metrics = await _gather_metrics(event_id, db)
    ai = await _ai_summary(metrics)
    if ai is not None:
        return ai
    return _rule_based(metrics)


async def draft_impact_report(
    event_id: uuid.UUID, db: AsyncSession
) -> dict[str, Any]:
    """Generate a draft impact report body the manager can paste/edit.

    Same dual-backend pattern as `generate_insights`: Anthropic when
    `ANTHROPIC_API_KEY` is set, otherwise a templated fallback that
    pulls from the same metrics. Returns `{markdown, source}`.
    """
    metrics = await _gather_metrics(event_id, db)

    # Pull the event + org name + cause for headline context
    from app.models.event import Event

    res = await db.execute(select(Event).where(Event.id == event_id))
    event = res.scalar_one_or_none()
    title = event.title if event else "Our event"
    cause = event.cause_summary if event else "the cause"

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            from anthropic import Anthropic  # type: ignore[import-not-found]

            client = Anthropic(api_key=api_key)
            prompt = (
                f"Write a 4-paragraph impact report draft for the charity run event titled "
                f"\"{title}\". Cause: {cause}. Metrics: {metrics}. "
                "Use warm, factual, India-context tone. Section headers in markdown. "
                "Avoid superlatives without numbers. Don't invent figures."
            )
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1200,
                messages=[{"role": "user", "content": prompt}],
            )
            text = msg.content[0].text if msg.content else ""
            if text.strip():
                return {"markdown": text.strip(), "source": "ai"}
        except Exception:
            pass

    # Rule-based fallback — fills in the structure with metrics
    n = metrics["donations_30d"]
    total = metrics["total_30d"]
    md = f"""## Impact at a glance

In the last 30 days, supporters of **{title}** contributed **₹{total:,.0f}** across {n} donation{'' if n == 1 else 's'}, helping {cause.lower()}.

## What this enables

Every rupee raised goes to the cause after a 3% platform fee. Funds are tracked publicly — gross, fees, net, and final UTR — so donors can audit exactly how their gift moves.

## Who showed up

The community of donors and runners came together with an average gift of ₹{metrics['avg_amount']:,.0f}. Peak donation activity was around {_format_hour(metrics.get('peak_hour') or 12)} (IST), suggesting outreach in the evening lands best.

## Thank you

To every runner, every donor, and every team that signal-boosted — thank you. The momentum continues. Edit this draft, add specific stories, and publish."""
    return {"markdown": md, "source": "rules"}
