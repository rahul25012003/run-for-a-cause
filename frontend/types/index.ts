/** Shared TypeScript types mirroring backend Pydantic schemas. */

export type UserRole = "super_admin" | "event_manager" | "runner" | "donor";

export type DigestFrequency = "instant" | "daily" | "weekly" | "none";

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  is_verified: boolean;
  digest_frequency: DigestFrequency;
  whatsapp_opted_in: boolean;
}

export interface AuthResponse {
  user: UserPublic;
  access_token: string;
  token_type: "bearer";
}

export type CauseCategory =
  | "health"
  | "education"
  | "environment"
  | "animal_welfare"
  | "disaster_relief"
  | "poverty"
  | "women_empowerment"
  | "other";

export type EventFormat = "virtual" | "in_person" | "hybrid";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "live"
  | "distance_lock"
  | "settling"
  | "settled"
  | "completed"
  | "cancelled"
  | "archived";

export type RunType = "cumulative" | "daily" | "single_day";

export type ParticipationType = "individual" | "team" | "both";

export interface OrganisationPublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  kyc_status: "pending" | "submitted" | "under_review" | "verified" | "rejected";
  is_80g_eligible: boolean;
  is_active: boolean;
  created_at: string;
}

export interface EventPublic {
  id: string;
  organisation_id: string;
  cause_id: string | null;
  title: string;
  slug: string;
  description: string;
  cause_summary: string;
  cause_category: CauseCategory;
  cover_image_url: string | null;
  gallery_urls: string[];
  format: EventFormat;
  participation: ParticipationType;
  run_type: RunType;
  fundraising_goal: string;
  distance_goal_km: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  status: EventStatus;
  is_featured: boolean;
  total_raised: string;
  total_distance_km: string;
  total_runners: number;
  total_donors: number;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
}

export interface EventMapPin {
  id: string;
  slug: string;
  title: string;
  cause_category: CauseCategory;
  city: string;
  latitude: string;
  longitude: string;
  total_raised: string;
  total_runners: number;
  cover_image_url: string | null;
}

export interface EventDetail extends EventPublic {
  organisation: OrganisationPublic;
  platform_fee_pct: string;
  impact_report_url: string | null;
  impact_report_published_at: string | null;
  utilisation_summary: string | null;
}

export type RunnerStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "withdrawn"
  | "rejected";

export interface RunnerProfilePublic {
  id: string;
  event_id: string;
  user_id: string;
  runner_number: string | null;
  public_slug: string;
  personal_story: string | null;
  personal_goal_km: string | null;
  personal_goal_amount: string | null;
  team_name: string | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  gallery_urls: string[] | null;
  status: RunnerStatus;
  distance_completed_km: string;
  amount_raised: string;
  donor_count: number;
  joined_at: string;
  team_id: string | null;
  consecutive_days: number;
  longest_streak: number;
  event_title: string;
  event_slug: string;
}

export interface RunnerCardPublic {
  id: string;
  public_slug: string;
  full_name: string;
  profile_photo_url: string | null;
  distance_completed_km: string;
  amount_raised: string;
  personal_goal_amount: string | null;
  status: RunnerStatus;
}

export type DonationType = "per_km" | "fixed";
export type DonationStatus =
  | "initiated"
  | "pledged"
  | "authorisation_pending"
  | "captured"
  | "settled"
  | "refunded"
  | "partially_refunded"
  | "failed"
  | "disputed";

export interface DonationPublic {
  id: string;
  donor_name: string;
  is_anonymous: boolean;
  donation_type: DonationType;
  amount_per_km: string | null;
  fixed_amount: string | null;
  estimated_amount: string;
  final_amount: string | null;
  status: DonationStatus;
  message: string | null;
  created_at: string;
}

export interface DonationCreatePayload {
  event_runner_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone?: string;
  is_anonymous?: boolean;
  donation_type: DonationType;
  amount_per_km?: number;
  fixed_amount?: number;
  max_cap_amount?: number;
  message?: string;
}

export interface DonationCreateResponse {
  donation: DonationPublic & {
    razorpay_order_id: string | null;
    event_runner_id: string;
    event_id: string;
  };
  razorpay_order: {
    id: string;
    amount: number;
    currency: string;
  };
  razorpay_key_id: string;
}

export interface DailyDonation {
  day: string;
  raised: string;
  count: number;
}

export interface CategoryCount {
  name: string;
  value: number;
}

export interface PlatformStats {
  total_raised: string;
  total_distance_km: string;
  total_runners: number;
  total_donors: number;
  total_events: number;
  active_events: number;
  total_organisations: number;
  pending_kyc: number;
  pending_event_approvals: number;
  raised_this_month: string;
  raised_last_month: string;
  raised_change_pct: number;
  daily_donations: DailyDonation[];
  category_breakdown: CategoryCount[];
}
