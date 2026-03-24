import { test, expect } from "@playwright/test";
import {
  ensureScreenshotDir,
  shot,
  getDebugAuth,
  fetchIsAdmin,
  loginAsGuest,
  loginAsDev,
} from "./helpers/role-matrix";

/**
 * Role matrix E2E: UI + /api/training/is-admin + selected API status codes.
 * Screenshots → test-results/role-matrix/ (see e2e/ROLE-MATRIX.md).
 *
 * Requires in jopler/.env for full coverage:
 * - NEXTAUTH_SECRET, Google or dev/guest providers
 * - ALLOW_GUEST_LOGIN=true (guest scenarios)
 * - ALLOW_DEV_EMAILS=true (dev superadmin on localhost)
 * - NEXTAUTH_URL containing localhost so dev@localhost is treated as superadmin (see lib/config.ts)
 */
test.describe("Role matrix", () => {
  test.describe.configure({ retries: 0 });
  test.skip(({ browserName }) => browserName !== "chromium", "Screenshots once per matrix (chromium)");

  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test("unauthenticated: redirect to login + screenshot", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(login|api\/auth\/signin)/);
    await shot(page, "01-unauthenticated-login.png");
  });

  test.describe("Guest", () => {
    test.beforeEach(async ({ page, context, request }) => {
      const d = await getDebugAuth(request);
      test.skip(d.serverOk !== true, "App must serve GET /api/debug-auth (200)");
      test.skip(!d.allowGuestLogin, "Set ALLOW_GUEST_LOGIN=true in .env");
      await context.clearCookies();
      await loginAsGuest(page);
    });

    test("flags, nav, Access forbidden, Team API 403, screenshots", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const flags = await fetchIsAdmin(page);
      expect(flags.isGuest).toBe(true);
      expect(flags.isSuperadmin).toBe(false);
      expect(flags.canUseAi).toBe(false);
      expect(flags.canSeeTeam).toBe(false);
      expect(flags.canRunHeavyOps).toBe(false);

      const nav = page.locator("nav");
      await expect(nav.getByRole("link", { name: "Mock Interview" })).toHaveCount(0);
      await expect(nav.getByRole("link", { name: "Access" })).toHaveCount(0);

      await shot(page, "02-guest-home.png");

      await page.goto("/training", { waitUntil: "networkidle" });
      await shot(page, "03-guest-training.png");

      await page.goto("/access", { waitUntil: "networkidle" });
      await expect(page.getByText(/Superadmin only/i)).toBeVisible();
      await shot(page, "04-guest-access-forbidden.png");

      await page.goto("/team", { waitUntil: "networkidle" });
      await expect(page.getByText(/not available for your account/i)).toBeVisible();
      await shot(page, "05-guest-team-forbidden.png");

      const teamApi = await page.request.get("/api/team");
      expect(teamApi.status()).toBe(403);

      const accessApi = await page.request.get("/api/access");
      expect(accessApi.status()).toBe(403);
    });
  });

  test.describe("Dev (localhost superadmin)", () => {
    test.beforeEach(async ({ page, context, request }) => {
      const d = await getDebugAuth(request);
      test.skip(d.serverOk !== true, "App must serve GET /api/debug-auth (200)");
      test.skip(!d.allowDevEmails, "Set ALLOW_DEV_EMAILS=true in .env");
      await context.clearCookies();
      await loginAsDev(page);
    });

    test("superadmin flags, Access link, /api/access OK, screenshots", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const flags = await fetchIsAdmin(page);
      expect(flags.isGuest).toBe(false);
      expect(flags.canUseAi).toBe(true);

      const nav = page.locator("nav");
      await expect(nav.getByRole("link", { name: "Mock Interview" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Access" })).toBeVisible();

      if (flags.isSuperadmin === true) {
        const accessApi = await page.request.get("/api/access");
        expect(accessApi.status()).toBe(200);
      }

      await shot(page, "06-dev-home.png");

      await page.goto("/access", { waitUntil: "networkidle" });
      await expect(page.getByText(/Superadmin only/i)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Access" })).toBeVisible();
      await shot(page, "07-dev-access.png");
    });
  });
});
