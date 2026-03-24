import type { Session } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { allowedEmails } from "./schema";
import {
  isGuestEmail,
  canAccessTeamFeatures,
  canUseBillableAi,
  canRunAdminHeavyOps,
  canUseTranscribe,
} from "./access-policy";
import { getPrimaryAdminEmail, isForPublic, isSuperadmin, teamDeploymentEnabled } from "./config";

function forbidden(): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function sessionIsGuest(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.isGuest === true) return true;
  return isGuestEmail(session.user.email);
}

export async function emailInAllowlist(email: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email.toLowerCase()))
    .limit(1);
  return rows.length > 0;
}

export async function requireTeamAccess(session: Session | null): Promise<Response | null> {
  const email = session?.user?.email ?? null;
  if (!email) return unauthorized();
  const guest = sessionIsGuest(session);
  const inList = await emailInAllowlist(email);
  const primary =
    getPrimaryAdminEmail().trim().toLowerCase() !== "" &&
    email.toLowerCase() === getPrimaryAdminEmail().trim().toLowerCase();
  const ok = canAccessTeamFeatures({
    authenticated: true,
    isGuest: guest,
    teamDeploymentEnabled: teamDeploymentEnabled(),
    emailInAllowlist: inList,
    isPrimaryAdmin: primary,
  });
  if (!ok) return forbidden();
  return null;
}

/** Any signed-in user (including guest with per-device email). */
export function requireAuthenticated(session: Session | null): Response | null {
  if (!session?.user?.email) return unauthorized();
  return null;
}

export function requireBillableAi(session: Session | null): Response | null {
  const email = session?.user?.email ?? null;
  if (!email) return unauthorized();
  const ok = canUseBillableAi({
    authenticated: true,
    isGuest: sessionIsGuest(session),
  });
  if (!ok) return forbidden();
  return null;
}

export function requireAdminHeavyOps(session: Session | null): Response | null {
  const email = session?.user?.email ?? null;
  if (!email) return unauthorized();
  const ok = canRunAdminHeavyOps({
    authenticated: true,
    isGuest: sessionIsGuest(session),
    isSuperadmin: isSuperadmin(email),
    restrictHeavyOpsToSuperadmin: isForPublic(),
  });
  if (!ok) return forbidden();
  return null;
}

const transcribeBuckets = new Map<string, number[]>();
const TRANSCRIBE_LIMIT = 5;
const TRANSCRIBE_WINDOW_MS = 60_000;

export function recordTranscribeHit(email: string): void {
  const now = Date.now();
  const arr = (transcribeBuckets.get(email) || []).filter((t) => now - t < TRANSCRIBE_WINDOW_MS);
  arr.push(now);
  transcribeBuckets.set(email, arr);
}

export function transcribeUnderRateLimit(email: string): boolean {
  const now = Date.now();
  const arr = (transcribeBuckets.get(email) || []).filter((t) => now - t < TRANSCRIBE_WINDOW_MS);
  return arr.length < TRANSCRIBE_LIMIT;
}

export function requireTranscribe(session: Session | null): Response | null {
  const email = session?.user?.email ?? null;
  if (!email) return unauthorized();
  const guest = sessionIsGuest(session);
  const ok = canUseTranscribe({
    authenticated: true,
    isGuest: guest,
    underRateLimit: transcribeUnderRateLimit(email),
  });
  if (!ok) {
    if (guest || !canUseBillableAi({ authenticated: true, isGuest: guest })) return forbidden();
    return new Response(JSON.stringify({ error: "Too many requests. Try again in a minute." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
