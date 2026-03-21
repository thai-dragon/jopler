import { NextResponse } from "next/server";

export function GET() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3002";
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const env = {
    hasGoogleClientId: !!clientId,
    googleClientIdPrefix: clientId.substring(0, 20),
    googleClientIdSuffix: clientId.substring(clientId.length - 10),
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleSecretLength: (process.env.GOOGLE_CLIENT_SECRET || "").length,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: base,
    allowDevEmails: process.env.ALLOW_DEV_EMAILS === "true",
    redirectUri: `${base.replace(/\/$/, "")}/api/auth/callback/google`,
  };
  return NextResponse.json(env);
}
