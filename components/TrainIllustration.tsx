"use client";

/**
 * Flat illustrated metro train silhouette — a recognizable train shape
 * (not abstract), used as a hero/banner illustration across role landing
 * views. Pure inline SVG so it never depends on external image hosting.
 */
export default function TrainIllustration({
  accent = "#FFC83D",
  className = "",
}: {
  accent?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 480 180"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a metro train"
    >
      {/* track */}
      <line x1="0" y1="168" x2="480" y2="168" stroke="#2b3650" strokeWidth="3" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1={i * 21}
          y1="168"
          x2={i * 21 + 10}
          y2="178"
          stroke="#2b3650"
          strokeWidth="3"
        />
      ))}

      {/* train body */}
      <rect x="40" y="58" width="360" height="90" rx="18" fill="#16213a" />
      {/* nose cone */}
      <path d="M400 58 H418 C430 58 438 70 438 84 V122 C438 136 430 148 418 148 H400 Z" fill="#16213a" />
      {/* roof stripe */}
      <rect x="40" y="58" width="360" height="14" rx="7" fill={accent} />

      {/* windows */}
      {[70, 130, 190, 250, 310, 360].map((x, i) => (
        <rect key={i} x={x} y="84" width="40" height="32" rx="6" fill="#cfe0f5" opacity="0.92" />
      ))}
      {/* front window on nose */}
      <rect x="405" y="86" width="22" height="28" rx="5" fill="#cfe0f5" opacity="0.92" />

      {/* door lines */}
      <line x1="160" y1="72" x2="160" y2="148" stroke="#2b3650" strokeWidth="2" />
      <line x1="280" y1="72" x2="280" y2="148" stroke="#2b3650" strokeWidth="2" />

      {/* lower body stripe */}
      <rect x="40" y="130" width="360" height="10" fill={accent} opacity="0.85" />

      {/* wheels */}
      {[80, 150, 230, 310, 380].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="156" r="14" fill="#0b1320" />
          <circle cx={x} cy="156" r="6" fill={accent} />
        </g>
      ))}

      {/* headlight */}
      <circle cx="430" cy="120" r="5" fill={accent} />
    </svg>
  );
}
