import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const pageSize = 25;

  const [total, logs] = await Promise.all([
    prisma.validationLog.count(),
    prisma.validationLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const ticketIds = Array.from(new Set(logs.map((l: typeof logs[number]) => l.ticketOrPassId)));
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ticketIds } },
    include: { sourceStation: true, destStation: true },
  });
  const ticketMap = new Map(tickets.map((t: typeof tickets[number]) => [t.id, t]));

  const enriched = logs.map((log: typeof logs[number]) => {
    const ticket = ticketMap.get(log.ticketOrPassId);
    return {
      ...log,
      route: ticket ? `${ticket.sourceStation.name} → ${ticket.destStation.name}` : null,
    };
  });

  return NextResponse.json({
    logs: enriched,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
