"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ConfirmationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const ticketId = params.get("ticketId");
  const passId = params.get("passId");
  const fare = params.get("fare");
  const from = params.get("from");
  const to = params.get("to");
  const type = params.get("type");
  const passType = params.get("passType");
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timer);
          if (ticketId) router.push(`/tickets/${ticketId}`);
          else if (passId) router.push(`/passes/${passId}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ticketId, passId]);

  const isPass = Boolean(passId);

  return (
    <div className="text-center">
      {/* Animated checkmark */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
        Payment confirmed
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--ink)]">You're all set!</h1>

      {isPass ? (
        <p className="mt-3 text-lg text-[var(--text-mute)]">
          Your <strong className="text-[var(--ink)]">{passType} Pass</strong> is now active.
        </p>
      ) : (
        <p className="mt-3 text-lg text-[var(--text-mute)]">
          <strong className="text-[var(--ink)]">{from}</strong> → <strong className="text-[var(--ink)]">{to}</strong>
        </p>
      )}

      <div className="mx-auto mt-6 max-w-xs rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-5 shadow-[4px_4px_0_0_var(--ink)]">
        {!isPass && (
          <div className="flex justify-between border-b border-[var(--line-rule)] pb-3 text-sm">
            <span className="text-[var(--text-mute)]">Journey type</span>
            <span className="font-semibold text-[var(--ink)]">{type}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 text-sm">
          <span className="text-[var(--text-mute)]">Amount paid</span>
          <span className="board-num font-bold text-[var(--ink)]">₹{Number(fare).toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-6 text-sm text-[var(--text-mute)]">
        A confirmation email has been sent to you.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href={ticketId ? `/tickets/${ticketId}` : `/passes/${passId}`}
          className="rounded-md bg-[var(--ink)] px-8 py-3.5 font-semibold text-white hover:opacity-90"
        >
          View {isPass ? "pass" : "ticket"} & QR code
        </Link>
        <Link href="/" className="text-sm font-medium text-[var(--text-mute)] hover:text-[var(--ink)]">
          Plan another journey
        </Link>
      </div>

      <p className="mt-6 text-xs text-[var(--text-mute)]">
        Redirecting in {count}s…
      </p>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <Suspense>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
