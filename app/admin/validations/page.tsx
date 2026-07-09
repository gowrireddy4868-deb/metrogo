"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import RoleBanner from "@/components/RoleBanner";

export default function ValidationHistoryPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/admin/validations?page=${page}`)
      .then(setData)
      .catch((e) => setError(e.data?.message || e.message || "Access denied"));
  }, [page]);

  if (error) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-red-600">{error}</div>;
  }

  return (
    <div>
      <RoleBanner role="admin" eyebrow="Audit trail" title="Validation history" />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/admin" className="text-sm font-medium text-[var(--ink)] hover:underline">
          ← Back to dashboard
        </Link>

        {!data ? (
          <p className="mt-6 text-[var(--text-mute)]">Loading…</p>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-md border-2 border-[var(--ink)] bg-white shadow-[3px_3px_0_0_var(--ink)]">
              <table className="board-num w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line-rule)] bg-[var(--paper)] text-left text-[10px] font-semibold uppercase text-[var(--text-mute)]">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Gate</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-[var(--line-rule)]">
                      <td className="px-4 py-3 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">{log.gateId}</td>
                      <td className="px-4 py-3 text-xs capitalize">{log.gateType}</td>
                      <td className="px-4 py-3 text-xs">{log.route || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            log.result === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.reason?.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                  {data.logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-mute)]">
                        No validation logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-[var(--text-mute)]">
                Page {data.page} of {data.totalPages || 1} · {data.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-[var(--ink)] px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                  className="rounded-md border border-[var(--ink)] px-3 py-1.5 font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
