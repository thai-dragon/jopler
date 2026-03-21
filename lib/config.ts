export function getPrimaryAdminEmail(): string {
  return process.env.PRIMARY_ADMIN_EMAIL ?? "";
}
