import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Called by Vercel Cron (or any scheduler) once per hour.
 * Marks any ISSUED ticket whose expiresAt is in the past as EXPIRED.
 * Also voids any AWAITING_PAYMENT tickets/passes older than 1 hour
 * (means the Stripe PaymentIntent was never completed).
 *
 * Protected by a secret header so random people can't call it.
 * Set CRON_SECRET in .env to any long random string.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);

  const [expiredTickets, voidedTickets, voidedPasses] = await Promise.all([
    // Mark ISSUED tickets that are past their expiresAt as EXPIRED
    prisma.ticket.updateMany({
      where: {
        status: "ISSUED",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    }),
    // Void AWAITING_PAYMENT tickets older than 1 hour (payment never came)
    prisma.ticket.updateMany({
      where: {
        status: "AWAITING_PAYMENT",
        createdAt: { lt: oneHourAgo },
      },
      data: { status: "VOID" },
    }),
    // Void AWAITING_PAYMENT passes older than 1 hour
    prisma.pass.updateMany({
      where: {
        status: "AWAITING_PAYMENT",
        createdAt: { lt: oneHourAgo },
      },
      data: { status: "VOID" },
    }),
  ]);

  const result = {
    expiredTickets: expiredTickets.count,
    voidedTickets: voidedTickets.count,
    voidedPasses: voidedPasses.count,
    ranAt: now.toISOString(),
  };

  console.log("[cron] ticket-expiry:", result);
  return NextResponse.json(result);
}
