import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tickets = await prisma.ticket.findMany({
    where: { userId: authUser.userId },
    include: { sourceStation: true, destStation: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tickets);
}
