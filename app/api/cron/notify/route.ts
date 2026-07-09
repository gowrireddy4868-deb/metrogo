import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendStreakReminderEmail,
  sendPassExpiryEmail,
} from "@/lib/email";

/**
 * Run daily (8pm) via Vercel Cron.
 * 1. Streak reminders — users with a streak ≥2 who haven't booked today
 * 2. Pass expiry reminders — passes expiring within 48 hours
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const in48h = new Date(now.getTime() + 48 * 60 * 60_000);

  // ── Streak reminders ──────────────────────────────────────────────────────
  const streakUsers = await prisma.user.findMany({
    where: {
      bookingStreak: { gte: 2 },
      notifyStreakReminder: true,
      // Hasn't booked today
      OR: [
        { lastBookingDate: null },
        { lastBookingDate: { lt: todayStart } },
      ],
    },
    select: { email: true, name: true, bookingStreak: true },
  });

  let streakSent = 0;
  for (const user of streakUsers) {
    await sendStreakReminderEmail(user.email, user.name, user.bookingStreak).catch(() => {});
    streakSent++;
  }

  // ── Pass expiry reminders ─────────────────────────────────────────────────
  const expiringPasses = await prisma.pass.findMany({
    where: {
      status: "ACTIVE",
      validTo: { gte: now, lte: in48h },
      user: { notifyPassExpiry: true },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  let passExpirySent = 0;
  for (const pass of expiringPasses) {
    await sendPassExpiryEmail(
      pass.user.email,
      pass.user.name,
      pass.type,
      pass.validTo
    ).catch(() => {});
    passExpirySent++;
  }

  const result = { streakRemindersSent: streakSent, passExpirySent, ranAt: now.toISOString() };
  console.log("[cron] notifications:", result);
  return NextResponse.json(result);
}
