/**
 * Central access rules (tested in access-policy.test.ts).
 * API routes and nav should use these helpers — do not duplicate checks ad hoc.
 */

/** Guest emails: guest-{id}@jopler.local — id from localStorage on client. */
const GUEST_EMAIL_RE = /^guest-[a-z0-9-]{1,64}@jopler\.local$/i;

export function isGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return GUEST_EMAIL_RE.test(email.trim());
}

/** Sanitize client-provided guest id (from localStorage UUID). */
export function sanitizeGuestId(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  return s.length > 0 ? s : null;
}

export function guestEmailFromId(id: string): string {
  return `guest-${id}@jopler.local`;
}

export type TeamAccessContext = {
  authenticated: boolean;
  isGuest: boolean;
  /** ENABLE_TEAM=true — only then Team API/page exist for non-guests (friends deployment). */
  teamDeploymentEnabled: boolean;
  /** Row in allowed_emails OR equivalent full member. */
  emailInAllowlist: boolean;
  isPrimaryAdmin: boolean;
};

/**
 * Team lists all allowlisted emails + progress — must never be available to guests
 * or on deployments where team is disabled (public / guest-only).
 */
export function canAccessTeamFeatures(ctx: TeamAccessContext): boolean {
  if (!ctx.authenticated) return false;
  if (ctx.isGuest) return false;
  if (!ctx.teamDeploymentEnabled) return false;
  return ctx.emailInAllowlist || ctx.isPrimaryAdmin;
}

export type BillableAiContext = {
  authenticated: boolean;
  isGuest: boolean;
};

/**
 * OpenAI / Gemini / TTS — guests must not trigger paid APIs (even if they guess URLs).
 */
export function canUseBillableAi(ctx: BillableAiContext): boolean {
  if (!ctx.authenticated) return false;
  if (ctx.isGuest) return false;
  return true;
}

export type AdminHeavyContext = {
  authenticated: boolean;
  isGuest: boolean;
  isSuperadmin: boolean;
  /** When true, only superadmin may parse / summary / bulk training generate. */
  restrictHeavyOpsToSuperadmin: boolean;
};

/** Parse jobs, generate all summaries, training bulk generate. */
export function canRunAdminHeavyOps(ctx: AdminHeavyContext): boolean {
  if (!ctx.authenticated) return false;
  if (ctx.isGuest) return false;
  if (ctx.restrictHeavyOpsToSuperadmin && !ctx.isSuperadmin) return false;
  return true;
}

export type TranscribeContext = {
  authenticated: boolean;
  isGuest: boolean;
  /** Within sliding window limit (enforced in route). */
  underRateLimit: boolean;
};

export function canUseTranscribe(ctx: TranscribeContext): boolean {
  if (!ctx.authenticated) return false;
  if (ctx.isGuest) return false;
  return ctx.underRateLimit;
}
