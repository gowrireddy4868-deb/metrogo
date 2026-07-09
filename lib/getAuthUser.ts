import { NextRequest } from "next/server";
import { getTokenFromHeader, verifyAccessToken, AccessTokenPayload } from "./auth";

export function getAuthUser(req: NextRequest): AccessTokenPayload | null {
  const token = getTokenFromHeader(req.headers.get("authorization"));
  if (!token) return null;
  return verifyAccessToken(token);
}
