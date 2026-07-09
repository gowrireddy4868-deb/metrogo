import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStreakReminderEmail, sendPassExpiryEmail } from "@/lib/email";

/**
 * Called once per day by Vercel Cron (schedule: 0 18 * * * = 6pm daily).
 * Sends two kinds of notifications:
 *  1. Streak reminders — riders with an active streak who haven't booked today
 *  2. Pass expiry alerts — riders whose pass expires within the next 48 hours
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

  // ---- Streak reminders ----
  const streakUsers = await prisma.user.findMany({
    where: {
      notifyStreakReminder: true,
      bookingStreak: { gt: 1 },
      // Has not booked today
      lastBookingDate: { lt: todayStart },
    },
    select: { id: true, name: true, email: true, bookingStreak: true },
  });

  let streakEmailsSent = 0;
  for (const user of streakUsers) {
    try {
      await sendStreakReminderEmail(user.email, user.name, user.bookingStreak);
      streakEmailsSent++;
    } catch (e) {
      console.error(`Streak reminder failed for ${user.email}:`, e);
    }
  }

  // ---- Pass expiry alerts ----
  const expiringPasses = await prisma.pass.findMany({
    where: {
      status: "ACTIVE",
      validTo: { gte: now, lte: in48h },
      user: { notifyPassExpiry: true },
    },
    include: { user: { select: { name: true, email: true } } },
  });

  let passEmailsSent = 0;
  for (const pass of expiringPasses) {
    try {
      await sendPassExpiryEmail(pass.user.email, pass.user.name, pass.type, pass.validTo);
      passEmailsSent++;
    } catch (e) {
      console.error(`Pass expiry email failed for ${pass.user.email}:`, e);
    }
  }

  const result = { streakEmailsSent, passEmailsSent, ranAt: now.toISOString() };
  console.log("[cron] notifications:", result);
  return NextResponse.json(result);
}
