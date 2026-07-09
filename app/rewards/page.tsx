"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

const TIERS = [
  { name: "Bronze", min: 0, color: "#b08d57" },
  { name: "Silver", min: 200, color: "#9ca3af" },
  { name: "Gold", min: 500, color: "#FFC83D" },
  { name: "Platinum", min: 1000, color: "#a78bfa" },
];

function currentTier(points: number) {
  return [...TIERS].reverse().find((t) => points >= t.min) || TIERS[0];
}

export default function RewardsPage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/users/me")
      .then(setUser)
      .catch((e) => setError(e.data?.message || e.message || "Log in to view rewards"));
  }, []);

  if (error) {
    return <div className="mx-auto max-w-lg px-6 py-16 text-center text-red-600">{error}</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-[var(--text-mute)]">
        Loading…
      </div>
    );
  }

  const tier = currentTier(user.rewardPoints);
  const nextTier = TIERS.find((t) => t.min > user.rewardPoints);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Loyalty program
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Rewards & streaks</h1>
      <p className="mt-1 text-sm text-[var(--text-mute)]">
        Earn points on every ride and build a daily booking streak.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
            Reward points
          </p>
          <p className="board-num mt-1 text-4xl font-bold text-[var(--ink)]">
            {user.rewardPoints}
          </p>
          <span
            className="board-num mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase"
            style={{ backgroundColor: tier.color, color: "#0b1320" }}
          >
            {tier.name} tier
          </span>
          {nextTier && (
            <p className="mt-3 text-xs text-[var(--text-mute)]">
              {nextTier.min - user.rewardPoints} points to {nextTier.name}
            </p>
          )}
        </div>

        <div className="rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
            Booking streak
          </p>
          <p className="board-num mt-1 text-4xl font-bold text-[var(--ink)]">
            {user.bookingStreak} 🔥
          </p>
          <p className="mt-3 text-xs text-[var(--text-mute)]">
            {user.lastBookingDate
              ? `Last booking: ${new Date(user.lastBookingDate).toLocaleDateString()}`
              : "Book a ticket today to start your streak"}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-md border border-dashed border-[var(--line-rule)] bg-white/60 p-5 text-sm text-[var(--text-mute)]">
        <p className="font-semibold text-[var(--ink)]">How it works</p>
        <p className="mt-1">
          You earn 1 point per ₹10 spent (minimum 5 points per ticket). Book on consecutive days
          to grow your streak — miss a day and it resets to 1.
        </p>
      </div>
    </div>
  );
}
