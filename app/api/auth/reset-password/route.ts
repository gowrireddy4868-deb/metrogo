import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));

  if (!token || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "weak_password", message: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

  if (!user) {
    return NextResponse.json(
      { error: "invalid_token", message: "This reset link is invalid or already used." },
      { status: 400 }
    );
  }

  if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
    return NextResponse.json(
      { error: "expired_token", message: "This link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: bcrypt.hashSync(password, 10),
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return NextResponse.json({ success: true, message: "Password reset successfully. You can now log in." });
}
