"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

const STATUS_STYLES: Record<string, string> = {
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700",
  ISSUED: "bg-blue-50 text-blue-700",
  IN_TRANSIT: "bg-[#FFC83D]/20 text-[#5c4400]",
  COMPLETED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-red-50 text-red-600",
  VOID: "bg-red-50 text-red-600",
};

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadTicket() {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("metro_access_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Ticket not found");
      const data = await res.json();
      setTicket(data);
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
      setError(e.message);
      setPolling(false);
    }
  }

  useEffect(() => { loadTicket(); }, [id]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadTicket, 1500);
    const timeout = setTimeout(() => setPolling(false), 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [polling]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `metrogo-ticket-${ticket.id.slice(0, 8)}.png`;
    a.click();
  }

  async function shareTicket() {
    const url = window.location.href;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "MetroGo Ticket", url }); return; } catch {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (error) {
    return <div className="mx-auto max-w-lg px-6 py-16 text-center text-red-600">{error}</div>;
  }
  if (!ticket) {
    return <div className="mx-auto max-w-lg px-6 py-16 text-center text-[var(--text-mute)]">Loading ticket…</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16 print:py-0">
      <div id="ticket-printable" className="overflow-hidden rounded-lg border-2 border-[var(--ink)] bg-white shadow-[6px_6px_0_0_var(--ink)] print:shadow-none">
        <div className="signage-band px-6 py-5">
          <div className="flex items-center justify-between">
            <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC83D]">MetroGo Ticket</p>
            <span className="board-num text-xs text-slate-400">#{ticket.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {ticket.sourceStation?.name} → {ticket.destStation?.name}
          </p>
        </div>

        <div className="relative">
          <div className="ticket-stub absolute -top-2.5 left-0 right-0 h-5" />
        </div>

        <div className="flex flex-col items-center px-6 py-8">
          {ticket.status === "AWAITING_PAYMENT" ? (
            <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-md border-2 border-dashed border-[var(--line-rule)] text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
              <p className="mt-3 px-4 text-xs text-[var(--text-mute)]">Confirming payment…</p>
            </div>
          ) : (
            qrDataUrl && <img src={qrDataUrl} alt="Ticket QR code" className="rounded-md border-2 border-[var(--ink)]" />
          )}
          <p className="mt-4 text-xs text-[var(--text-mute)]">
            {ticket.status === "AWAITING_PAYMENT" ? "This usually takes a few seconds." : "Show this code at the gate scanner"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-dashed border-[var(--line-rule)] px-6 py-5 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">Status</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-600"}`}>
              {ticket.status.replace("_", " ")}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">Fare paid</p>
            <p className="board-num font-bold text-[var(--ink)]">₹{Number(ticket.fareAmount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">Type</p>
            <p className="board-num font-bold text-[var(--ink)]">{ticket.type}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-mute)]">Expires</p>
            <p className="board-num text-xs font-medium text-[var(--ink)]">{new Date(ticket.expiresAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="board-num border-t border-[var(--line-rule)] bg-[var(--paper)] px-6 py-3 text-[10px] text-[var(--text-mute)]">
          TICKET ID {ticket.id}
        </div>
      </div>

      {qrDataUrl && (
        <div className="mt-4 grid grid-cols-3 gap-2 print:hidden">
          <button onClick={downloadQr} className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]">
            ⬇ Download
          </button>
          <button onClick={shareTicket} className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]">
            {copied ? "✓ Copied" : "↗ Share"}
          </button>
          <button onClick={() => window.print()} className="rounded-md border-2 border-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)]">
            🖨 Print
          </button>
        </div>
      )}
    </div>
  );
}