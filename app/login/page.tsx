"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const [mounted, setMounted] = useState(false);
  const [devLoginAvailable, setDevLoginAvailable] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetch("/api/debug-auth")
      .then((r) => r.json())
      .then((d) => setDevLoginAvailable(d.allowDevEmails === true))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950" suppressHydrationWarning>
      {!mounted ? (
        <span className="text-gray-500" suppressHydrationWarning>Loading...</span>
      ) : (
      <>
      <div className="w-full max-w-sm" suppressHydrationWarning>
        <div className="text-center mb-8" suppressHydrationWarning>
          <h1 className="text-4xl font-bold text-white tracking-tight" suppressHydrationWarning>Jopler</h1>
          <p className="text-gray-500 mt-2 text-sm" suppressHydrationWarning>Job parser, market analysis & interview training</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8" suppressHydrationWarning>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400 space-y-2">
              {error === "AccessDenied"
                ? "Your email is not in the access list. Contact the admin."
                : error === "Configuration"
                ? "NextAuth misconfigured: missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXTAUTH_SECRET in jopler/.env"
                : error === "google"
                ? (
                  <>
                    <p className="font-medium">Google OAuth failed (often redirect_uri_mismatch)</p>
                    <p>Add in Google Cloud Console → Credentials → OAuth client:</p>
                    <p className="text-xs mt-1">Authorized redirect URIs: <code className="break-all">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/google` : "http://localhost:3002/api/auth/callback/google"}</code></p>
                    <p className="text-xs">Authorized JavaScript origins: <code>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3002"}</code></p>
                    <a href="/api/debug-auth" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline text-xs mt-1 block">Copy from /api/debug-auth →</a>
                  </>
                )
                : `Error: ${error}. Try again.`}
            </div>
          )}

          <a
            href="/login/redirect"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition text-sm no-underline cursor-pointer"
            suppressHydrationWarning
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </a>
          {devLoginAvailable && (
            <button
              type="button"
              onClick={() => signIn("dev", { token: "dev", callbackUrl: "/" })}
              className="w-full mt-3 px-4 py-2 text-gray-400 hover:text-gray-300 text-sm border border-gray-700 hover:border-gray-600 rounded-lg transition"
            >
              Dev login (bypass Google)
            </button>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6" suppressHydrationWarning>
          Access restricted to authorized emails only
        </p>
        <p className="text-center mt-4" suppressHydrationWarning>
          <a href="/login/redirect" className="text-amber-500 hover:text-amber-400 text-sm underline" suppressHydrationWarning>
            Or open this link directly →
          </a>
        </p>
      </div>
      </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
