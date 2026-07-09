import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") || "tickets";

  let rows: Record<string, unknown>[] = [];
  let filename = "export.csv";

  if (type === "tickets") {
    const tickets = await prisma.ticket.findMany({
      include: { sourceStation: true, destStation: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    rows = tickets.map((t: typeof tickets[number]) => ({
      id: t.id,
      rider: t.user?.email || t.guestEmail || "guest",
      from: t.sourceStation.name,
      to: t.destStation.name,
      type: t.type,
      fare: Number(t.fareAmount),
      paymentMethod: t.paymentMethod,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
    filename = "tickets_export.csv";
  } else if (type === "validations") {
    const logs = await prisma.validationLog.findMany({ orderBy: { createdAt: "desc" } });
    rows = logs.map((l: typeof logs[number]) => ({
      id: l.id,
      ticketOrPassId: l.ticketOrPassId,
      gateId: l.gateId,
      gateType: l.gateType,
      result: l.result,
      reason: l.reason || "",
      createdAt: l.createdAt.toISOString(),
    }));
    filename = "validations_export.csv";
  } else if (type === "users") {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rewardPoints: true,
        bookingStreak: true,
        createdAt: true,
      },
    });
    rows = users.map((u: typeof users[number]) => ({ ...u, createdAt: u.createdAt.toISOString() }));
    filename = "users_export.csv";
  } else {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
