import type { APIRequestContext, Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

export const DEFAULT_BASE = (process.env.BASE_URL || "http://localhost:3002").replace(/\/$/, "");

export const ROLE_MATRIX_SCREENSHOT_DIR = path.join("test-results", "role-matrix");

export function ensureScreenshotDir(): void {
  fs.mkdirSync(ROLE_MATRIX_SCREENSHOT_DIR, { recursive: true });
}

export async function shot(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(ROLE_MATRIX_SCREENSHOT_DIR, filename),
    fullPage: true,
  });
}

export type DebugAuthInfo = {
  allowGuestLogin?: boolean;
  allowDevEmails?: boolean;
  serverOk?: boolean;
};

export async function getDebugAuth(request: APIRequestContext): Promise<DebugAuthInfo> {
  const res = await request.get(`${DEFAULT_BASE}/api/debug-auth`);
  if (!res.ok) return { serverOk: false };
  const text = await res.text();
  try {
    return { serverOk: true, ...(JSON.parse(text) as Omit<DebugAuthInfo, "serverOk">) };
  } catch {
    return { serverOk: false };
  }
}

export type IsAdminPayload = {
  isSuperadmin?: boolean;
  isGuest?: boolean;
  canSeeTeam?: boolean;
  canRunHeavyOps?: boolean;
  canUseAi?: boolean;
};

export async function fetchIsAdmin(page: Page): Promise<IsAdminPayload> {
  return page.evaluate(async () => {
    const r = await fetch("/api/training/is-admin");
    if (!r.ok) return {};
    return r.json() as IsAdminPayload;
  });
}

export async function loginAsGuest(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Continue as guest/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25_000 });
}

export async function loginAsDev(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Dev login/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25_000 });
}
