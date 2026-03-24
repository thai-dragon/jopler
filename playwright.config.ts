import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: process.env.BASE_URL || "http://localhost:3002",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
