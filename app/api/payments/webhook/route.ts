import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { signQrToken } from "@/lib/qrSigner";
import { calculateRewardPoints, calculateStreak } from "@/lib/rewards";
import { sendTicketConfirmationEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This webhook is the ONLY place a ticket or pass is actually marked paid
 * and issued a real QR code. The client confirming payment in the browser
 * is not trusted on its own — Stripe calling this endpoint with a verified
 * signature is the source of truth.
 *
 * Idempotency: if this fires twice for the same event (Stripe retries on
 * timeout), we check the Payment's current status before mutating anything.
 *
 * Handles two kinds of purchases via metadata.kind: "TICKET" or "PASS".
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured — rejecting webhook call.");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as {
      id: string;
      metadata: { kind?: string; id?: string; ticketId?: string };
    };
    // Support both the new {kind, id} metadata shape and the older
    // ticket-only {ticketId} shape, for backward compatibility.
    const kind = paymentIntent.metadata?.kind || (paymentIntent.metadata?.ticketId ? "TICKET" : null);
    const entityId = paymentIntent.metadata?.id || paymentIntent.metadata?.ticketId;

    if (!kind || !entityId) {
      return NextResponse.json({ received: true, note: "no kind/id in metadata" });
    }

    if (kind === "PASS") {
      const payment = await prisma.payment.findUnique({ where: { passId: entityId } });
      if (!payment || payment.status === "SUCCESS") {
        return NextResponse.json({ received: true, idempotent: true });
      }

      const pass = await prisma.pass.findUnique({
        where: { id: entityId },
        include: { user: true },
      });
      if (!pass) {
        return NextResponse.json({ received: true, note: "pass not found" });
      }

      const qrToken = signQrToken({
        id: pass.id,
        kind: "PASS",
        issuedAt: pass.validFrom.toISOString(),
        expiresAt: pass.validTo.toISOString(),
      });

      await prisma.$transaction([
        prisma.pass.update({ where: { id: pass.id }, data: { status: "ACTIVE", qrToken } }),
        prisma.payment.update({ where: { passId: entityId }, data: { status: "SUCCESS" } }),
      ]);

      return NextResponse.json({ received: true });
    }

    // kind === "TICKET"
    const payment = await prisma.payment.findUnique({ where: { ticketId: entityId } });
    if (!payment || payment.status === "SUCCESS") {
      return NextResponse.json({ received: true, idempotent: true });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: entityId },
      include: { sourceStation: true, destStation: true, user: true },
    });
    if (!ticket) {
      return NextResponse.json({ received: true, note: "ticket not found" });
    }

    const qrToken = signQrToken({
      id: ticket.id,
      kind: "TICKET",
      sourceStationId: ticket.sourceStationId,
      destStationId: ticket.destStationId,
      fare: Number(ticket.fareAmount),
      issuedAt: new Date().toISOString(),
      expiresAt: ticket.expiresAt.toISOString(),
    });

    await prisma.$transaction([
      prisma.ticket.update({ where: { id: ticket.id }, data: { status: "ISSUED", qrToken } }),
      prisma.payment.update({ where: { ticketId: entityId }, data: { status: "SUCCESS" } }),
    ]);

    if (ticket.user) {
      const rewardsEarned = calculateRewardPoints(Number(ticket.fareAmount));
      const streak = calculateStreak(ticket.user.bookingStreak, ticket.user.lastBookingDate, new Date());
      await prisma.user.update({
        where: { id: ticket.user.id },
        data: {
          rewardPoints: { increment: rewardsEarned },
          bookingStreak: streak,
          lastBookingDate: new Date(),
        },
      });
    }

    const recipientEmail = ticket.user?.email || ticket.guestEmail;
    if (recipientEmail) {
      sendTicketConfirmationEmail({
        to: recipientEmail,
        passengerName: ticket.user?.name || "Rider",
        fromStation: ticket.sourceStation.name,
        toStation: ticket.destStation.name,
        fare: Number(ticket.fareAmount),
        ticketId: ticket.id,
        expiresAt: ticket.expiresAt.toISOString(),
      }).catch((e) => console.error("Email send failed:", e));
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as {
      id: string;
      metadata: { kind?: string; id?: string; ticketId?: string };
    };
    const kind = paymentIntent.metadata?.kind || (paymentIntent.metadata?.ticketId ? "TICKET" : null);
    const entityId = paymentIntent.metadata?.id || paymentIntent.metadata?.ticketId;

    if (kind === "PASS" && entityId) {
      await prisma.payment.update({ where: { passId: entityId }, data: { status: "FAILED" } }).catch(() => {});
      await prisma.pass.update({ where: { id: entityId }, data: { status: "VOID" } }).catch(() => {});
    } else if (entityId) {
      await prisma.payment.update({ where: { ticketId: entityId }, data: { status: "FAILED" } }).catch(() => {});
      await prisma.ticket.update({ where: { id: entityId }, data: { status: "VOID" } }).catch(() => {});
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
