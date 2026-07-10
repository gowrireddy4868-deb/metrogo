import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { calculateFare } from "@/lib/fareEngine";
import { signQrToken } from "@/lib/qrSigner";
import { getAuthUser } from "@/lib/getAuthUser";
import { calculateRewardPoints, calculateStreak } from "@/lib/rewards";
import { sendTicketConfirmationEmail } from "@/lib/email";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { type, sourceStationId, destStationId, guestEmail, paymentMethod } = body as {
    type: "SINGLE" | "RETURN";
    sourceStationId: string;
    destStationId: string;
    guestEmail?: string;
    paymentMethod?: "CARD" | "UPI" | "WALLET";
  };

  if (!type || !sourceStationId || !destStationId) {
    return NextResponse.json(
      { error: "missing_fields", message: "type, sourceStationId, destStationId required" },
      { status: 400 }
    );
  }
  if (sourceStationId === destStationId) {
    return NextResponse.json({ error: "same_station" }, { status: 400 });
  }

  const [fromStation, toStation] = await Promise.all([
    prisma.station.findUnique({ where: { id: sourceStationId } }),
    prisma.station.findUnique({ where: { id: destStationId } }),
  ]);
  if (!fromStation || !toStation) {
    return NextResponse.json({ error: "station_not_found" }, { status: 404 });
  }

  const authUser = getAuthUser(req);
  let dbUser = null;
  if (authUser) {
    dbUser = await prisma.user.findUnique({ where: { id: authUser.userId } });
  }

  if (!dbUser && !guestEmail) {
    return NextResponse.json(
      { error: "auth_or_email_required", message: "Log in or provide a guest email" },
      { status: 401 }
    );
  }

  const now = new Date();
  const [fareRulesRaw, discountRulesRaw] = await Promise.all([
    prisma.fareRule.findMany(),
    prisma.discountRule.findMany(),
  ]);
  const fareRules = fareRulesRaw.map((r) => ({ ...r, baseFare: Number(r.baseFare), peakMultiplier: Number(r.peakMultiplier) }));
  const discountRules = discountRulesRaw.map((r) => ({ ...r, discountPct: Number(r.discountPct) }));

  const { fare } = calculateFare(
    fareRules,
    discountRules,
    fromStation.zone,
    toStation.zone,
    now,
    dbUser?.discountCategory,
    dbUser?.isVerified
  );

  const totalFare = type === "RETURN" ? Math.round(fare * 2 * 100) / 100 : fare;

  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + 12);

  const useRealStripe = paymentMethod === "CARD" && isStripeConfigured();

  if (useRealStripe) {
    const ticket = await prisma.ticket.create({
      data: {
        userId: dbUser?.id || null,
        guestEmail: dbUser ? null : guestEmail || null,
        type,
        sourceStationId,
        destStationId,
        fareAmount: totalFare,
        paymentMethod: "CARD",
        status: "AWAITING_PAYMENT",
        qrToken: `PENDING_${crypto.randomUUID()}`,
        expiresAt,
      },
    });

    const stripe = getStripe();
    const amountInPaise = Math.round(totalFare * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: "inr",
      metadata: { kind: "TICKET", id: ticket.id },
      receipt_email: dbUser?.email || guestEmail || undefined,
      automatic_payment_methods: { enabled: true },
    });

    await prisma.payment.create({
      data: {
        ticketId: ticket.id,
        amount: totalFare,
        gateway: "stripe",
        gatewayRefId: paymentIntent.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ticket,
      requiresPayment: true,
      clientSecret: paymentIntent.client_secret,
    });
  }

  const created = await prisma.ticket.create({
    data: {
      userId: dbUser?.id || null,
      guestEmail: dbUser ? null : guestEmail || null,
      type,
      sourceStationId,
      destStationId,
      fareAmount: totalFare,
      paymentMethod: paymentMethod || "CARD",
      status: "ISSUED",
      qrToken: `PENDING_${crypto.randomUUID()}`,
      expiresAt,
    },
  });

  const qrToken = signQrToken({
    id: created.id,
    kind: "TICKET",
    sourceStationId,
    destStationId,
    fare: totalFare,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const ticket = await prisma.ticket.update({
    where: { id: created.id },
    data: { qrToken },
    include: { sourceStation: true, destStation: true },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticket.id,
      amount: totalFare,
      gateway: `${paymentMethod || "CARD"}_mock`,
      gatewayRefId: `mock_${ticket.id}`,
      status: "SUCCESS",
    },
  });

  let rewardsEarned: number | null = null;
  let streak: number | null = null;
  if (dbUser) {
    rewardsEarned = calculateRewardPoints(totalFare);
    streak = calculateStreak(dbUser.bookingStreak, dbUser.lastBookingDate, now);
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        rewardPoints: { increment: rewardsEarned },
        bookingStreak: streak,
        lastBookingDate: now,
      },
    });
  }

  const recipientEmail = dbUser?.email || guestEmail;
  if (recipientEmail) {
    sendTicketConfirmationEmail({
      to: recipientEmail,
      passengerName: dbUser?.name || "Rider",
      fromStation: ticket.sourceStation.name,
      toStation: ticket.destStation.name,
      fare: totalFare,
      ticketId: ticket.id,
      expiresAt: ticket.expiresAt.toISOString(),
    }).catch((e) => console.error("Email send failed:", e));
  }

  return NextResponse.json({
    ticket,
    requiresPayment: false,
    paymentStatus: "SUCCESS_MOCK",
    rewardsEarned,
    streak,
  });
  } catch (err: any) {
    console.error("[tickets/purchase] Error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}