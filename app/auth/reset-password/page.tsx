"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Reset failed."); return; }
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-red-600">Invalid reset link. Please request a new one.</p>
        <Link href="/auth/forgot-password" className="mt-4 inline-block font-medium text-[var(--ink)] hover:underline">Request reset</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-8 shadow-[5px_5px_0_0_var(--ink)]">
        {success ? (
          <div className="text-center">
            <p className="text-4xl">✅</p>
            <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">Password reset!</h1>
            <p className="mt-2 text-sm text-[var(--text-mute)]">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">Account recovery</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Set new password</h1>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                required
                className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[var(--ink)] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-[var(--text-mute)]">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
