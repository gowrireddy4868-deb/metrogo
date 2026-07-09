"use client";

import { useEffect, useState } from "react";

interface Station { id: string; name: string; }
interface Line { id: string; name: string; colorHex: string; stations: Station[]; }

const HEADWAY_MINUTES = 6;
const SECONDS_PER_HOP = 25;

function computeTrainPositions(stationCount: number, now: number) {
  if (stationCount < 2) return [];
  const hopMs = SECONDS_PER_HOP * 1000;
  const legMs = (stationCount - 1) * hopMs;
  const roundMs = legMs * 2;
  const headwayMs = HEADWAY_MINUTES * 60 * 1000;
  const count = Math.max(1, Math.floor(roundMs / headwayMs));
  const trains: { progress: number; direction: 1 | -1 }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (now + i * headwayMs) % roundMs;
    trains.push(
      t < legMs
        ? { progress: t / legMs, direction: 1 }
        : { progress: 1 - (t - legMs) / legMs, direction: -1 }
    );
  }
  return trains;
}

function LineCard({ line, now }: { line: Line; now: number }) {
  const trains = computeTrainPositions(line.stations.length, now);
  // Show at most 12 stations visually — if more, show first 6 + last 6 with a gap indicator
  const MAX_SHOWN = 12;
  const stations = line.stations;
  const tooMany = stations.length > MAX_SHOWN;
  const shown = tooMany
    ? [...stations.slice(0, 6), ...stations.slice(-6)]
    : stations;

  return (
    <div className="rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-5 shadow-[4px_4px_0_0_var(--ink)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.colorHex }}/>
        <h2 className="font-bold text-[var(--ink)] truncate">{line.name}</h2>
        <span className="board-num ml-auto flex-shrink-0 text-xs text-[var(--text-mute)]">
          {trains.length} train{trains.length !== 1 ? "s" : ""} · {stations.length} stops
        </span>
      </div>

      {/* Track diagram */}
      <div className="relative" style={{ height: 48 }}>
        {/* Track line */}
        <div className="absolute left-4 right-4 top-4 h-1.5 rounded-full"
          style={{ backgroundColor: line.colorHex, opacity: 0.25 }}/>

        {/* Station dots */}
        {shown.map((s, i) => {
          const pct = shown.length === 1 ? 50 : (i / (shown.length - 1)) * 100;
          return (
            <div key={s.id} className="absolute -translate-x-1/2 top-2.5"
              style={{ left: `calc(${pct}% * 0.88 + 6%)` }}>
              <div className="h-3.5 w-3.5 rounded-full border-2 bg-[var(--paper-card)]"
                style={{ borderColor: line.colorHex }}/>
            </div>
          );
        })}

        {/* Trains */}
        {trains.map((t, i) => (
          <div key={i}
            className="absolute top-0 -translate-x-1/2 text-xl transition-all duration-1000 ease-linear"
            style={{ left: `calc(${t.progress * 88}% + 6%)` }}
            title={t.direction === 1 ? "→ Outbound" : "← Inbound"}
          >
            🚆
          </div>
        ))}
      </div>

      {/* Station names */}
      <div className="mt-1 overflow-x-auto">
        <div className="flex gap-0" style={{ minWidth: `${shown.length * 72}px` }}>
          {shown.map((s, i) => {
            const isTerminus = i === 0 || i === shown.length - 1;
            const isGap = tooMany && i === 5;
            return (
              <div key={s.id} className="flex-1 text-center px-1">
                {isGap && (
                  <div className="board-num text-[9px] text-[var(--text-mute)] mb-0.5">· · ·</div>
                )}
                <p className={`board-num text-[9px] leading-tight ${
                  isTerminus ? "font-bold text-[var(--ink)]" : "text-[var(--text-mute)]"
                }`}>
                  {s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LiveTrackingPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [now, setNow] = useState(Date.now());
  const [cityFilter, setCityFilter] = useState("All");

  useEffect(() => {
    fetch("/api/lines").then(r => r.json()).then(setLines).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Extract city from line name e.g. "Yellow Line (Delhi)" → "Delhi"
  const cities = ["All", ...Array.from(new Set(
    lines.map(l => l.name.match(/\(([^)]+)\)/)?.[1] || "Other")
  ))];

  const filtered = cityFilter === "All"
    ? lines
    : lines.filter(l => l.name.includes(`(${cityFilter})`));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Service status
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Live train tracking</h1>
      <p className="mt-1 text-sm text-[var(--text-mute)]">
        Simulated positions — trains every {HEADWAY_MINUTES} min. Updates every second.
      </p>

      {/* City filter */}
      <div className="mt-5 flex flex-wrap gap-2">
        {cities.map(city => (
          <button key={city} onClick={() => setCityFilter(city)}
            className={`board-num rounded-full border px-3 py-1 text-xs font-semibold transition ${
              cityFilter === city
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line-rule)] text-[var(--text-mute)] hover:border-[var(--ink)]"
            }`}>
            {city}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {filtered.map(line => (
          <LineCard key={line.id} line={line} now={now} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-center py-8 text-[var(--text-mute)]">
            {lines.length === 0 ? "Loading lines…" : "No lines for this city."}
          </p>
        )}
      </div>
    </div>
  );
}
