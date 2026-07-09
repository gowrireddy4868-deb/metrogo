import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const passes = await prisma.pass.findMany({
    where: { userId: authUser.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(passes);
}
