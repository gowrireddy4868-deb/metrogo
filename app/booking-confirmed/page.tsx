"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function BookingConfirmedInner() {
  const params = useSearchParams();
  const ticketId = params.get("ticket");
  const passId = params.get("pass");
  const rewards = params.get("rewards");
  const streak = params.get("streak");
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      {/* Celebration animation */}
      <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
        <span className="text-5xl">🎉</span>
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-100 opacity-60" />
      </div>

      <p className="board-num text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
        Payment confirmed
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--ink)]">You're all set!</h1>
      <p className="mt-3 text-[var(--text-mute)]">
        Your ticket has been issued and a confirmation email is on its way to you.
      </p>

      {/* Rewards callout */}
      {rewards && Number(rewards) > 0 && (
        <div className="mt-6 rounded-lg border-2 border-[#FFC83D] bg-[#FFC83D]/10 p-4">
          <p className="font-semibold text-[var(--ink)]">
            +{rewards} reward points earned 🌟
          </p>
          {streak && Number(streak) > 1 && (
            <p className="mt-1 text-sm text-[var(--text-mute)]">
              {streak}-day booking streak 🔥 Keep it going!
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-8 space-y-3">
        {ticketId && (
          <Link
            href={`/tickets/${ticketId}`}
            className="block w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white hover:bg-[var(--ink-soft)]"
          >
            View ticket & QR code →
          </Link>
        )}
        {passId && (
          <Link
            href={`/passes/${passId}`}
            className="block w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white hover:bg-[var(--ink-soft)]"
          >
            View pass & QR code →
          </Link>
        )}
        <Link
          href="/tickets"
          className="block w-full rounded-md border-2 border-[var(--ink)] px-6 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
        >
          All my tickets
        </Link>
        <Link
          href="/"
          className="block text-sm text-[var(--text-mute)] hover:text-[var(--ink)]"
        >
          Plan another journey
        </Link>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Ticket ID: {ticketId || passId || "—"}
      </p>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-[var(--text-mute)]">Loading…</div>}>
      <BookingConfirmedInner />
    </Suspense>
  );
}
