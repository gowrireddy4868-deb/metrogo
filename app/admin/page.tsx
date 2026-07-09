"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/apiClient";
import RoleBanner from "@/components/RoleBanner";
import BarChart from "@/components/BarChart";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.data?.message || e.message || "Access denied"));
  }, []);

  function exportCsv(type: string) {
    const token = getToken();
    fetch(`/api/admin/export?type=${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}_export.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (error) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-red-600">{error}</div>;
  }
  if (!stats) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-[var(--text-mute)]">
        Loading…
      </div>
    );
  }

  const cards = [
    { label: "Stations", value: stats.totalStations },
    { label: "Lines", value: stats.totalLines },
    { label: "Users", value: stats.totalUsers },
    { label: "Active users (7d)", value: stats.activeUsers },
    { label: "Tickets sold", value: stats.totalTickets },
    { label: "Active passes", value: stats.totalPasses },
    { label: "Revenue (₹)", value: stats.revenue.toFixed(2) },
  ];

  return (
    <div>
      <RoleBanner role="admin" eyebrow="Control room" title="Admin dashboard" />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-mute)]">System overview and management.</p>
          <div className="flex gap-2">
            <Link
              href="/admin/fraud"
              className="rounded-md border-2 border-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Fraud detection
            </Link>
            <Link
              href="/admin/validations"
              className="rounded-md border-2 border-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Validation history
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((c) => (
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

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Revenue — last 14 days</h2>
            <div className="mt-3">
              <BarChart data={stats.revenueByDay} valueKey="revenue" labelKey="date" color="#0b1320" />
            </div>
          </div>

          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Bookings — last 14 days</h2>
            <div className="mt-3">
              <BarChart data={stats.revenueByDay} valueKey="count" labelKey="date" color="#FFC83D" />
            </div>
          </div>

          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Station-wise bookings</h2>
            <div className="mt-3 space-y-2">
              {stats.stationWiseBookings.length === 0 && (
                <p className="text-sm text-[var(--text-mute)]">No bookings yet.</p>
              )}
              {stats.stationWiseBookings.map((s: any) => (
                <div key={s.stationId} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ink)]">{s.stationName}</span>
                  <span className="board-num font-bold text-[var(--ink)]">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Tickets by status</h2>
            <div className="mt-3 space-y-2">
              {Object.entries(stats.ticketsByStatus).length === 0 && (
                <p className="text-sm text-[var(--text-mute)]">No tickets yet.</p>
              )}
              {Object.entries(stats.ticketsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-mute)]">{status.replace("_", " ")}</span>
                  <span className="board-num font-bold text-[var(--ink)]">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Recent gate activity</h2>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {stats.recentValidationLogs.length === 0 && (
                <p className="text-sm text-[var(--text-mute)]">No gate activity yet.</p>
              )}
              {stats.recentValidationLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="board-num text-[var(--text-mute)]">
                    {log.gateType} · {log.reason?.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      log.result === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {log.result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
            <h2 className="font-bold text-[var(--ink)]">Fare rules</h2>
            <table className="board-num mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase text-[var(--text-mute)]">
                  <th className="py-1">Zones</th>
                  <th>Base</th>
                  <th>Peak ×</th>
                </tr>
              </thead>
              <tbody>
                {stats.fareRules.map((r: any, i: number) => (
                  <tr key={i} className="text-[var(--text-mute)]">
                    <td className="py-1">
                      {r.fromZone}–{r.toZone}
                    </td>
                    <td>₹{Number(r.baseFare)}</td>
                    <td>{Number(r.peakMultiplier)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 rounded-md border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_0_var(--ink)]">
          <h2 className="font-bold text-[var(--ink)]">Export reports</h2>
          <p className="mt-1 text-sm text-[var(--text-mute)]">Download CSV reports for offline analysis.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => exportCsv("tickets")}
              className="rounded-md border-2 border-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Tickets CSV
            </button>
            <button
              onClick={() => exportCsv("validations")}
              className="rounded-md border-2 border-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Validations CSV
            </button>
            <button
              onClick={() => exportCsv("users")}
              className="rounded-md border-2 border-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Users CSV
            </button>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Station/line/fare CRUD forms aren't wired up yet in this UI — see the technical spec for
          the planned endpoints.
        </p>
      </div>
    </div>
  );
}
