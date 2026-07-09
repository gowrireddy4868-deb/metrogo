import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_requests", message: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const { name, email, password, phone } = body || {};

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "missing_fields", message: "Name, email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "weak_password", message: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "email_taken", message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const emailVerifyToken = crypto.randomBytes(32).toString("hex");
  const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60_000);

  // Your email automatically gets ADMIN role
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "gowrireddy4868@gmail.com";
  const role = email === ADMIN_EMAIL ? "ADMIN" : "RIDER";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role,
      emailVerified: false,
      emailVerifyToken,
      emailVerifyExpiry,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${emailVerifyToken}`;
  sendVerificationEmail({ to: email, name, verifyUrl }).catch((e) =>
    console.error("Verification email failed:", e)
  );

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken,
      refreshTokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    },
  });

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    message: "Account created! Check your email to verify your address.",
  });
}
