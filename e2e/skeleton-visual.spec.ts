import { test } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/jobs", name: "jobs" },
  { path: "/summary", name: "summary" },
  { path: "/training", name: "training" },
  { path: "/team", name: "team" },
  { path: "/access", name: "access" },
  { path: "/login", name: "login" },
];

test.describe("Skeleton vs content screenshots", () => {
  for (const { path, name } of ROUTES) {
    test(`${name}: capture skeleton then content`, async ({ page }) => {
      const nav = page.goto(path, { waitUntil: "commit", timeout: 15000 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `test-results/${name}-skeleton.png` });
      await nav;
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.screenshot({ path: `test-results/${name}-content.png` });
    });
  }
});
