"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import RoleBanner from "@/components/RoleBanner";

export default function FraudDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/fraud")
      .then(setData)
      .catch((e) => setError(e.data?.message || e.message || "Access denied"));
  }, []);

  if (error) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-red-600">{error}</div>;
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-[var(--text-mute)]">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <RoleBanner role="admin" eyebrow="Security" title="Fraud detection" />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/admin" className="text-sm font-medium text-[var(--ink)] hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total failed scans", value: data.totalFailedValidations },
            { label: "Invalid signature attempts", value: data.invalidSignatureCount },
            { label: "Replay attempts", value: data.replayAttemptCount },
            { label: "Expired ticket attempts", value: data.expiredAttemptCount },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]"
            >
              <p className="board-num text-2xl font-bold text-[var(--ink)]">{c.value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
                {c.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
          <h2 className="font-bold text-[var(--ink)]">
            Suspicious activity ({data.suspiciousActivity.length})
          </h2>
          <p className="mt-1 text-sm text-[var(--text-mute)]">
            Tickets/passes with 2 or more failed gate validation attempts — possible cloned QR,
            replay, or tampering attempts.
          </p>
          <div className="mt-4 space-y-3">
            {data.suspiciousActivity.length === 0 && (
              <p className="text-sm text-[var(--text-mute)]">
                No suspicious activity detected. Clean record.
              </p>
            )}
            {data.suspiciousActivity.map((s: any) => (
              <div
                key={s.ticketOrPassId}
                className="rounded-md border border-red-200 bg-red-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[var(--ink)]">
                    {s.ticket?.route || "Unknown route"}
                  </p>
                  <span className="board-num rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                    {s.failCount} failed attempts
                  </span>
                </div>
                <p className="board-num mt-1 text-xs text-[var(--text-mute)]">
                  ID: {s.ticketOrPassId.slice(0, 12)}… · Rider: {s.ticket?.rider || "Unknown"} ·
                  Gates involved: {s.gateCount}
                </p>
                <p className="mt-2 text-xs text-[var(--text-mute)]">
                  Reasons: {s.reasons.join(", ").replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
