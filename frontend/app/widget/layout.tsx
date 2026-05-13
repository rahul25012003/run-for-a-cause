import type { ReactNode } from "react";

/**
 * Widget layout — strips the Navbar/Footer chrome so the route looks right
 * inside an iframe. Loads the same Tailwind globals from the root layout
 * (Next 15 inherits globals through nested layouts automatically), but
 * overrides the body background to transparent so embedders can paint
 * their own card background around the iframe.
 */
export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent" style={{ background: "transparent" }}>
      {children}
    </div>
  );
}
