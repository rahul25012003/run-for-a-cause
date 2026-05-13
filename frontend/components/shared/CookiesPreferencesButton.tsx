"use client";

import { ArrowRight } from "lucide-react";
import { REOPEN_EVENT } from "@/components/shared/ConsentBanner";

export function CookiesPreferencesButton(): React.ReactNode {
  const open = (): void => {
    window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
  };
  return (
    <button
      type="button"
      onClick={open}
      className="group inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-primary-300 transition relative"
    >
      <span>Cookies preferences</span>
      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
    </button>
  );
}
