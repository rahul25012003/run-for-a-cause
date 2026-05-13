"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Footprints, Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AuthResponse, UserRole } from "@/types";

export default function RegisterPage(): React.ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (params.get("role") as UserRole | null) ?? "runner";

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<AuthResponse>("/auth/register", {
        full_name: fullName,
        email,
        phone: phone || undefined,
        password,
        role,
      });
      toast.success("Account created. Welcome aboard!");
      const dest =
        res.user.role === "super_admin" ? "/admin"
        : res.user.role === "event_manager" ? "/manager"
        : res.user.role === "runner" ? "/runner"
        : "/account";
      router.push(dest);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail ?? err.message : "Sign-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <span className="eyebrow">Create your account</span>
      <h1 className="mt-3 font-display text-display-md text-ink-900">
        Start running for something that matters.
      </h1>
      <p className="mt-3 text-ink-500">Ninety seconds. No card required.</p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <RoleChoice
          active={role === "runner"}
          onClick={() => setRole("runner")}
          Icon={Footprints}
          label="Runner"
          description="Raise funds with each km"
        />
        <RoleChoice
          active={role === "event_manager"}
          onClick={() => setRole("event_manager")}
          Icon={Building2}
          label="Event manager"
          description="Host events for your NGO"
        />
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input label="Full name" value={fullName} onChange={setFullName} required />
        <Input label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
        <Input label="Phone" value={phone} onChange={setPhone} placeholder="+91 9000000000" />
        <Input label="Password" type="password" value={password} onChange={setPassword} minLength={8} required help="At least 8 characters" />
        <button type="submit" className="btn-primary w-full py-3.5" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-xs text-ink-400 text-center leading-relaxed">
          By signing up you agree to our Terms and Privacy Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already a member?{" "}
        <Link href="/login" className="text-primary-600 font-semibold hover:underline underline-offset-4">Sign in</Link>
      </p>
    </div>
  );
}

function RoleChoice({
  active,
  onClick,
  Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl text-left transition-all duration-200 border",
        active ? "border-primary-500 bg-primary-50 shadow-soft" : "border-ink-100 bg-white hover:border-ink-200",
      )}
    >
      <Icon className={cn("w-5 h-5 mb-2", active ? "text-primary-600" : "text-ink-400")} />
      <p className="font-semibold text-ink-900">{label}</p>
      <p className="text-xs text-ink-500 mt-0.5">{description}</p>
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  minLength,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  help?: string;
}): React.ReactNode {
  return (
    <label className="block">
      <span className="label">{label} {required && <span className="text-danger-500">*</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="input"
      />
      {help && <p className="mt-1.5 text-xs text-ink-400">{help}</p>}
    </label>
  );
}
