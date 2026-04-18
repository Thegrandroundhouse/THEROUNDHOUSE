/**
 * Production flags (read from env at runtime on server; public flag baked for client).
 */
export function isAdminRegisterDisabled(): boolean {
  const v =
    process.env.DISABLE_ADMIN_REGISTER ||
    process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER ||
    "";
  return v === "1" || v.toLowerCase() === "true";
}
