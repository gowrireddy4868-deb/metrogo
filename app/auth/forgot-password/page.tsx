"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.status === 429) { setError(data.message); return; }
      setSent(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-8 shadow-[5px_5px_0_0_var(--ink)]">
        {sent ? (
          <div className="text-center">
            <p className="text-4xl">📧</p>
            <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">Check your inbox</h1>
            <p className="mt-2 text-sm text-[var(--text-mute)]">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your spam folder too.
            </p>
            <Link href="/auth/login" className="mt-6 inline-block text-sm font-medium text-[var(--ink)] hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">Account recovery</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Forgot password?</h1>
            <p className="mt-1 text-sm text-[var(--text-mute)]">Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[var(--ink)] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-[var(--text-mute)]">
              Remember it?{" "}
              <Link href="/auth/login" className="font-medium text-[var(--ink)] hover:underline">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
