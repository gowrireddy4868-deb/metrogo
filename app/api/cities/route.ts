import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stations = await prisma.station.findMany({ select: { city: true } });
  const cities = Array.from(new Set(stations.map((s) => s.city))).sort();
  return NextResponse.json(cities);
}
