"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No verification token found."); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStatus("success");
        else { setStatus("error"); setMessage(d.message || "Verification failed."); }
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong."); });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-10 shadow-[5px_5px_0_0_var(--ink)]">
        {status === "loading" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
            <p className="mt-4 text-[var(--text-mute)]">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-4xl">✅</p>
            <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">Email verified!</h1>
            <p className="mt-2 text-sm text-[var(--text-mute)]">Your account is now fully active.</p>
            <Link href="/" className="mt-6 inline-block rounded-md bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">
              Start booking →
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-4xl">❌</p>
            <h1 className="mt-4 text-xl font-bold text-[var(--ink)]">Verification failed</h1>
            <p className="mt-2 text-sm text-[var(--text-mute)]">{message}</p>
            <Link href="/auth/signup" className="mt-6 inline-block rounded-md bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">
              Sign up again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-[var(--text-mute)]">Loading…</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
