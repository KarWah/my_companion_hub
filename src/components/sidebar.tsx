"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, Settings, LogOut, Image, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navItems = [
    { name: "Chat", href: "/", icon: MessageSquare },
    { name: "Companions", href: "/companions", icon: Users },
    { name: "Gallery", href: "/gallery", icon: Image },
    { name: "Generate", href: "/generate", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-lg animate-pulse" />
        <h1 className="text-xl font-bold text-white">Companion Hub</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 pt-4">
        {status === "loading" ? (
          <div className="bg-slate-800/50 p-3 rounded-lg animate-pulse">
            <div className="h-10 bg-slate-700 rounded"></div>
          </div>
        ) : session ? (
          <>
            <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
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
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="block text-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}