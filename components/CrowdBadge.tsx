"use client";

import { useEffect, useState } from "react";

const LEVEL_STYLES: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-700",
  Medium: "bg-[#FFC83D]/25 text-[#5c4400]",
  High: "bg-red-50 text-red-700",
};

export default function CrowdBadge({ stationId }: { stationId: string }) {
  const [data, setData] = useState<{ level: string; intensity: number } | null>(null);

  useEffect(() => {
    if (!stationId) return;
    fetch(`/api/crowd?stationId=${stationId}`)
      .then((r) => r.json())
      .then((d) => setData(d.current))
      .catch(() => setData(null));
  }, [stationId]);

  if (!data) return null;

  return (
    <span
      className={`board-num inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLES[data.level]}`}
      title="Predicted crowd level for this hour, based on historical booking patterns"
    >
      ● {data.level} crowd ({data.intensity}%)
    </span>
  );
}
