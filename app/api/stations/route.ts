import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const city = req.nextUrl.searchParams.get("city");

  const stations = await prisma.station.findMany({
    where: {
      name: { contains: search },
      ...(city ? { city } : {}),
    },
    include: {
      lines: {
        include: { line: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = stations.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    zone: s.zone,
    lat: s.latitude,
    lng: s.longitude,
    lines: s.lines.map((ls) => ({
      id: ls.line.id,
      name: ls.line.name,
      colorHex: ls.line.colorHex,
    })),
  }));

  return NextResponse.json(result);
}
