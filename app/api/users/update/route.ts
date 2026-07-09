import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { name, phone, currentPassword, newPassword } = body;
  const updateData: Record<string, unknown> = {};

  if (name?.trim()) updateData.name = name.trim();
  if (phone?.trim()) updateData.phone = phone.trim();

  // Password change — verify current password first
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "current_password_required", message: "Enter your current password to set a new one." },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "weak_password", message: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "wrong_password", message: "Current password is incorrect." },
        { status: 401 }
      );
    }
    updateData.passwordHash = bcrypt.hashSync(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: authUser.userId },
    data: updateData,
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      rewardPoints: true, bookingStreak: true, createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
