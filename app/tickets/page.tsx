"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

const STATUS_STYLES: Record<string, string> = {
  ISSUED: "bg-blue-50 text-blue-700",
  IN_TRANSIT: "bg-[#FFC83D]/20 text-[#5c4400]",
  COMPLETED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-red-50 text-red-600",
  VOID: "bg-red-50 text-red-600",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
};

const ALL_STATUSES = ["ALL", "ISSUED", "IN_TRANSIT", "COMPLETED", "EXPIRED", "REFUNDED"];

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function load() {
    try {
      const data = await apiFetch("/api/tickets/me");
      setTickets(data);
    } catch (e: any) {
      setError(e.data?.message || e.message || "Could not load tickets. Please log in.");
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      const route = `${t.sourceStation?.name || ""} ${t.destStation?.name || ""}`.toLowerCase();
      const matchSearch = !search || route.includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const ticketDate = new Date(t.createdAt);
      const matchFrom = !dateFrom || ticketDate >= new Date(dateFrom);
      const matchTo = !dateTo || ticketDate <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [tickets, search, statusFilter, dateFrom, dateTo]);

  async function handleRefund(id: string) {
    setRefunding(id);
    try {
      await apiFetch(`/api/tickets/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e.data?.message || e.data?.reason || e.message || "Refund failed");
    } finally {
      setRefunding(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/auth/login" className="mt-4 inline-block font-semibold text-[var(--ink)] hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Booking history
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">My tickets</h1>
      <p className="mt-1 text-sm text-[var(--text-mute)]">
        {tickets ? `${tickets.length} total · ${filtered.length} shown` : "Loading…"}
      </p>

      {/* Search & filters */}
      <div className="mt-6 space-y-3 rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by station name…"
          className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-2.5 text-sm outline-none focus:border-[var(--ink)]"
        />

        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`board-num rounded-full border px-3 py-1 text-xs font-semibold transition ${
                statusFilter === s
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line-rule)] text-[var(--text-mute)] hover:border-[var(--ink)]"
              }`}
            >
              {s === "ALL" ? "All statuses" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              From date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              To date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
          </div>
          {(search || statusFilter !== "ALL" || dateFrom || dateTo) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="rounded-md border border-[var(--line-rule)] px-3 py-2 text-xs font-medium text-[var(--text-mute)] hover:border-[var(--ink)]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 space-y-3">
        {tickets === null && <p className="text-[var(--text-mute)]">Loading…</p>}
        {tickets !== null && filtered.length === 0 && (
          <p className="text-center py-8 text-[var(--text-mute)]">
            {tickets.length === 0
              ? "No tickets yet. Plan a trip from the homepage."
              : "No tickets match your filters."}
          </p>
        )}
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-md border-2 border-[var(--ink)] bg-[var(--paper-card)] p-4 shadow-[3px_3px_0_0_var(--ink)]"
          >
            <div>
              <p className="font-semibold text-[var(--ink)]">
                {t.sourceStation?.name} → {t.destStation?.name}
              </p>
              <p className="board-num mt-1 text-xs text-[var(--text-mute)]">
                {t.type} · ₹{Number(t.fareAmount).toFixed(2)} ·{" "}
                {t.paymentMethod} ·{" "}
                {new Date(t.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  STATUS_STYLES[t.status] || "bg-slate-100 text-slate-600"
                }`}
              >
                {t.status.replace("_", " ")}
              </span>
              <Link
                href={`/tickets/${t.id}`}
                className="rounded-md border border-[var(--ink)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--paper)]"
              >
                View
              </Link>
              {t.status === "ISSUED" && (
                <button
                  onClick={() => handleRefund(t.id)}
                  disabled={refunding === t.id}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {refunding === t.id ? "…" : "Refund"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
