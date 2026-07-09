"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { apiFetch } from "@/lib/apiClient";

const STATUS_STYLES: Record<string, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  REFUNDED: "bg-red-50 text-red-600",
  VOID: "bg-red-50 text-red-600",
};

const PASS_LABEL: Record<string, string> = {
  DAY: "Day Pass",
  WEEK: "Week Pass",
  MONTH: "Month Pass",
};

export default function PassDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [pass, setPass] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadPass() {
    try {
      const data = await apiFetch(`/api/passes/${id}`);
      setPass(data);
      if (data.status !== "AWAITING_PAYMENT" && !data.qrToken.startsWith("PENDING_")) {
        const url = await QRCode.toDataURL(data.qrToken, {
          width: 220,
          margin: 1,
          color: { dark: "#0b1320", light: "#ffffff" },
        });
        setQrDataUrl(url);
        setPolling(false);
      }
    } catch (e: any) {
      setError(e.data?.message || e.message || "Pass not found");
      setPolling(false);
    }
  }

  useEffect(() => {
    loadPass();
  }, [id]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadPass, 1500);
    const timeout = setTimeout(() => setPolling(false), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `metrogo-pass-${pass.id.slice(0, 8)}.png`;
    a.click();
  }

  async function sharePass() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "MetroGo Pass",
      text: `${PASS_LABEL[pass.type]} — valid until ${new Date(pass.validTo).toLocaleDateString()}`,
      url,
    };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
        return;
      } catch {
        // user cancelled
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function printPass() {
    window.print();
  }

  if (error) {
    return <div className="mx-auto max-w-lg px-6 py-16 text-center text-red-600">{error}</div>;
  }
  if (!pass) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center text-[var(--text-mute)]">
        Loading pass…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 print:py-0">
      <div
        id="ticket-printable"
        className="overflow-hidden rounded-lg border-2 border-[var(--ink)] bg-white shadow-[6px_6px_0_0_var(--ink)] print:shadow-none"
      >
        <div className="signage-band px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC83D]">
              MetroGo Pass
            </p>
            <span className="board-num text-xs text-slate-400">
              #{pass.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">{PASS_LABEL[pass.type]}</p>
        </div>

        <div className="relative">
          <div className="ticket-stub absolute -top-2.5 left-0 right-0 h-5" />
        </div>

        <div className="flex flex-col items-center px-6 py-8">
          {pass.status === "AWAITING_PAYMENT" ? (
            <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-md border-2 border-dashed border-[var(--line-rule)] text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
              <p className="mt-3 px-4 text-xs text-[var(--text-mute)]">
                Waiting for payment confirmation from Stripe…
              </p>
            </div>
          ) : (
            qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Pass QR code"
                className="rounded-md border-2 border-[var(--ink)]"
              />
            )
          )}
          <p className="mt-4 text-xs text-[var(--text-mute)]">
            {pass.status === "AWAITING_PAYMENT"
              ? "This usually takes a few seconds."
              : "Show this code at the gate scanner — reusable until it expires"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-dashed border-[var(--line-rule)] px-6 py-5 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              Status
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                STATUS_STYLES[pass.status] || "bg-slate-100 text-slate-600"
              }`}
            >
              {pass.status.replace("_", " ")}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              Used
            </p>
            <p className="board-num font-bold text-[var(--ink)]">{pass.usageCount} times</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              Valid from
            </p>
            <p className="board-num text-xs font-medium text-[var(--ink)]">
              {new Date(pass.validFrom).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">
              Valid until
            </p>
            <p className="board-num text-xs font-medium text-[var(--ink)]">
              {new Date(pass.validTo).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="board-num border-t border-[var(--line-rule)] bg-[var(--paper)] px-6 py-3 text-[10px] text-[var(--text-mute)]">
          PASS ID {pass.id}
        </div>
      </div>

      {qrDataUrl && (
        <div className="mt-4 grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={downloadQr}
            className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
          >
            ⬇ Download
          </button>
          <button
            onClick={sharePass}
            className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
          >
            {copied ? "✓ Link copied" : "↗ Share"}
          </button>
          <button
            onClick={printPass}
            className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]"
          >
            🖨 Print
          </button>
        </div>
      )}
    </div>
  );
}
