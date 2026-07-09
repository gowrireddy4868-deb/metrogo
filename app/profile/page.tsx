"use client";

import { useEffect, useState } from "react";
import { apiFetch, saveSession, getToken } from "@/lib/apiClient";
import Link from "next/link";

const TIER_COLORS: Record<string, string> = {
  Bronze: "#b08d57",
  Silver: "#9ca3af",
  Gold: "#FFC83D",
  Platinum: "#a78bfa",
};

function getTier(points: number) {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 200) return "Silver";
  return "Bronze";
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch("/api/users/me");
      setUser(data);
      setName(data.name || "");
      setPhone(data.phone || "");
    } catch (e: any) {
      setError(e.data?.message || e.message || "Please log in to view your profile.");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (name !== user.name) body.name = name;
      if (phone !== (user.phone || "")) body.phone = phone;
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (Object.keys(body).length === 0) {
        setSaveMsg("No changes to save.");
        return;
      }
      const data = await apiFetch("/api/users/update", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setSaveMsg("Profile updated successfully.");
    } catch (e: any) {
      setSaveMsg(e.data?.message || e.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/auth/login" className="mt-4 inline-block font-semibold text-[var(--ink)] hover:underline">
          Log in
        </Link>
      </div>
    );
  }
  if (!user) {
    return <div className="mx-auto max-w-lg px-6 py-16 text-center text-[var(--text-mute)]">Loading…</div>;
  }

  const tier = getTier(user.rewardPoints || 0);
  const tierColor = TIER_COLORS[tier];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Account
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">My profile</h1>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper-card)] p-4 shadow-[3px_3px_0_0_var(--ink)] text-center">
          <p className="board-num text-2xl font-bold text-[var(--ink)]">{user.rewardPoints || 0}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
            Reward points
          </p>
        </div>
        <div className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper-card)] p-4 shadow-[3px_3px_0_0_var(--ink)] text-center">
          <p className="board-num text-2xl font-bold text-[var(--ink)]">
            {user.bookingStreak || 0} 🔥
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
            Day streak
          </p>
        </div>
        <div className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper-card)] p-4 shadow-[3px_3px_0_0_var(--ink)] text-center">
          <p
            className="board-num text-lg font-bold"
            style={{ color: tierColor }}
          >
            {tier}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
            Tier
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-6 shadow-[5px_5px_0_0_var(--ink)]"
      >
        <h2 className="font-bold text-[var(--ink)]">Edit details</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Email
            </label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm opacity-50 cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-[var(--text-mute)]">Email cannot be changed.</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Phone (optional)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>

          <div className="border-t border-[var(--line-rule)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Change password</h3>
            <p className="mt-1 text-xs text-[var(--text-mute)]">Leave blank to keep your current password.</p>
            <div className="mt-3 space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
            </div>
          </div>
        </div>

        {saveMsg && (
          <p
            className={`mt-4 text-sm ${
              saveMsg.includes("success") ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {saveMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white hover:bg-[var(--ink-soft)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mt-6 flex gap-3">
        <Link
          href="/tickets"
          className="flex-1 rounded-md border-2 border-[var(--ink)] py-2.5 text-center text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
        >
          My tickets
        </Link>
        <Link
          href="/rewards"
          className="flex-1 rounded-md border-2 border-[var(--ink)] py-2.5 text-center text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
        >
          Rewards
        </Link>
      </div>
    </div>
  );
}
