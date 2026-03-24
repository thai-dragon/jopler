# Jopler role matrix

Automated checks and screenshots: `npm run test:e2e:roles`  
Guest regression (landing `/jobs`, logo, no Mock nav): `npm run test:e2e:guest`  
If port `3002` is already in use: `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e:roles`  
Artifacts (gitignored): `test-results/role-matrix/*.png`  
You need a live `GET /api/debug-auth` (200); otherwise Guest/Dev scenarios are **skipped**.

Rules come from `lib/access-policy.ts`, `lib/config.ts` (`isSuperadmin`), `lib/authz.ts`, and flags `ENABLE_TEAM`, `IS_FOR_PUBLIC`, `ALLOW_GUEST_LOGIN`.

---

## Summary table

| Capability | Unauthenticated | Guest (`guest-*@jopler.local`) | Member (allowlisted / Google, not superadmin) | Superadmin (`PRIMARY_ADMIN_EMAIL` or `dev@localhost` on localhost) |
|------------|-----------------|----------------------------------|-----------------------------------------------|-----------------------------------------------------------------------|
| App entry | Redirect to `/login` | “Continue as guest” + stable id in `localStorage`; default **landing `/jobs`** (not parser home) | Google OAuth (or dev in dev mode) | Same; dev on localhost is superadmin when `NEXTAUTH_URL` contains `localhost` |
| Jobs, Summary, Training pages | After login — yes | Yes (same job list API as members) | Yes | Yes |
| Home: Parse / Summarize (heavy SSE) | No | No (`canRunHeavyOps`) | Yes if not `IS_FOR_PUBLIC` **or** superadmin when `IS_FOR_PUBLIC` | Yes (superadmin always passes `canRunAdminHeavyOps` when applicable) |
| Mock Interview (nav) | No | Hidden (`canUseAi` = false) | Yes | Yes |
| Team (nav and `/api/team`) | No | No (`403` / “not available” page) | Yes only if `ENABLE_TEAM=true` and email allowlisted (or primary admin) | Yes under the same Team rules |
| Paid AI (speak, transcribe, mock API, etc.) | No | **Blocked** (`canUseBillableAi`) | Yes | Yes |
| Training: check answer, Run code, ideal answer, sessions, per-question progress delete | No without session | Yes (signed-in guest) | Yes | Yes |
| Training: Clear unit (`/api/training/clear`) | No | Usually **no** (billable policy) | Policy-dependent | Policy-dependent |
| `/access` and `GET/POST/DELETE /api/access` | 401 (by code; 500 if DB error) | UI: “Superadmin only”; API **403** | UI: “Superadmin only”; API **403** | Full access |

---

## Playwright screenshots (`roles.spec.ts`)

| File | Role | Shows |
|------|------|--------|
| `01-unauthenticated-login.png` | Unauthenticated | Redirect to login screen |
| `02-guest-home.png` | Guest | After visiting `/` — usually **Jobs** (guest redirected from parser home); no Mock / Access |
| `03-guest-training.png` | Guest | Training |
| `04-guest-access-forbidden.png` | Guest | `/access` — superadmin only |
| `05-guest-team-forbidden.png` | Guest | Team not available |
| `06-dev-home.png` | Dev | Home with full nav (Mock + Access when superadmin) |
| `07-dev-access.png` | Dev | Access management page |

---

## Notes

- **Member without superadmin** is not emulated in E2E without a real Google account on the allowlist; table behavior is taken from code.
- **Guest** is not a single shared email: each browser has its own `jopler_guest_id` → `guest-{id}@jopler.local`.
- For Guest and Dev E2E in `.env`: `ALLOW_GUEST_LOGIN=true`, `ALLOW_DEV_EMAILS=true`.
