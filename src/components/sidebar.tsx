"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, Settings, LogOut, Image, Sparkles, Globe, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useMobileNav } from "./MobileNavProvider";
import { ThemeToggle } from "./ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open, close } = useMobileNav();

  // Auto-close drawer on navigation
  useEffect(() => {
    close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = [
    { name: "Chat", href: "/", icon: MessageSquare },
    { name: "Companions", href: "/companions", icon: Users },
    { name: "Community", href: "/community", icon: Globe },
    { name: "Gallery", href: "/gallery", icon: Image },
    { name: "Generate", href: "/generate", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col p-4 border-r border-slate-700 transition-transform duration-300
          md:static md:z-auto md:translate-x-0 md:flex
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "var(--sidebar, #1e293b)" }}
      >
        <div className="mb-8 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg animate-pulse shadow-glow-pink"
            style={{ background: "linear-gradient(to bottom right, var(--primary, #ec4899), var(--accent, #d946ef))" }}
          />
          <h1 className="text-xl font-bold text-white">Companion Hub</h1>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="ml-auto p-1 rounded text-slate-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive
                    ? "shadow-glow-pink text-white"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white hover:scale-105"
                }`}
                style={isActive ? { background: "linear-gradient(to right, var(--primary, #ec4899), var(--accent, #d946ef))" } : undefined}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 pt-4">
          {status === "loading" ? (
            <div className="bg-slate-800/50 p-3 rounded-lg animate-pulse">
              <div className="h-10 bg-slate-700 rounded"></div>
            </div>
          ) : session ? (
            <>
              <div className="bg-slate-800/40 p-3 rounded-lg flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "linear-gradient(to top right, var(--primary, #ec4899), var(--accent, #d946ef))" }}
                >
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    @{(session.user as { username?: string }).username || "user"}
                  </p>
                </div>
              </div>
              <ThemeToggle />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block text-center px-4 py-2 text-white rounded-lg transition-all"
              style={{ background: "linear-gradient(to right, var(--primary, #ec4899), var(--accent, #d946ef))" }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
