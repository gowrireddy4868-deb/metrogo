import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json().catch(() => ({}));
  if (!refreshToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.refreshToken !== refreshToken) {
    // Token rotation — if the stored token doesn't match, it may have been stolen
    // and already rotated. Invalidate all sessions for this user.
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null, refreshTokenExpiry: null },
      });
    }
    return NextResponse.json({ error: "token_reuse_detected" }, { status: 401 });
  }

  if (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date()) {
    return NextResponse.json({ error: "token_expired" }, { status: 401 });
  }

  // Rotate: issue a brand-new refresh token and invalidate the old one
  const newRefreshToken = signRefreshToken(user.id);
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60_000);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken, refreshTokenExpiry: newExpiry },
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  return NextResponse.json({
    token: accessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
