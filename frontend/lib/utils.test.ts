/**
 * Pure-function tests for `lib/utils.ts`. No DOM, no fetch — runs fast.
 */
import { describe, expect, it } from "vitest";
import {
  cn,
  formatCompactInr,
  formatCurrency,
  formatDistance,
  formatDate,
  formatDateTime,
  progressPct,
  daysBetween,
} from "./utils";

describe("cn (className merge)", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("dedupes Tailwind conflicts (twMerge)", () => {
    // p-4 should win over p-2 due to twMerge
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles falsy inputs cleanly", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("formatCurrency", () => {
  it("formats whole numbers with Indian grouping", () => {
    expect(formatCurrency(100000)).toContain("1,00,000");
    expect(formatCurrency(100000)).toMatch(/₹/);
  });

  it("accepts string input", () => {
    expect(formatCurrency("50000")).toContain("50,000");
  });

  it("returns ₹0 for NaN", () => {
    expect(formatCurrency("not-a-number")).toBe("₹0");
  });
});

describe("formatCompactInr", () => {
  it("uses K for thousands", () => {
    expect(formatCompactInr(50000)).toBe("₹50.0K");
  });

  it("uses L for lakhs", () => {
    expect(formatCompactInr(150000)).toBe("₹1.5 L");
  });

  it("uses Cr for crores", () => {
    expect(formatCompactInr(15000000)).toBe("₹1.5 Cr");
  });

  it("returns plain rupees under 1000", () => {
    expect(formatCompactInr(500)).toBe("₹500");
  });

  it("returns ₹0 for NaN", () => {
    expect(formatCompactInr("garbage")).toBe("₹0");
  });
});

describe("formatDistance", () => {
  it("formats with one decimal", () => {
    expect(formatDistance(12.345)).toBe("12.3 km");
  });

  it("accepts string input", () => {
    expect(formatDistance("8.5")).toBe("8.5 km");
  });

  it("returns 0 km on NaN", () => {
    expect(formatDistance("nope")).toBe("0 km");
  });
});

describe("progressPct", () => {
  it("calculates percentage rounded", () => {
    expect(progressPct(33, 100)).toBe(33);
    expect(progressPct(2, 3)).toBe(67); // 66.66 rounds up
  });

  it("caps at 100", () => {
    expect(progressPct(150, 100)).toBe(100);
  });

  it("returns 0 when target is 0 or missing", () => {
    expect(progressPct(50, 0)).toBe(0);
    expect(progressPct(50, "0")).toBe(0);
  });
});

describe("daysBetween", () => {
  it("computes days from ref date", () => {
    const ref = new Date("2026-05-01");
    const future = new Date("2026-05-15");
    expect(daysBetween(future, ref)).toBe(14);
  });

  it("returns negative for past dates", () => {
    const ref = new Date("2026-05-15");
    const past = new Date("2026-05-01");
    expect(daysBetween(past, ref)).toBe(-14);
  });
});

describe("formatDate (dd-mm-yy IST)", () => {
  it("formats a UTC ISO string as dd-mm-yy IST", () => {
    // 2026-05-08 00:00 UTC = 2026-05-08 05:30 IST → "08-05-26"
    expect(formatDate("2026-05-08T00:00:00Z")).toBe("08-05-26");
  });
  it("crosses the IST date line", () => {
    // 2026-05-07 23:00 UTC = 2026-05-08 04:30 IST → "08-05-26" (still IST May 8)
    expect(formatDate("2026-05-07T23:00:00Z")).toBe("08-05-26");
  });
  it("returns em-dash on null/undefined/empty", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
  it("returns em-dash on invalid date", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("includes time in IST 12-hour format", () => {
    // 2026-05-08 06:00 UTC = 2026-05-08 11:30 IST
    const out = formatDateTime("2026-05-08T06:00:00Z");
    expect(out.startsWith("08-05-26, ")).toBe(true);
    expect(out).toMatch(/\d{1,2}:\d{2}\s?(am|pm|AM|PM)/i);
  });
});
