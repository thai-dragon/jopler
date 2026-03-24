import { describe, it, expect } from "vitest";
import {
  isGuestEmail,
  sanitizeGuestId,
  guestEmailFromId,
  canAccessTeamFeatures,
  canUseBillableAi,
  canRunAdminHeavyOps,
  canUseTranscribe,
} from "./access-policy";

describe("isGuestEmail", () => {
  it("identifies per-device guest emails", () => {
    expect(isGuestEmail("guest-abc-123@jopler.local")).toBe(true);
    expect(isGuestEmail("GUEST-UUID@Jopler.local")).toBe(true);
    expect(isGuestEmail(guestEmailFromId("550e8400-e29b-41d4-a716-446655440000"))).toBe(true);
  });
  it("legacy single guest address is not matched", () => {
    expect(isGuestEmail("guest@jopler.local")).toBe(false);
  });
  it("full members are not guests", () => {
    expect(isGuestEmail("alice@company.com")).toBe(false);
    expect(isGuestEmail(null)).toBe(false);
    expect(isGuestEmail(undefined)).toBe(false);
  });
});

describe("sanitizeGuestId", () => {
  it("strips unsafe chars and caps length", () => {
    expect(sanitizeGuestId("550e8400-e29b-41d4-a716-446655440000")).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(sanitizeGuestId("a<b>")).toBe("ab");
    expect(sanitizeGuestId("")).toBe(null);
  });
});

describe("canAccessTeamFeatures — no data leak to guests or wrong deploy", () => {
  it("401-equivalent: not authenticated", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: false,
        isGuest: false,
        teamDeploymentEnabled: true,
        emailInAllowlist: true,
        isPrimaryAdmin: false,
      }),
    ).toBe(false);
  });

  it("guest never sees Team even if team flag on and fake allowlist", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: true,
        isGuest: true,
        teamDeploymentEnabled: true,
        emailInAllowlist: true,
        isPrimaryAdmin: false,
      }),
    ).toBe(false);
  });

  it("full member cannot access Team when deployment disables team (public mode)", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: true,
        isGuest: false,
        teamDeploymentEnabled: false,
        emailInAllowlist: true,
        isPrimaryAdmin: false,
      }),
    ).toBe(false);
  });

  it("allowlisted user can access Team when team deployment enabled", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: true,
        isGuest: false,
        teamDeploymentEnabled: true,
        emailInAllowlist: true,
        isPrimaryAdmin: false,
      }),
    ).toBe(true);
  });

  it("primary admin can access Team when enabled (even if not duplicated in allowlist row)", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: true,
        isGuest: false,
        teamDeploymentEnabled: true,
        emailInAllowlist: false,
        isPrimaryAdmin: true,
      }),
    ).toBe(true);
  });

  it("random Google user not in list cannot access Team", () => {
    expect(
      canAccessTeamFeatures({
        authenticated: true,
        isGuest: false,
        teamDeploymentEnabled: true,
        emailInAllowlist: false,
        isPrimaryAdmin: false,
      }),
    ).toBe(false);
  });
});

describe("canUseBillableAi — guests cannot burn API budget", () => {
  it("unauthenticated blocked", () => {
    expect(canUseBillableAi({ authenticated: false, isGuest: false })).toBe(false);
  });
  it("guest blocked even if authenticated session", () => {
    expect(canUseBillableAi({ authenticated: true, isGuest: true })).toBe(false);
  });
  it("full member allowed", () => {
    expect(canUseBillableAi({ authenticated: true, isGuest: false })).toBe(true);
  });
});

describe("canRunAdminHeavyOps — parse / summary / bulk generate", () => {
  it("guest blocked", () => {
    expect(
      canRunAdminHeavyOps({
        authenticated: true,
        isGuest: true,
        isSuperadmin: false,
        restrictHeavyOpsToSuperadmin: false,
      }),
    ).toBe(false);
  });
  it("when restricted, only superadmin", () => {
    expect(
      canRunAdminHeavyOps({
        authenticated: true,
        isGuest: false,
        isSuperadmin: false,
        restrictHeavyOpsToSuperadmin: true,
      }),
    ).toBe(false);
    expect(
      canRunAdminHeavyOps({
        authenticated: true,
        isGuest: false,
        isSuperadmin: true,
        restrictHeavyOpsToSuperadmin: true,
      }),
    ).toBe(true);
  });
  it("when not restricted, any non-guest authenticated user", () => {
    expect(
      canRunAdminHeavyOps({
        authenticated: true,
        isGuest: false,
        isSuperadmin: false,
        restrictHeavyOpsToSuperadmin: false,
      }),
    ).toBe(true);
  });
});

describe("canUseTranscribe — guest off + rate limit", () => {
  it("guest blocked", () => {
    expect(
      canUseTranscribe({ authenticated: true, isGuest: true, underRateLimit: true }),
    ).toBe(false);
  });
  it("over limit blocked", () => {
    expect(
      canUseTranscribe({ authenticated: true, isGuest: false, underRateLimit: false }),
    ).toBe(false);
  });
  it("member under limit ok", () => {
    expect(
      canUseTranscribe({ authenticated: true, isGuest: false, underRateLimit: true }),
    ).toBe(true);
  });
});
