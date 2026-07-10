import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyQrToken } from "@/lib/qrSigner";
import { calculateFare } from "@/lib/fareEngine";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

async function logAndRespond(
  entryId: string,
  gateId: string,
  gateType: "entry" | "exit",
  result: "success" | "fail",
  reason: string,
  gateAction: "open" | "deny",
  extra: Record<string, unknown> = {}
) {
  await prisma.validationLog.create({
    data: { ticketOrPassId: entryId, gateId, gateType, result, reason },
  });
  return NextResponse.json({ result, reason, gateAction, ...extra });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`validate:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_requests", message: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { qrToken, gateId, gateType, gateStationId } = body as {
    qrToken: string;
    gateId: string;
    gateType: "entry" | "exit";
    gateStationId?: string;
  };

  if (!qrToken || !gateId || !gateType) {
    return NextResponse.json(
      { error: "missing_fields", message: "qrToken, gateId, gateType required" },
      { status: 400 }
    );
  }

  const verification = verifyQrToken(qrToken);

  if (!verification.valid) {
    return NextResponse.json({
      result: "fail",
      reason: verification.reason,
      gateAction: "deny",
    });
  }

  const { payload } = verification;
  const now = new Date();

  if (new Date(payload.expiresAt) < now) {
    return logAndRespond(payload.id, gateId, gateType, "fail", "expired", "deny");
  }

  if (payload.kind === "PASS") {
    const pass = await prisma.pass.findUnique({ where: { id: payload.id } });
    if (!pass) {
      return logAndRespond(payload.id, gateId, gateType, "fail", "pass_not_found", "deny");
    }
    if (now < pass.validFrom || now > pass.validTo) {
      return logAndRespond(pass.id, gateId, gateType, "fail", "pass_not_in_validity_window", "deny");
    }
    const updated = await prisma.pass.update({
      where: { id: pass.id },
      data: { usageCount: { increment: 1 } },
    });
    return logAndRespond(pass.id, gateId, gateType, "success", "pass_valid", "open", {
      ticketStatus: "PASS_ACTIVE",
      usageCount: updated.usageCount,
    });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: payload.id } });
  if (!ticket) {
    return logAndRespond(payload.id, gateId, gateType, "fail", "ticket_not_found", "deny");
  }

  if (["REFUNDED", "VOID", "EXPIRED", "AWAITING_PAYMENT"].includes(ticket.status)) {
    return logAndRespond(
      ticket.id,
      gateId,
      gateType,
      "fail",
      `ticket_${ticket.status.toLowerCase()}`,
      "deny"
    );
  }

  if (gateType === "entry") {
    if (ticket.status !== "ISSUED") {
      return logAndRespond(
        ticket.id,
        gateId,
        gateType,
        "fail",
        ticket.status === "IN_TRANSIT" ? "already_in_transit" : "already_used",
        "deny"
      );
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "IN_TRANSIT",
        entryStationId: gateStationId || ticket.sourceStationId,
        entryTime: now,
      },
    });
    return logAndRespond(ticket.id, gateId, gateType, "success", "entry_granted", "open", {
      ticketStatus: updated.status,
    });
  }

  if (ticket.status !== "IN_TRANSIT") {
    return logAndRespond(
      ticket.id,
      gateId,
      gateType,
      "fail",
      ticket.status === "ISSUED" ? "no_entry_recorded" : "already_exited",
      "deny"
    );
  }

  const exitStationId = gateStationId || ticket.destStationId;
  const [entryStation, exitStation, fareRulesRaw, discountRulesRaw] = await Promise.all([
    ticket.entryStationId
      ? prisma.station.findUnique({ where: { id: ticket.entryStationId } })
      : null,
    prisma.station.findUnique({ where: { id: exitStationId } }),
    prisma.fareRule.findMany(),
    prisma.discountRule.findMany(),
  ]);
  const fareRules = fareRulesRaw.map((r) => ({ ...r, baseFare: Number(r.baseFare), peakMultiplier: Number(r.peakMultiplier) }));
  const discountRules = discountRulesRaw.map((r) => ({ ...r, discountPct: Number(r.discountPct) }));

  if (entryStation && exitStation) {
    const { fare: actualFare } = calculateFare(
      fareRules,
      discountRules,
      entryStation.zone,
      exitStation.zone,
      now
    );
    if (actualFare > Number(ticket.fareAmount) + 0.01) {
      return logAndRespond(ticket.id, gateId, gateType, "fail", "insufficient_fare", "deny", {
        fareShortfall: Math.round((actualFare - Number(ticket.fareAmount)) * 100) / 100,
      });
    }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "COMPLETED", exitTime: now },
  });

  return logAndRespond(ticket.id, gateId, gateType, "success", "exit_granted", "open", {
    ticketStatus: updated.status,
  });
}