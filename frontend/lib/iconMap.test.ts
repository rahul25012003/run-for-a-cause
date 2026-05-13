/**
 * Tests for the icon name → component resolver. Critical because CMS-supplied
 * icon strings flow through this; an unknown name must NOT crash the page.
 */
import { describe, expect, it } from "vitest";
import { Sparkles, ShieldCheck } from "lucide-react";
import { resolveIcon, ICON_NAMES } from "./iconMap";

describe("resolveIcon", () => {
  it("resolves a known name", () => {
    expect(resolveIcon("ShieldCheck")).toBe(ShieldCheck);
  });

  it("falls back to Sparkles for unknown names", () => {
    expect(resolveIcon("ThisIconDoesNotExist")).toBe(Sparkles);
  });

  it("falls back when given null or undefined", () => {
    expect(resolveIcon(null)).toBe(Sparkles);
    expect(resolveIcon(undefined)).toBe(Sparkles);
  });

  it("falls back to a custom fallback when provided", () => {
    expect(resolveIcon("nonsense", ShieldCheck)).toBe(ShieldCheck);
  });
});

describe("ICON_NAMES", () => {
  it("is a sorted array of strings", () => {
    expect(Array.isArray(ICON_NAMES)).toBe(true);
    expect(ICON_NAMES.length).toBeGreaterThan(10);
    const sorted = [...ICON_NAMES].sort();
    expect(ICON_NAMES).toEqual(sorted);
  });

  it("contains the icons used by the CMS defaults", () => {
    // These names appear in `seed_settings.py` for HowItWorks + TrustStrip.
    // If any are missing from iconMap, the homepage would render fallback
    // sparkles instead of the intended brand icons.
    const required = [
      "Calendar",
      "Footprints",
      "HandHeart",
      "Eye",
      "ShieldCheck",
      "Lock",
      "FileSpreadsheet",
      "BadgeCheck",
    ];
    for (const name of required) {
      expect(ICON_NAMES).toContain(name);
    }
  });
});
