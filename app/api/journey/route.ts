import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateFare } from "@/lib/fareEngine";
import { findRoute } from "@/lib/routeFinder";
import { getTokenFromHeader, verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const departureParam = req.nextUrl.searchParams.get("departureTime");

  if (!from || !to) {
    return NextResponse.json(
      { error: "missing_params", message: "from and to station ids are required" },
      { status: 400 }
    );
  }

  const [fromStation, toStation] = await Promise.all([
    prisma.station.findUnique({ where: { id: from } }),
    prisma.station.findUnique({ where: { id: to } }),
  ]);

  if (!fromStation || !toStation) {
    return NextResponse.json({ error: "station_not_found" }, { status: 404 });
  }

  if (from === to) {
    return NextResponse.json(
      { error: "same_station", message: "Source and destination cannot be the same" },
      { status: 400 }
    );
  }

  const departureTime = departureParam ? new Date(departureParam) : new Date();

  const lines = await prisma.line.findMany({
    include: { stations: { select: { stationId: true, sequence: true } } },
  });

  const route = findRoute(lines, from, to);
  if (!route) {
    return NextResponse.json({ error: "no_route_found" }, { status: 404 });
  }

  let discountCategory: string | null = null;
  let isVerified = false;
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user) {
        discountCategory = user.discountCategory;
        isVerified = user.isVerified;
      }
    }
  }

  const [fareRulesRaw, discountRulesRaw] = await Promise.all([
    prisma.fareRule.findMany(),
    prisma.discountRule.findMany(),
  ]);

  const fareRules = fareRulesRaw.map((r) => ({
    ...r,
    baseFare: Number(r.baseFare),
    peakMultiplier: Number(r.peakMultiplier),
  }));
  const discountRules = discountRulesRaw.map((r) => ({
    ...r,
    discountPct: Number(r.discountPct),
  }));

  const { fare, peakApplied, baseFare } = calculateFare(
    fareRules,
    discountRules,
    fromStation.zone,
    toStation.zone,
    departureTime,
    discountCategory,
    isVerified
  );

  const estimatedMinutes = route.stopCount * 3 + route.interchanges.length * 5;

  const stationsInRoute = await prisma.station.findMany({
    where: { id: { in: route.stationIds } },
  });
  const stationMap = new Map(stationsInRoute.map((s: { id: string }) => [s.id, s]));

  return NextResponse.json({
    fromStation,
    toStation,
    fare,
    baseFare,
    peakApplied,
    estimatedMinutes,
    stopCount: route.stopCount,
    interchangeCount: route.interchanges.length,
    route: route.stationIds.map((id) => stationMap.get(id)),
    lineSegments: route.lineSegments,
  });
}