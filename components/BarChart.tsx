"use client";

export default function BarChart({
  data,
  valueKey,
  labelKey,
  color = "#0b1320",
  height = 140,
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {data.map((d, i) => {
          const value = Number(d[valueKey]);
          const barHeight = (value / max) * (height - 20);
          return (
            <g key={i}>
              <rect
                x={i * barWidth + barWidth * 0.15}
                y={height - 20 - barHeight}
                width={barWidth * 0.7}
                height={barHeight}
                fill={color}
                rx={1}
              />
            </g>
          );
        })}
      </svg>
      <div className="board-num mt-1 flex justify-between text-[9px] text-[var(--text-mute)]">
        <span>{data[0]?.[labelKey]?.slice(5)}</span>
        <span>{data[data.length - 1]?.[labelKey]?.slice(5)}</span>
      </div>
    </div>
  );
}
