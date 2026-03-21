export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|login/redirect|api/auth|api/debug-auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
