"use client";

import { Menu } from "lucide-react";
import { useMobileNav } from "./MobileNavProvider";

export function MobileHeader() {
  const { toggle } = useMobileNav();
  return (
    <div className="md:hidden h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={toggle}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <span className="text-white font-semibold">Companion Hub</span>
    </div>
  );
}
