"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearSession, getUser } from "@/lib/apiClient";
import { useTheme } from "./ThemeProvider";

function InterchangeMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="13" stroke="#FFC83D" strokeWidth="1.5" />
      <line x1="6" y1="10" x2="22" y2="18" stroke="#FFC83D" strokeWidth="2" />
      <line x1="6" y1="18" x2="22" y2="10" stroke="#FFC83D" strokeWidth="2" />
      <circle cx="14" cy="14" r="2.5" fill="#FFC83D" />
    </svg>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setUser(null);
    router.push("/");
  }

  const linkClass = (href: string) =>
    `text-sm font-medium tracking-wide transition hover:text-[#FFC83D] ${
      pathname === href ? "text-[#FFC83D]" : "text-slate-200"
    }`;

  return (
    <header className="signage-band sticky top-0 z-40 border-b border-black/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <InterchangeMark />
          <span className="board-num text-lg font-semibold uppercase tracking-[0.08em] text-white">
            MetroGo
          </span>
        </Link>
        <nav className="flex items-center gap-7">
          <Link href="/" className={linkClass("/")}>
            Plan a trip
          </Link>
          <Link href="/passes" className={linkClass("/passes")}>
            Passes
          </Link>
          <Link href="/live" className={linkClass("/live")}>
            Live
          </Link>
          {user && (
            <Link href="/profile" className={linkClass("/profile")}>
              Profile
            </Link>
          )}
          {user && (
            <Link href="/tickets" className={linkClass("/tickets")}>
              My tickets
            </Link>
          )}
          {user && (
            <Link href="/rewards" className={linkClass("/rewards")}>
              Rewards
            </Link>
          )}
          {user && (user.role === "STAFF" || user.role === "ADMIN") && (
            <Link href="/staff/scan" className={linkClass("/staff/scan")}>
              Scan
            </Link>
          )}
          {user && user.role === "ADMIN" && (
            <Link href="/admin" className={linkClass("/admin")}>
              Admin
            </Link>
          )}
          <button
            onClick={toggle}
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 transition hover:border-[#FFC83D] hover:text-[#FFC83D]"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {user ? (
            <div className="flex items-center gap-3 border-l border-white/15 pl-5">
              <span className="text-sm text-slate-400">{user.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#FFC83D] hover:text-[#FFC83D]"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-[#FFC83D] px-4 py-2 text-sm font-semibold text-[#0b1320] transition hover:brightness-95"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
