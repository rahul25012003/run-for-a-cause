"""Analytics dashboard schemas."""
from decimal import Decimal

from pydantic import BaseModel


class StatCard(BaseModel):
    label: str
    value: str
    change_pct: float | None = None
    direction: str | None = None  # "up" | "down" | "flat"


class DailyDonation(BaseModel):
    day: str
    raised: Decimal
    count: int


class CategoryCount(BaseModel):
    name: str
    value: int  # number of events in this category


class PlatformStats(BaseModel):
    total_raised: Decimal
    total_distance_km: Decimal
    total_runners: int
    total_donors: int
    total_events: int
    active_events: int
    total_organisations: int
    pending_kyc: int
    pending_event_approvals: int
    # Real month-over-month so the dashboard can compute a trend honestly.
    raised_this_month: Decimal
    raised_last_month: Decimal
    raised_change_pct: float  # signed; can be negative or zero
    # 30-day daily series (oldest -> newest), zero-filled for days with no donations.
    daily_donations: list[DailyDonation]
    # Per-cause-category event count (events in any non-cancelled status).
    category_breakdown: list[CategoryCount] = []


class EventStats(BaseModel):
    event_id: str
    total_raised: Decimal
    fundraising_goal: Decimal
    progress_pct: float
    total_distance_km: Decimal
    distance_goal_km: Decimal | None
    total_runners: int
    total_donors: int
    days_remaining: int
    pending_distance_approvals: int


class RunnerStats(BaseModel):
    runner_id: str
    distance_completed_km: Decimal
    personal_goal_km: Decimal | None
    distance_progress_pct: float
    amount_raised: Decimal
    personal_goal_amount: Decimal | None
    fundraising_progress_pct: float
    donor_count: int
