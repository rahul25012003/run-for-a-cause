/**
 * EmptyState — render + axe-core a11y smoke test.
 * Validates the new `illustration` prop doesn't introduce focusable
 * elements (decorative images must have empty alt) and that the heading
 * structure is valid.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No events" description="Check back soon" />);
    expect(screen.getByText("No events")).toBeInTheDocument();
    expect(screen.getByText("Check back soon")).toBeInTheDocument();
  });

  it("renders the illustration when prop is set", () => {
    const { container } = render(
      <EmptyState illustration="events" title="No events" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/illustrations/empty-events.svg");
    // Decorative — empty alt is correct
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("falls back to icon block when no illustration", () => {
    const { container } = render(<EmptyState title="x" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <EmptyState
        illustration="donations"
        title="Empty"
        description="Some text here"
      />,
    );
    const results = await axe(container);
    // vitest-axe augments Vi.Assertion (not vitest's exported Assertion),
    // so the `expect(...).toHaveNoViolations()` call works at runtime but
    // not under tsc. Inline the violation check instead.
    expect(results.violations).toEqual([]);
  });
});
