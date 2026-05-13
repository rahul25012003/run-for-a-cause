import { cookies } from "next/headers";
import Link from "next/link";
import {
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronRight,
  Building2,
  FileEdit,
  Rocket,
} from "lucide-react";

interface OrgStatus {
  id: string;
  name: string;
  kyc_status: "pending" | "submitted" | "under_review" | "verified" | "rejected";
  kyc_rejection_reason: string | null;
  pan_number: string | null;
  bank_account_no: string | null;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchOrg(): Promise<OrgStatus | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${apiUrl}/organisations/me`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as OrgStatus;
  } catch {
    return null;
  }
}

async function fetchEventCount(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return 0;
  try {
    const res = await fetch(`${apiUrl}/events/?mine=true&limit=1`, {
      headers: { Cookie: `access_token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export default async function ManagerOverviewPage(): Promise<React.ReactNode> {
  const [org, eventCount] = await Promise.all([fetchOrg(), fetchEventCount()]);

  const kycVerified = org?.kyc_status === "verified";
  const kycSubmitted =
    org?.kyc_status === "submitted" || org?.kyc_status === "under_review";
  const kycRejected = org?.kyc_status === "rejected";
  const kycFilled = !!(org?.pan_number && org?.bank_account_no);

  // Steps: 1=Org created, 2=KYC filled, 3=KYC verified, 4=Event created
  const step1 = !!org;
  const step2 = step1 && (kycFilled || kycSubmitted || kycVerified);
  const step3 = kycVerified;
  const step4 = step3 && eventCount > 0;
  const allDone = step4;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="mt-3 font-display font-medium text-display-md text-ink-900">
            Welcome{org ? `, ${org.name}` : " back"}
          </h1>
          <p className="mt-2 text-ink-500">
            {kycVerified
              ? "Your KYC is verified. Manage your events below."
              : "Complete these steps to start hosting fundraising events."}
          </p>
        </div>
        {kycVerified && (
          <Link href="/manager/events/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" /> New event
          </Link>
        )}
      </div>

      {/* ── Onboarding checklist ── */}
      {!allDone && (
        <div className="card p-6 md:p-8 space-y-1">
          <h2 className="font-display text-xl text-ink-900 mb-5">
            Get your NGO ready to fundraise
          </h2>

          <Step
            n={1}
            done={step1}
            active={!step1}
            label="Create your organisation profile"
            description="Add your NGO's name, logo, and description — donors will see this on every event page."
            action={
              !step1 ? (
                <Link href="/manager/organisation" className="btn-primary btn-sm inline-flex">
                  <Building2 className="w-3.5 h-3.5" /> Set up organisation
                </Link>
              ) : null
            }
          />

          <Step
            n={2}
            done={step2}
            active={step1 && !step2}
            label="Fill in KYC & banking details"
            description="PAN number, GSTIN, 80G registration, and bank account where payouts will land. Verified by our team before funds are released."
            action={
              step1 && !step2 ? (
                <Link href="/manager/organisation" className="btn-primary btn-sm inline-flex">
                  <FileEdit className="w-3.5 h-3.5" /> Add KYC details
                </Link>
              ) : null
            }
          />

          <Step
            n={3}
            done={step3}
            active={step2 && !step3}
            pending={kycSubmitted}
            rejected={kycRejected}
            rejectionReason={org?.kyc_rejection_reason ?? undefined}
            label="Get KYC approved by RunForACause"
            description={
              kycSubmitted
                ? "Your details are under review. We'll notify you when verified — usually within 1 business day."
                : kycRejected
                  ? "Your KYC was rejected. Please fix the issues and resubmit."
                  : "After you fill in KYC details and click \"Submit for review\", our team verifies your PAN, GSTIN, and bank account."
            }
            action={
              kycRejected ? (
                <Link href="/manager/organisation" className="btn-primary btn-sm inline-flex">
                  <FileEdit className="w-3.5 h-3.5" /> Fix &amp; resubmit
                </Link>
              ) : kycSubmitted ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                  <Clock className="w-3 h-3" /> Under review
                </span>
              ) : null
            }
          />

          <Step
            n={4}
            done={step4}
            active={step3 && !step4}
            label="Create your first event"
            description="Set a fundraising goal, distance target, and dates. Submit for super-admin approval — then it goes live."
            action={
              step3 && !step4 ? (
                <Link href="/manager/events/new" className="btn-primary btn-sm inline-flex">
                  <Rocket className="w-3.5 h-3.5" /> Create first event
                </Link>
              ) : null
            }
          />
        </div>
      )}

      {/* ── Verified + has events ── */}
      {allDone && (
        <div className="card p-6 bg-secondary-50 border-secondary-200 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-secondary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink-900">You&apos;re all set</p>
            <p className="text-sm text-ink-600 mt-1">
              KYC verified · Events live · Fundraising active.{" "}
              <Link href="/manager/events" className="text-primary-600 underline underline-offset-4">
                View your events →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Quick links (always shown after org created) ── */}
      {org && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickLink href="/manager/events" label="My events" sub="See all your fundraising events" icon={<Rocket className="w-5 h-5 text-primary-600" />} />
          <QuickLink href="/manager/organisation" label="Organisation profile" sub="Update details, KYC & banking" icon={<Building2 className="w-5 h-5 text-secondary-600" />} />
          {kycVerified && (
            <QuickLink href="/manager/events/new" label="Create new event" sub="Start a new fundraising run" icon={<PlusCircle className="w-5 h-5 text-primary-600" />} />
          )}
        </div>
      )}
    </div>
  );
}

function Step({
  n, done, active, pending, rejected, rejectionReason, label, description, action,
}: {
  n: number;
  done: boolean;
  active?: boolean;
  pending?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
  label: string;
  description: string;
  action?: React.ReactNode;
}): React.ReactNode {
  return (
    <div className={`flex gap-4 rounded-xl p-4 transition-colors ${
      active ? "bg-primary-50 border border-primary-200"
      : rejected ? "bg-red-50 border border-red-200"
      : done ? "bg-secondary-50/50"
      : "opacity-50"
    }`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        done ? "bg-secondary-500 text-white"
        : rejected ? "bg-red-500 text-white"
        : active || pending ? "bg-primary-500 text-white"
        : "bg-ink-200 text-ink-500"
      }`}>
        {done ? <CheckCircle2 className="w-5 h-5" />
         : rejected ? <XCircle className="w-4 h-4" />
         : pending ? <Clock className="w-4 h-4" />
         : n}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${done ? "text-secondary-700" : rejected ? "text-red-700" : "text-ink-900"}`}>
          {label}
        </p>
        <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{description}</p>
        {rejected && rejectionReason && (
          <p className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg p-2 font-medium">
            Reason: {rejectionReason}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      {done && !active && (
        <CheckCircle2 className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

function QuickLink({ href, label, sub, icon }: {
  href: string; label: string; sub: string; icon: React.ReactNode;
}): React.ReactNode {
  return (
    <Link href={href} className="card-hover p-5 flex items-start gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-canvas-subtle flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink-900 text-sm group-hover:text-primary-700 transition-colors">{label}</p>
        <p className="text-xs text-ink-500 mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-600 transition-colors flex-shrink-0 mt-0.5" />
    </Link>
  );
}
