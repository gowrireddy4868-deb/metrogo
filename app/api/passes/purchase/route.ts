import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PASS_PRICES, passValidityWindow } from "@/lib/fareEngine";
import { signQrToken } from "@/lib/qrSigner";
import { getAuthUser } from "@/lib/getAuthUser";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const type = body?.type as "DAY" | "WEEK" | "MONTH";
  const paymentMethod = (body?.paymentMethod as "CARD" | "UPI" | "WALLET") || "CARD";
  if (!type || !PASS_PRICES[type]) {
    return NextResponse.json({ error: "invalid_pass_type" }, { status: 400 });
  }

  const price = PASS_PRICES[type];
  const now = new Date();
  const { validFrom, validTo } = passValidityWindow(type, now);

  const useRealStripe = paymentMethod === "CARD" && isStripeConfigured();

  // ---- Real payment path: Stripe (card only, test mode) ----
  if (useRealStripe) {
    const pass = await prisma.pass.create({
      data: {
        userId: authUser.userId,
        type,
        status: "AWAITING_PAYMENT",
        validFrom,
        validTo,
        qrToken: `PENDING_${crypto.randomUUID()}`,
      },
    });

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100),
      currency: "inr",
      metadata: { kind: "PASS", id: pass.id },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.payment.create({
      data: {
        passId: pass.id,
        amount: price,
        gateway: "stripe",
        gatewayRefId: paymentIntent.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      pass,
      price,
      requiresPayment: true,
      clientSecret: paymentIntent.client_secret,
    });
  }

  // ---- Mock path: UPI / Wallet, or Card with no Stripe keys configured ----
  const created = await prisma.pass.create({
    data: {
      userId: authUser.userId,
      type,
      status: "ACTIVE",
      validFrom,
      validTo,
      qrToken: `PENDING_${crypto.randomUUID()}`,
    },
  });

  const qrToken = signQrToken({
    id: created.id,
    kind: "PASS",
    issuedAt: validFrom.toISOString(),
    expiresAt: validTo.toISOString(),
  });

  const pass = await prisma.pass.update({
    where: { id: created.id },
    data: { qrToken },
  });

  await prisma.payment.create({
    data: {
      passId: pass.id,
      amount: price,
      gateway: `${paymentMethod}_mock`,
      gatewayRefId: `mock_${pass.id}`,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({ pass, price, requiresPayment: false, paymentStatus: "SUCCESS_MOCK" });
  } catch (err: any) {
    console.error("[passes/purchase] Error:", err);
    return NextResponse.json(
      { error: "internal_error", message: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
