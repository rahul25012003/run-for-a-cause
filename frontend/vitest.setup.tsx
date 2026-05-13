/**
 * Vitest setup — runs once before any test.
 *
 * - `@testing-library/jest-dom` adds matchers like `.toBeInTheDocument()`
 *   to expect()
 * - Mocks for `fetch`, `next/navigation`, and `next/image` so component
 *   tests can render without a real Next.js runtime
 */
/// <reference types="vitest-axe/extend-expect" />
import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Auto-clean up the DOM after every test
afterEach(() => {
  cleanup();
});

// Reset all mocks between tests so state doesn't leak
beforeEach(() => {
  vi.restoreAllMocks();
});

// Default fetch mock — tests that need specific responses override this
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => "",
  } as unknown as Response);
});

// Mock next/navigation hooks (most components use them)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image — render a plain <img>
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { src, alt, fill: _fill, ...rest } = props as any;
    return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} {...rest} />;
  },
}));
