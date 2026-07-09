"use client";

import { useEffect, useRef, useState } from "react";

interface StationOption {
  id: string;
  name: string;
  city: string;
  zone: number;
  lines: { id: string; name: string; colorHex: string }[];
}

export default function StationPicker({
  label,
  value,
  onChange,
  excludeId,
  city,
}: {
  label: string;
  value: StationOption | null;
  onChange: (s: StationOption) => void;
  excludeId?: string;
  city?: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StationOption[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ search: query });
      if (city) params.set("city", city);
      fetch(`/api/stations?${params.toString()}`)
        .then((r) => r.json())
        .then((data: StationOption[]) => {
          setOptions(data.filter((s) => s.id !== excludeId));
        })
        .catch(() => setOptions([]));
    }, 150);
    return () => clearTimeout(handle);
  }, [query, excludeId, city]);

  return (
    <div ref={boxRef} className="relative">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="board-num flex w-full items-center justify-between rounded-md border-2 border-[var(--ink)] bg-white px-4 py-3.5 text-left text-sm shadow-[3px_3px_0_0_var(--ink)] transition hover:shadow-[1px_1px_0_0_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px] focus:outline-none"
      >
        {value ? (
          <span className="font-semibold text-[var(--ink)]">{value.name}</span>
        ) : (
          <span className="text-slate-400">Select station…</span>
        )}
        <span className="text-[var(--text-mute)]">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border-2 border-[var(--ink)] bg-white shadow-[4px_4px_0_0_var(--ink)]">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a station name…"
            className="w-full border-b border-[var(--line-rule)] px-4 py-3 text-sm outline-none"
          />
          <ul className="max-h-64 overflow-y-auto">
            {options.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">No stations found</li>
            )}
            {options.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--paper)]"
                >
                  <span>
                    <span className="font-medium text-[var(--ink)]">{s.name}</span>
                    <span className="board-num ml-2 text-xs text-[var(--text-mute)]">
                      ZONE {s.zone}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    {s.lines.map((l) => (
                      <span
                        key={l.id}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: l.colorHex }}
                        title={l.name}
                      />
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
