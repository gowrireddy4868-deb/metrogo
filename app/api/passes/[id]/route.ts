import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pass = await prisma.pass.findUnique({ where: { id } });
  if (!pass) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (pass.userId !== authUser.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(pass);
}
