"use client";

import TrainIllustration from "./TrainIllustration";

const ROLE_THEME = {
  rider: { accent: "#FFC83D", label: "Rider" },
  staff: { accent: "#22c55e", label: "Gate staff" },
  admin: { accent: "#a78bfa", label: "Admin" },
} as const;

export default function RoleBanner({
  role,
  eyebrow,
  title,
}: {
  role: "rider" | "staff" | "admin";
  eyebrow: string;
  title: string;
}) {
  const theme = ROLE_THEME[role];
  return (
    <div className="signage-band relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p
              className="board-num mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.accent }}
            >
              ◆ {eyebrow}
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <span
              className="board-num mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.accent, color: "#0b1320" }}
            >
              {theme.label} view
            </span>
          </div>
          <div className="hidden w-64 opacity-90 sm:block">
            <TrainIllustration accent={theme.accent} />
          </div>
        </div>
      </div>
    </div>
  );
}
