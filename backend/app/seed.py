"""Seed development data: 1 admin, 2 NGOs, 3 events, 8 runners, 20 donations."""
from __future__ import annotations

import asyncio
import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.cause import Cause
from app.models.distance_log import DistanceLog, DistanceProofSource, DistanceStatus
from app.models.donation import Donation, DonationStatus, DonationType
from app.models.event import (
    CauseCategory,
    Event,
    EventFormat,
    EventStatus,
    ParticipationType,
    RunType,
)
from app.models.event_runner import EventRunner, RunnerStatus
from app.models.organisation import KycStatus, Organisation
from app.models.user import User, UserRole
from app.utils.security import hash_password
from app.utils.slugs import make_slug


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "admin@runforacause.in"))
        if existing.scalar_one_or_none():
            print("Database already seeded, skipping.")
            return

        now = datetime.now(UTC)
        today = now.date()

        admin = User(
            email="admin@runforacause.in",
            hashed_password=hash_password("Admin@1234"),
            full_name="Platform Admin",
            phone="+919999999999",
            role=UserRole.SUPER_ADMIN,
            is_verified=True,
        )

        ngo1_user = User(
            email="contact@ashafoundation.in",
            hashed_password=hash_password("Manager@1234"),
            full_name="Asha Foundation Admin",
            phone="+919811111111",
            role=UserRole.EVENT_MANAGER,
            is_verified=True,
        )
        ngo2_user = User(
            email="contact@greenearth.in",
            hashed_password=hash_password("Manager@1234"),
            full_name="Green Earth Admin",
            phone="+919822222222",
            role=UserRole.EVENT_MANAGER,
            is_verified=True,
        )

        runner_users: list[User] = []
        runner_seed = [
            ("ravi.kumar@example.com", "Ravi Kumar"),
            ("priya.shah@example.com", "Priya Shah"),
            ("aman.verma@example.com", "Aman Verma"),
            ("sneha.iyer@example.com", "Sneha Iyer"),
            ("kabir.singh@example.com", "Kabir Singh"),
            ("nisha.menon@example.com", "Nisha Menon"),
            ("arjun.rao@example.com", "Arjun Rao"),
            ("meera.gupta@example.com", "Meera Gupta"),
        ]
        for email, name in runner_seed:
            runner_users.append(
                User(
                    email=email,
                    hashed_password=hash_password("Runner@1234"),
                    full_name=name,
                    phone=f"+9198{random.randint(10000000, 99999999)}",
                    role=UserRole.RUNNER,
                    is_verified=True,
                )
            )

        db.add_all([admin, ngo1_user, ngo2_user, *runner_users])
        await db.flush()

        org1 = Organisation(
            user_id=ngo1_user.id,
            name="Asha Foundation",
            slug=make_slug("Asha Foundation"),
            description="Educating underprivileged girls across Bangalore.",
            logo_url=None,
            website="https://asha.example.in",
            pan_number="AAATA1234B",
            gstin="29AAATA1234B1Z5",
            reg_80g_number="AAATA1234B/80G/2023",
            is_80g_eligible=True,
            bank_account_no="1234567890",
            bank_ifsc="SBIN0001234",
            bank_name="State Bank of India",
            bank_account_holder="Asha Foundation",
            kyc_status=KycStatus.VERIFIED,
            kyc_verified_at=now,
            kyc_verified_by=admin.id,
        )
        org2 = Organisation(
            user_id=ngo2_user.id,
            name="Green Earth Trust",
            slug=make_slug("Green Earth Trust"),
            description="Reforestation and watershed projects in the Western Ghats.",
            logo_url=None,
            website="https://greenearth.example.in",
            pan_number="AABCG5678D",
            gstin="29AABCG5678D1Z2",
            reg_80g_number="AABCG5678D/80G/2024",
            is_80g_eligible=True,
            bank_account_no="9876543210",
            bank_ifsc="HDFC0009876",
            bank_name="HDFC Bank",
            bank_account_holder="Green Earth Trust",
            kyc_status=KycStatus.VERIFIED,
            kyc_verified_at=now,
            kyc_verified_by=admin.id,
        )
        db.add_all([org1, org2])
        await db.flush()

        cause1 = Cause(
            organisation_id=org1.id,
            title="Education for Underprivileged Girls",
            slug=make_slug("Education for Underprivileged Girls"),
            summary="Funding tuition, books, and uniforms for 200+ girls in Karnataka.",
            story="Since 2018, Asha Foundation has supported the education of girls from low-income families across rural Karnataka.",
        )
        cause2 = Cause(
            organisation_id=org2.id,
            title="Reforestation in the Western Ghats",
            slug=make_slug("Reforestation Western Ghats"),
            summary="Planting and protecting native species across degraded forest patches.",
            story="A long-running effort to restore native forest cover and revive watersheds in the Western Ghats.",
        )
        db.add_all([cause1, cause2])
        await db.flush()

        event_live = Event(
            organisation_id=org1.id,
            cause_id=cause1.id,
            title="Run for Education 2026",
            slug=make_slug("Run for Education 2026"),
            description=(
                "A 30-day virtual run to raise ₹10 lakh for the education of 100 girls. "
                "Every kilometre our runners log unlocks real funding for tuition, books, and uniforms."
            ),
            cause_summary="Educate 100 girls in rural Karnataka through a 30-day virtual run.",
            cause_category=CauseCategory.EDUCATION,
            cover_image_url="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600",
            format=EventFormat.VIRTUAL,
            participation=ParticipationType.BOTH,
            run_type=RunType.CUMULATIVE,
            fundraising_goal=Decimal("1000000"),
            distance_goal_km=Decimal("100"),
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=20),
            registration_deadline=today + timedelta(days=10),
            status=EventStatus.LIVE,
            approved_by=admin.id,
            approved_at=now,
            is_featured=True,
        )
        event_upcoming = Event(
            organisation_id=org2.id,
            cause_id=cause2.id,
            title="Run for the Forest",
            slug=make_slug("Run for the Forest"),
            description=(
                "Join us for a 21-day virtual challenge to plant 5,000 native trees "
                "in the Western Ghats. Every km you run plants 1 tree."
            ),
            cause_summary="Plant 5,000 native trees through a 21-day virtual run.",
            cause_category=CauseCategory.ENVIRONMENT,
            cover_image_url="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600",
            format=EventFormat.VIRTUAL,
            run_type=RunType.CUMULATIVE,
            fundraising_goal=Decimal("500000"),
            distance_goal_km=Decimal("50"),
            start_date=today + timedelta(days=14),
            end_date=today + timedelta(days=35),
            registration_deadline=today + timedelta(days=12),
            status=EventStatus.APPROVED,
            approved_by=admin.id,
            approved_at=now,
            is_featured=True,
        )
        event_completed = Event(
            organisation_id=org1.id,
            cause_id=cause1.id,
            title="Mumbai Cause Marathon 2025",
            slug=make_slug("Mumbai Cause Marathon 2025"),
            description="Our flagship 2025 marathon raised over ₹8 lakh for 80 girls.",
            cause_summary="Completed: 50 runners + ₹8 lakh raised for 80 girls.",
            cause_category=CauseCategory.EDUCATION,
            cover_image_url="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1600",
            format=EventFormat.IN_PERSON,
            run_type=RunType.SINGLE_DAY,
            fundraising_goal=Decimal("750000"),
            distance_goal_km=Decimal("42.2"),
            start_date=today - timedelta(days=120),
            end_date=today - timedelta(days=119),
            status=EventStatus.COMPLETED,
            approved_by=admin.id,
            approved_at=now - timedelta(days=125),
            total_raised=Decimal("812000"),
            total_distance_km=Decimal("1840"),
            total_runners=50,
            total_donors=320,
            impact_report_url="https://example.com/impact/2025.pdf",
            impact_report_published_at=now - timedelta(days=30),
            utilisation_summary="₹8.1 lakh utilised across 80 girls' annual schooling fees.",
        )

        db.add_all([event_live, event_upcoming, event_completed])
        await db.flush()

        ev_runners: list[EventRunner] = []
        stories = [
            "I've been running since college; this is my first event for a cause.",
            "Running 100km feels small compared to what these kids face daily.",
            "I want my daughter to see what showing up looks like.",
            "Goal: a marathon a month, every month, for one year.",
            "First time running for a cause. Excited and nervous.",
            "Every km I run is a sentence in a book a girl will read.",
            "Lost 30 kg last year. Time to give back.",
            "From couch to 100km — let's go.",
        ]
        for i, user in enumerate(runner_users):
            er = EventRunner(
                event_id=event_live.id if i < 6 else event_upcoming.id,
                user_id=user.id,
                public_slug=make_slug(f"{user.full_name}-{event_live.title if i < 6 else event_upcoming.title}"),
                personal_story=stories[i],
                personal_goal_km=Decimal(random.choice([50, 75, 100])),
                personal_goal_amount=Decimal(random.choice([15000, 25000, 50000])),
                profile_photo_url=f"https://i.pravatar.cc/300?u={user.email}",
                status=RunnerStatus.APPROVED if i < 7 else RunnerStatus.PENDING,
                approved_by=ngo1_user.id if i < 6 else ngo2_user.id,
                approved_at=now if i < 7 else None,
                distance_completed_km=Decimal(random.randint(0, 60)) if i < 6 else Decimal("0"),
                amount_raised=Decimal(random.randint(2000, 18000)) if i < 6 else Decimal("0"),
                donor_count=random.randint(3, 12) if i < 6 else 0,
            )
            ev_runners.append(er)
        db.add_all(ev_runners)
        await db.flush()

        for er in ev_runners[:6]:
            for _ in range(random.randint(2, 6)):
                d_km = Decimal(random.randint(3, 12))
                db.add(
                    DistanceLog(
                        event_runner_id=er.id,
                        distance_km=d_km,
                        activity_date=today - timedelta(days=random.randint(0, 9)),
                        proof_source=DistanceProofSource.STRAVA,
                        status=DistanceStatus.APPROVED,
                        reviewed_by=ngo1_user.id,
                        reviewed_at=now,
                    )
                )

        donor_names = [
            "Vikas Mehta", "Anita Pillai", "Rohit Sharma", "Lakshmi Nair",
            "Dev Patel", "Sara Ali", "Karan Bhat", "Tara Krishnan",
            "Anand Joshi", "Pooja Reddy",
        ]
        for i in range(20):
            er = ev_runners[i % 6]
            anon = i % 5 == 0
            is_per_km = i % 2 == 0
            estimated = Decimal(random.choice([1500, 2500, 5000, 7500, 10000]))
            db.add(
                Donation(
                    event_runner_id=er.id,
                    event_id=er.event_id,
                    donor_name="Anonymous Donor" if anon else donor_names[i % len(donor_names)],
                    donor_email=f"donor{i}@example.com",
                    is_anonymous=anon,
                    donation_type=DonationType.PER_KM if is_per_km else DonationType.FIXED,
                    amount_per_km=Decimal("50") if is_per_km else None,
                    fixed_amount=None if is_per_km else estimated,
                    max_cap_amount=estimated if is_per_km else None,
                    estimated_amount=estimated,
                    final_amount=estimated,
                    status=DonationStatus.CAPTURED,
                    platform_fee=(estimated * Decimal("0.03")).quantize(Decimal("0.01")),
                    net_to_cause=(estimated * Decimal("0.97")).quantize(Decimal("0.01")),
                    payment_captured_at=now - timedelta(days=random.randint(0, 8)),
                    is_80g_eligible=True,
                    razorpay_order_id=f"order_seed_{i:04d}",
                    razorpay_payment_id=f"pay_seed_{i:04d}",
                    message=random.choice([
                        "Go runner!", "Proud of you.", "Every km matters.",
                        "Keep going!", None, None,
                    ]),
                )
            )

        await db.commit()
        print("✅ Seed complete:")
        print("   admin: admin@runforacause.in / Admin@1234")
        print("   manager (Asha): contact@ashafoundation.in / Manager@1234")
        print("   manager (Green): contact@greenearth.in / Manager@1234")
        print("   runners: ravi.kumar@example.com … / Runner@1234")


if __name__ == "__main__":
    asyncio.run(seed())
