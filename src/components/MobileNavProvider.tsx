"use client";

import { createContext, useContext, useState } from "react";

interface MobileNavContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);
  return (
    <MobileNavContext.Provider value={{ open, toggle, close }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
