"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, saveSession } from "@/lib/apiClient";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      saveSession(data.accessToken, data.user, data.refreshToken);
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e.data?.message || e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Account access
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Create your account</h1>
      <p className="mt-1 text-sm text-[var(--text-mute)]">Book faster with saved ticket history.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm text-[var(--text-mute)]">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-[var(--ink)] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
