import { test, expect } from "@playwright/test";
import { getDebugAuth, loginAsGuest } from "./helpers/role-matrix";

/**
 * Regression guards for guest UX (no manual clicking).
 * Run: npx playwright test e2e/guest-behavior.spec.ts --project=chromium
 */
test.describe("Guest behavior", () => {
  test.describe.configure({ retries: 0 });
  test.skip(({ browserName }) => browserName !== "chromium");

  test.beforeEach(async ({ page, context, request }) => {
    const d = await getDebugAuth(request);
    test.skip(d.serverOk !== true, "GET /api/debug-auth must return 200");
    test.skip(!d.allowGuestLogin, "ALLOW_GUEST_LOGIN=true in .env");
    await context.clearCookies();
    await loginAsGuest(page);
  });

  test("GET /api/jobs returns same data shape for guest (non-empty allowed)", async ({ page }) => {
    const res = await page.request.get("/api/jobs");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("guest lands on /jobs after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/jobs\/?$/);
  });

  test("opening / sends guest to /jobs", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/jobs\/?$/);
  });

  test("Jopler logo points to /jobs and navigates there", async ({ page }) => {
    await page.goto("/training", { waitUntil: "networkidle" });
    const logo = page.locator("nav").getByRole("link", { name: "Jopler" });
    await expect(logo).toHaveAttribute("href", "/jobs");
    await logo.click();
    await expect(page).toHaveURL(/\/jobs\/?$/);
  });

  test("Mock Interview never appears in nav (after is-admin)", async ({ page }) => {
    const admin = page.waitForResponse(
      (r) => r.url().includes("/api/training/is-admin") && r.status() === 200,
    );
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await admin;
    await expect(page.locator("nav").getByRole("link", { name: "Mock Interview" })).toHaveCount(0);
  });
});
