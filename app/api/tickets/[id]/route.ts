import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { sourceStation: true, destStation: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(ticket);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (ticket.userId !== authUser.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (ticket.status !== "ISSUED") {
    return NextResponse.json(
      { status: "ineligible", reason: "Only unused tickets can be refunded" },
      { status: 409 }
    );
  }
  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: "REFUNDED" },
  });
  return NextResponse.json({ status: "refunded", ticket: updated });
}
