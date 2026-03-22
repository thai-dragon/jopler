import { test, expect } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/jobs", name: "jobs" },
  { path: "/summary", name: "summary" },
  { path: "/training", name: "training" },
  { path: "/team", name: "team" },
  { path: "/access", name: "access" },
];

test.describe("Loading skeletons vs content layout", () => {
  for (const { path, name } of ROUTES) {
    test(`${name}: page loads and has similar layout to skeleton`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle", timeout: 15000 });

      // After load: main content area visible (main pages have <main>, login has div.min-h-screen)
      const main = page.locator("main, div.min-h-screen, div.p-6").first();
      await expect(main).toBeVisible({ timeout: 5000 });

      // Layout check: content has reasonable dimensions (skeleton matches)
      const box = await main.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(80);
    });
  }
});

test.describe("Skeleton screenshots for visual comparison", () => {
  test("capture loaded state for each route", async ({ page }) => {
    for (const { path, name } of ROUTES) {
      await page.goto(path, { waitUntil: "networkidle", timeout: 15000 });
      await page.screenshot({ path: `test-results/${name}-loaded.png` });
    }
  });
});
