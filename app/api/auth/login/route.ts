import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 10 login attempts per minute per IP
  const ip = getClientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too_many_requests", message: "Too many login attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) } }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_fields", message: "email and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const match = bcrypt.compareSync(password, user.passwordHash);
  if (!match) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const newRefreshToken = signRefreshToken(user.id);
  const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60_000);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), refreshToken: newRefreshToken, refreshTokenExpiry: refreshExpiry },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      discountCategory: user.discountCategory,
      isVerified: user.isVerified,
    },
    accessToken,
    refreshToken: newRefreshToken,
  });
}
