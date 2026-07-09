import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    totalStations,
    totalLines,
    totalUsers,
    totalTickets,
    totalPasses,
    ticketsGrouped,
    revenueTickets,
    recentValidationLogs,
    stations,
    lines,
    fareRules,
    users,
    activeUsers,
    recentTickets,
    bookingsByStation,
  ] = await Promise.all([
    prisma.station.count(),
    prisma.line.count(),
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.pass.count(),
    prisma.ticket.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.ticket.findMany({
      where: { status: { in: ["COMPLETED", "IN_TRANSIT", "ISSUED"] } },
      select: { fareAmount: true },
    }),
    prisma.validationLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.station.findMany({ orderBy: { name: "asc" } }),
    prisma.line.findMany(),
    prisma.fareRule.findMany(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, discountCategory: true, isVerified: true },
    }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true, fareAmount: true },
    }),
    prisma.ticket.groupBy({
      by: ["sourceStationId"],
      _count: { sourceStationId: true },
      orderBy: { _count: { sourceStationId: "desc" } },
      take: 8,
    }),
  ]);

  const ticketsByStatus: Record<string, number> = {};
  for (const g of ticketsGrouped) {
    ticketsByStatus[g.status] = g._count.status;
  }

  const revenue = revenueTickets.reduce(
    (sum: number, t: { fareAmount: unknown }) => sum + Number(t.fareAmount),
    0
  );

  // Revenue + booking count by day, last 14 days (zero-filled for days with no bookings)
  const revenueByDay: { date: string; revenue: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dateKey = day.toISOString().slice(0, 10);
    const dayTickets = recentTickets.filter(
      (t: { createdAt: Date }) => t.createdAt.toISOString().slice(0, 10) === dateKey
    );
    revenueByDay.push({
      date: dateKey,
      revenue: Math.round(
        dayTickets.reduce((s: number, t: { fareAmount: unknown }) => s + Number(t.fareAmount), 0) * 100
      ) / 100,
      count: dayTickets.length,
    });
  }

  const stationMap = new Map(stations.map((s: { id: string; name: string }) => [s.id, s.name]));
  const stationWiseBookings = bookingsByStation.map(
    (b: { sourceStationId: string; _count: { sourceStationId: number } }) => ({
      stationId: b.sourceStationId,
      stationName: stationMap.get(b.sourceStationId) || "Unknown",
      count: b._count.sourceStationId,
    })
  );

  return NextResponse.json({
    totalStations,
    totalLines,
    totalUsers,
    totalTickets,
    totalPasses,
    activeUsers,
    ticketsByStatus,
    revenue: Math.round(revenue * 100) / 100,
    revenueByDay,
    stationWiseBookings,
    recentValidationLogs,
    stations,
    lines,
    fareRules,
    users,
  });
}
