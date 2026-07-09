"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import RoleBanner from "@/components/RoleBanner";

type GateType = "entry" | "exit";

export default function StaffScanPage() {
  const [gateType, setGateType] = useState<GateType>("entry");
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const scannerRef = useRef<any>(null);
  const regionId = "qr-reader-region";

  async function validate(qrToken: string) {
    setBusy(true);
    try {
      const data = await apiFetch("/api/validate", {
        method: "POST",
        body: JSON.stringify({ qrToken, gateId: "GATE-1", gateType }),
      });
      setResult(data);
    } catch (e: any) {
      setResult({ result: "fail", reason: e.data?.reason || e.message, gateAction: "deny" });
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setCameraOn(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decodedText: string) => {
          await scanner.stop();
          setCameraOn(false);
          validate(decodedText);
        },
        () => {}
      );
    } catch {
      setCameraOn(false);
      alert("Could not access camera. Use manual entry below instead.");
    }
  }

  useEffect(() => {
    return () => {
      scannerRef.current?.stop?.().catch(() => {});
    };
  }, []);

  return (
    <div>
      <RoleBanner role="staff" eyebrow="Gate operations" title="Gate scanner" />
      <div className="mx-auto max-w-lg px-6 py-12">
      <p className="text-sm text-[var(--text-mute)]">Simulates a turnstile validation gate.</p>

      <div className="mt-6 flex rounded-md border-2 border-[var(--ink)] bg-white p-1">
        {(["entry", "exit"] as GateType[]).map((g) => (
          <button
            key={g}
            onClick={() => setGateType(g)}
            className={`board-num flex-1 rounded-sm py-2 text-sm font-bold uppercase tracking-wide transition ${
              gateType === g ? "bg-[var(--ink)] text-white" : "text-[var(--ink)] hover:bg-[var(--paper)]"
            }`}
          >
            {g} gate
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]">
        <div id={regionId} className="mx-auto w-full overflow-hidden rounded-md" />
        {!cameraOn && (
          <button
            onClick={startCamera}
            className="mt-4 w-full rounded-md bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--ink-soft)]"
          >
            Start camera scan
          </button>
        )}

        <div className="mt-6 border-t border-dashed border-[var(--line-rule)] pt-6">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
            Or paste QR token manually
          </label>
          <textarea
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            rows={3}
            className="board-num w-full rounded-md border border-[var(--line-rule)] px-3 py-2 text-xs outline-none focus:border-[var(--ink)]"
            placeholder="Paste ticket.qrToken value here…"
          />
          <button
            onClick={() => validate(manualToken)}
            disabled={!manualToken || busy}
            className="mt-3 w-full rounded-md border-2 border-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-50"
          >
            {busy ? "Validating…" : "Validate token"}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-6 rounded-lg border-2 border-[var(--ink)] p-8 text-center shadow-[5px_5px_0_0_var(--ink)] ${
            result.gateAction === "open" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          <p className="board-num text-4xl font-bold text-white">
            {result.gateAction === "open" ? "✓ ACCESS GRANTED" : "✕ ACCESS DENIED"}
          </p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-white/90">
            {String(result.reason || "").replace(/_/g, " ")}
          </p>
          {result.ticketStatus && (
            <p className="board-num mt-1 text-xs text-white/70">
              Ticket status: {result.ticketStatus}
            </p>
          )}
          {result.fareShortfall && (
            <p className="board-num mt-1 text-xs text-white/90">
              Fare shortfall: ₹{result.fareShortfall.toFixed(2)}
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
