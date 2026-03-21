import { NextResponse } from "next/server";

const BASE = process.env.NEXTAUTH_URL || "http://localhost:3002";

export function GET() {
  const url = `${BASE}/api/auth/signin/google?callbackUrl=${encodeURIComponent(BASE + "/")}`;
  return NextResponse.redirect(url, 302);
}
