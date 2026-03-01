"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  return <>{children}</>;
}
