import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "₹0";
  return inrFormatter.format(value);
}

export function formatCompactInr(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "₹0";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
  return `₹${value}`;
}

export function formatDistance(km: number | string): string {
  const value = typeof km === "string" ? parseFloat(km) : km;
  if (Number.isNaN(value)) return "0 km";
  return `${value.toFixed(1)} km`;
}

export function progressPct(current: number | string, target: number | string): number {
  const c = typeof current === "string" ? parseFloat(current) : current;
  const t = typeof target === "string" ? parseFloat(target) : target;
  if (!t || t <= 0) return 0;
  return Math.min(100, Math.round((c / t) * 100));
}

export function daysBetween(date: string | Date, ref: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = d.getTime() - ref.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// dd-mm-yy IST — the canonical date format across RunForACause.
// NEVER reach for `toLocaleDateString()` or other Intl variants directly:
// the platform-wide rule is dd-mm-yy.
const IST_DATE_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});
const IST_TIME_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Format a date as dd-mm-yy in IST. Returns "—" on invalid input. */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  // en-GB returns dd/mm/yy; replace the slashes for the brand format
  return IST_DATE_PARTS.format(d).replace(/\//g, "-");
}

/** Format a date+time as "dd-mm-yy, h:mm AM/PM" in IST. */
export function formatDateTime(
  input: string | Date | null | undefined,
): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return `${IST_DATE_PARTS.format(d).replace(/\//g, "-")}, ${IST_TIME_PARTS.format(d)}`;
}
