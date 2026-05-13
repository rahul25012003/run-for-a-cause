"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, MapPin, Clock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/shared/PageHero";
import { Reveal } from "@/components/shared/Reveal";

interface Role {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  capacity: number;
  shift: string | null;
  location: string | null;
  confirmed_count: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface EventLite {
  id: string;
  title: string;
}

async function fetchEvent(slug: string): Promise<EventLite | null> {
  try {
    const res = await fetch(`${API_URL}/events/${slug}`);
    if (!res.ok) return null;
    return (await res.json()) as EventLite;
  } catch {
    return null;
  }
}

async function fetchRoles(eventId: string): Promise<Role[]> {
  try {
    const res = await fetch(`${API_URL}/events/${eventId}/volunteer-roles`);
    if (!res.ok) return [];
    return (await res.json()) as Role[];
  } catch {
    return [];
  }
}

export default function VolunteerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): React.ReactNode {
  const { slug } = use(params);
  const [event, setEvent] = useState<EventLite | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupRoleId, setSignupRoleId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const e = await fetchEvent(slug);
      if (!e) {
        setLoading(false);
        return;
      }
      setEvent(e);
      setRoles(await fetchRoles(e.id));
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="p-20 text-center text-ink-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-ink-500">Event not found.</p>
        <Link href="/events" className="btn-primary mt-4 inline-flex">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Volunteer"
        heading={`Help run ${event.title}`}
        subtitle="Donations matter. So does showing up. Pick a role below — water station, route marshal, registration desk — whatever suits you."
        variant="secondary"
        trailing={
          <Link
            href={`/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to event
          </Link>
        }
      />

      <section className="container-page py-16 md:py-20">
        {roles.length === 0 ? (
          <div className="card p-10 text-center">
            <Users className="w-7 h-7 text-ink-300 mx-auto mb-3" />
            <p className="text-ink-700 font-medium">
              No volunteer roles posted yet.
            </p>
            <p className="mt-2 text-sm text-ink-500">
              The host hasn&apos;t opened volunteer signups for this event.
              Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {roles.map((r, i) => {
              const remaining = Math.max(0, r.capacity - r.confirmed_count);
              const isFull = remaining === 0;
              const isOpen = signupRoleId === r.id;
              return (
                <Reveal key={r.id} delay={i * 0.04}>
                  <div className="card p-6 md:p-7 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl text-ink-900 leading-snug">
                        {r.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-md ${
                          isFull
                            ? "bg-ink-100 text-ink-500"
                            : "bg-secondary-100 text-secondary-700"
                        }`}
                      >
                        {isFull ? "Full" : `${remaining} of ${r.capacity} left`}
                      </span>
                    </div>
                    {r.description && (
                      <p className="mt-3 text-sm text-ink-600 leading-relaxed">
                        {r.description}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-500">
                      {r.shift && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {r.shift}
                        </span>
                      )}
                      {r.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {r.location}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto pt-5">
                      {isOpen ? (
                        <SignupForm
                          roleId={r.id}
                          onClose={() => setSignupRoleId(null)}
                          onSuccess={() => {
                            setSignupRoleId(null);
                            toast.success(
                              "Signed up — the host will confirm by email.",
                            );
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setSignupRoleId(r.id)}
                          disabled={isFull}
                          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isFull ? "Role full" : "Sign up"}
                        </button>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function SignupForm({
  roleId,
  onClose,
  onSuccess,
}: {
  roleId: string;
  onClose: () => void;
  onSuccess: () => void;
}): React.ReactNode {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/volunteer-roles/${roleId}/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        throw new Error(data.detail ?? `Signup failed (${res.status})`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-ink-100 pt-4">
      <input
        type="text"
        placeholder="Full name *"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="input"
        required
        maxLength={255}
      />
      <input
        type="email"
        placeholder="Email *"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="input"
        required
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="input"
        maxLength={20}
      />
      <textarea
        placeholder="Anything the host should know? (optional)"
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
        className="input"
        rows={2}
        maxLength={2000}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary flex-1">
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" /> Sign up
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
