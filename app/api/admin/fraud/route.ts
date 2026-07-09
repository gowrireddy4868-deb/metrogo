import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

/**
 * Heuristic fraud signals computed from real validation log data:
 *  - Tickets/passes with repeated failed validation attempts (possible
 *    cloned QR, replay attempts, or tampering)
 *  - Invalid-signature attempts (someone presenting a forged/corrupted QR)
 *  - Replay attempts on already-used tickets (same ticket tried again
 *    after it already completed its journey)
 */
export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const failedLogs = await prisma.validationLog.findMany({
    where: { result: "fail" },
    orderBy: { createdAt: "desc" },
  });

  // Group fails by ticket/pass id
  const failCounts = new Map<string, { count: number; reasons: string[]; gateIds: Set<string> }>();
  for (const log of failedLogs) {
    const entry = failCounts.get(log.ticketOrPassId) || {
      count: 0,
      reasons: [],
      gateIds: new Set<string>(),
    };
    entry.count += 1;
    entry.reasons.push(log.reason || "unknown");
    entry.gateIds.add(log.gateId);
    failCounts.set(log.ticketOrPassId, entry);
  }

  const suspiciousIds = Array.from(failCounts.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);

  const ticketIds = suspiciousIds.map(([id]) => id);
  const relatedTickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    include: { sourceStation: true, destStation: true, user: { select: { name: true, email: true } } },
  });
  const ticketMap = new Map(relatedTickets.map((t: typeof relatedTickets[number]) => [t.id, t]));

  const suspiciousActivity = suspiciousIds.map(([id, v]) => ({
    ticketOrPassId: id,
    failCount: v.count,
    reasons: Array.from(new Set(v.reasons)),
    gateCount: v.gateIds.size,
    ticket: ticketMap.get(id)
      ? {
          route: `${ticketMap.get(id)!.sourceStation.name} → ${ticketMap.get(id)!.destStation.name}`,
          rider: ticketMap.get(id)!.user?.name || ticketMap.get(id)!.guestEmail || "Guest",
          status: ticketMap.get(id)!.status,
        }
      : null,
  }));

  const invalidSignatureCount = failedLogs.filter((l) => l.reason === "invalid_signature").length;
  const replayAttemptCount = failedLogs.filter((l) =>
    ["already_used", "already_in_transit", "already_exited"].includes(l.reason || "")
  ).length;
  const expiredAttemptCount = failedLogs.filter((l) => l.reason === "expired").length;

  return NextResponse.json({
    totalFailedValidations: failedLogs.length,
    invalidSignatureCount,
    replayAttemptCount,
    expiredAttemptCount,
    suspiciousActivity: suspiciousActivity.slice(0, 25),
  });
}
