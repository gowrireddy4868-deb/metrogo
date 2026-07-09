import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPeakTime } from "@/lib/fareEngine";

/**
 * Crowd prediction is computed from real historical ticket purchase
 * timestamps grouped by hour-of-day — not a hardcoded guess. With little
 * seed data this naturally falls back to the scheduled peak-hour windows
 * (8-10:30am, 5:30-8pm) until enough real bookings accumulate to outweigh
 * that baseline.
 */
export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get("stationId");

  const tickets = await prisma.ticket.findMany({
    where: stationId ? { sourceStationId: stationId } : {},
    select: { createdAt: true },
  });

  // bucket counts by hour-of-day (0-23), blended with a baseline so a
  // mostly-empty demo DB still produces a sensible-looking curve
  const hourCounts = new Array(24).fill(0);
  for (const t of tickets) {
    hourCounts[t.createdAt.getHours()] += 1;
  }

  const baseline = (hour: number) => {
    const probe = new Date();
    probe.setHours(hour, 0, 0, 0);
    return isPeakTime(probe) ? 8 : 2;
  };

  const blended = hourCounts.map((c, hour) => c * 3 + baseline(hour));
  const max = Math.max(...blended, 1);

  const hourly = blended.map((value, hour) => {
    const ratio = value / max;
    const level = ratio > 0.7 ? "High" : ratio > 0.35 ? "Medium" : "Low";
    return { hour, level, intensity: Math.round(ratio * 100) };
  });

  const currentHour = new Date().getHours();
  const nextHour = (currentHour + 1) % 24;

  return NextResponse.json({
    hourly,
    current: hourly[currentHour],
    next: hourly[nextHour],
    sampleSize: tickets.length,
  });
}
