"use client";

import { useState, useEffect } from "react";
import { Palette } from "lucide-react";

export function ThemeToggle() {
  const [isCharcoal, setIsCharcoal] = useState(false);

  useEffect(() => {
    setIsCharcoal(document.documentElement.dataset.theme === "charcoal");
  }, []);

  const toggle = () => {
    const next = isCharcoal ? "" : "charcoal";
    document.documentElement.dataset.theme = next;
    if (next) {
      localStorage.setItem("theme", next);
    } else {
      localStorage.removeItem("theme");
    }
    setIsCharcoal(!isCharcoal);
  };

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors mb-1"
    >
      <Palette size={16} />
      {isCharcoal ? "Pink" : "Indigo"}
    </button>
  );
}
