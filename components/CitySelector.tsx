"use client";

import { useEffect, useState } from "react";

export default function CitySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (city: string) => void;
}) {
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: string[]) => {
        setCities(data);
        if (!value && data.length > 0) onChange(data[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
        City
      </label>
      <div className="flex flex-wrap gap-2">
        {cities.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`board-num rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${
              value === c
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line-rule)] bg-white text-[var(--text-mute)] hover:border-[var(--ink)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
