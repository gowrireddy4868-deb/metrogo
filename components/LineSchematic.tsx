"use client";

/**
 * Schematic transit-line diagram — the page's signature visual.
 * Renders a row of circular station markers connected by a colored line,
 * in the style of a real metro map schematic (think Vignelli's NYC diagram).
 * When `segments` is provided it draws a real multi-line route (with
 * interchange markers where the color changes); otherwise it renders a
 * generic decorative line for the homepage hero.
 */
export default function LineSchematic({
  segments,
  height = 64,
}: {
  segments?: { colorHex: string; stationCount: number }[];
  height?: number;
}) {
  const data =
    segments && segments.length > 0
      ? segments
      : [
          { colorHex: "#2563eb", stationCount: 4 },
          { colorHex: "#16a34a", stationCount: 3 },
        ];

  const totalStations = data.reduce((sum, s) => sum + s.stationCount, 0) - (data.length - 1);
  const width = Math.max(totalStations * 70, 280);
  const midY = height / 2;
  const stationGap = width / (totalStations - 1 || 1);

  let stationIndex = 0;
  const markers: { x: number; isInterchange: boolean }[] = [];
  const lines: { x1: number; x2: number; color: string }[] = [];

  data.forEach((seg, segIdx) => {
    const startIdx = stationIndex;
    for (let i = 0; i < seg.stationCount - 1; i++) {
      const x1 = startIdx * stationGap + i * stationGap;
      const x2 = x1 + stationGap;
      lines.push({ x1, x2, color: seg.colorHex });
    }
    for (let i = 0; i < seg.stationCount; i++) {
      const x = startIdx * stationGap + i * stationGap;
      const isLastOfSeg = i === seg.stationCount - 1;
      const isInterchange = isLastOfSeg && segIdx < data.length - 1;
      const alreadyExists = markers.find((m) => Math.abs(m.x - x) < 0.5);
      if (!alreadyExists) markers.push({ x, isInterchange });
    }
    stationIndex = startIdx + seg.stationCount - 1;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Schematic transit line diagram"
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={midY}
          x2={l.x2}
          y2={midY}
          stroke={l.color}
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {markers.map((m, i) =>
        m.isInterchange ? (
          <circle
            key={i}
            cx={m.x}
            cy={midY}
            r={9}
            fill="#ffffff"
            stroke="#0b1320"
            strokeWidth={3}
          />
        ) : (
          <circle key={i} cx={m.x} cy={midY} r={5.5} fill="#ffffff" stroke="#0b1320" strokeWidth={2} />
        )
      )}
    </svg>
  );
}
