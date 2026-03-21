import { NextResponse } from "next/server";

export function GET() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3002";
  const env = {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: base,
    allowDevEmails: process.env.ALLOW_DEV_EMAILS === "true",
    redirectUri: `${base.replace(/\/$/, "")}/api/auth/callback/google`,
    fixHint: "Add redirectUri to Google Console → Credentials → OAuth client → Authorized redirect URIs",
  };
  return NextResponse.json(env);
}
