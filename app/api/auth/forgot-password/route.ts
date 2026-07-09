import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 3 requests per 15 minutes per IP
  const ip = getClientIp(req);
  const rl = rateLimit(`forgot-pw:${ip}`, 3, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_requests", message: "Too many attempts. Wait 15 minutes." },
      { status: 429 }
    );
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — never reveal whether the email exists
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60_000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  sendPasswordResetEmail({ to: email, name: user.name, resetUrl }).catch((e) =>
    console.error("Password reset email failed:", e)
  );

  return NextResponse.json({ success: true });
}
