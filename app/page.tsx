"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StationPicker from "@/components/StationPicker";
import CitySelector from "@/components/CitySelector";
import LineSchematic from "@/components/LineSchematic";
import HeroIllustration from "@/components/HeroIllustration";
import CrowdBadge from "@/components/CrowdBadge";
import { apiFetch } from "@/lib/apiClient";

interface StationOption {
  id: string;
  name: string;
  city: string;
  zone: number;
  lines: { id: string; name: string; colorHex: string }[];
}

interface JourneyResult {
  fromStation: any;
  toStation: any;
  fare: number;
  baseFare: number;
  peakApplied: boolean;
  estimatedMinutes: number;
  stopCount: number;
  interchangeCount: number;
  route: any[];
  lineSegments: { lineId: string; lineName: string; colorHex: string; stationIds: string[] }[];
}

export default function HomePage() {
  const [city, setCity] = useState("");
  const [from, setFrom] = useState<StationOption | null>(null);
  const [to, setTo] = useState<StationOption | null>(null);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handlePlan() {
    if (!from || !to) {
      setError("Pick both a source and destination station.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/journey?from=${from.id}&to=${to.id}`);
      setResult(data);
    } catch (e: any) {
      setError(e.data?.message || e.message || "Could not plan this journey.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function goToCheckout(type: "SINGLE" | "RETURN") {
    if (!from || !to) return;
    const params = new URLSearchParams({
      from: from.id,
      to: to.id,
      fromName: from.name,
      toName: to.name,
      type,
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="signage-band relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="board-num mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC83D]">
                ◆ Line status: all services running
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Know your fare before you tap in.
              </h1>
              <p className="mt-4 max-w-md text-lg text-slate-300">
                Plan your journey, buy tickets, and ride — fast, safe, and paperless.
              </p>
            </div>
            <div className="hidden lg:block">
              <HeroIllustration className="w-full max-w-lg mx-auto" />
            </div>
          </div>
          <div className="mt-8 max-w-2xl opacity-80">
            <LineSchematic />
          </div>
        </div>
      </section>

      {/* Planner card */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_0_var(--ink)] sm:p-8">
          <CitySelector
            value={city}
            onChange={(c) => {
              setCity(c);
              setFrom(null);
              setTo(null);
              setResult(null);
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <StationPicker label="From" value={from} onChange={setFrom} excludeId={to?.id} city={city} />
            <StationPicker label="To" value={to} onChange={setTo} excludeId={from?.id} city={city} />
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <button
            onClick={handlePlan}
            disabled={loading}
            className="mt-6 w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Calculating…" : "Check fare & route →"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_0_var(--ink)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line-rule)] pb-6">
              <div>
                <p className="text-sm text-[var(--text-mute)]">
                  {result.fromStation.name} → {result.toStation.name}
                </p>
                <p className="board-num mt-1 text-4xl font-bold text-[var(--ink)]">
                  ₹{result.fare.toFixed(2)}
                  {result.peakApplied && (
                    <span className="ml-3 rounded-sm bg-[#FFC83D] px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--signal-ink)]">
                      Peak fare
                    </span>
                  )}
                </p>
                <div className="mt-2">
                  <CrowdBadge stationId={result.fromStation.id} />
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="board-num text-xl font-bold text-[var(--ink)]">
                    {result.estimatedMinutes} min
                  </p>
                  <p className="text-[var(--text-mute)]">Est. travel time</p>
                </div>
                <div>
                  <p className="board-num text-xl font-bold text-[var(--ink)]">
                    {result.stopCount} stops
                  </p>
                  <p className="text-[var(--text-mute)]">
                    {result.interchangeCount} interchange{result.interchangeCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Schematic of the actual route */}
            <div className="py-6">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
                Route diagram
              </p>
              {result.lineSegments.length === 0 ? (
                <p className="text-sm text-[var(--text-mute)]">Same station — no travel needed.</p>
              ) : (
                <LineSchematic
                  segments={result.lineSegments.map((s) => ({
                    colorHex: s.colorHex,
                    stationCount: s.stationIds.length,
                  }))}
                />
              )}
              <div className="mt-3 flex flex-wrap gap-4">
                {result.lineSegments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-6 rounded-full"
                      style={{ backgroundColor: seg.colorHex }}
                    />
                    <span className="text-xs font-medium text-[var(--text-mute)]">
                      {seg.lineName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--line-rule)] pt-6 sm:flex-row">
              <button
                onClick={() => goToCheckout("SINGLE")}
                className="board-num flex-1 rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white transition hover:bg-[var(--ink-soft)]"
              >
                Buy single ticket — ₹{result.fare.toFixed(2)}
              </button>
              <button
                onClick={() => goToCheckout("RETURN")}
                className="board-num flex-1 rounded-md border-2 border-[var(--ink)] px-6 py-3.5 font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)]"
              >
                Buy return ticket — ₹{(result.fare * 2).toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
