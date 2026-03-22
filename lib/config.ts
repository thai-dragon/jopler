export function getPrimaryAdminEmail(): string {
  return process.env.PRIMARY_ADMIN_EMAIL ?? "";
}

export function isSuperadmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const primaryAdmin = getPrimaryAdminEmail().trim().toLowerCase();
  if (primaryAdmin && email.toLowerCase() === primaryAdmin) return true;
  const isLocalhost =
    (process.env.NEXTAUTH_URL || "").includes("localhost") ||
    (process.env.VERCEL_URL || "").includes("localhost");
  if (isLocalhost && email.toLowerCase() === "dev@localhost") return true;
  return false;
}
