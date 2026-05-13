/**
 * Tests for `parseJsonSetting` — the JSON-blob settings reader.
 * Must never throw; must always return a valid value.
 */
import { describe, expect, it } from "vitest";
import { parseJsonSetting } from "./useSiteSettings";

interface Step {
  icon: string;
  title: string;
}

describe("parseJsonSetting", () => {
  it("parses a valid JSON array", () => {
    const raw = '[{"icon":"Heart","title":"Hi"}]';
    const out = parseJsonSetting<Step[]>(raw, []);
    expect(out).toEqual([{ icon: "Heart", title: "Hi" }]);
  });

  it("parses a valid JSON object", () => {
    const raw = '{"a":1}';
    const out = parseJsonSetting<{ a: number }>(raw, { a: 0 });
    expect(out).toEqual({ a: 1 });
  });

  it("returns fallback on null", () => {
    expect(parseJsonSetting<Step[]>(null, [])).toEqual([]);
  });

  it("returns fallback on undefined", () => {
    expect(parseJsonSetting<Step[]>(undefined, [])).toEqual([]);
  });

  it("returns fallback on empty string", () => {
    expect(parseJsonSetting<Step[]>("", [])).toEqual([]);
  });

  it("returns fallback on whitespace-only string", () => {
    expect(parseJsonSetting<Step[]>("   \n  ", [])).toEqual([]);
  });

  it("returns fallback on malformed JSON (never throws)", () => {
    expect(parseJsonSetting<Step[]>("{not valid", [])).toEqual([]);
    expect(parseJsonSetting<Step[]>("undefined", [])).toEqual([]);
    expect(parseJsonSetting<Step[]>("[1,2,", [])).toEqual([]);
  });
});
