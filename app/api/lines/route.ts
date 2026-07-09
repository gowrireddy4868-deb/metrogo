import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const lines = await prisma.line.findMany({
    include: {
      stations: {
        include: { station: true },
        orderBy: { sequence: "asc" },
      },
    },
  });

  const result = lines.map((line) => ({
    id: line.id,
    name: line.name,
    colorHex: line.colorHex,
    stations: line.stations.map((ls) => ls.station),
  }));

  return NextResponse.json(result);
}
