import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { allowedEmails } from "./schema";
import { eq } from "drizzle-orm";
import { guestEmailFromId, isGuestEmail, sanitizeGuestId } from "./access-policy";
import { allowGuestLogin } from "./config";

const providers: NextAuthOptions["providers"] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    authorization: { params: { prompt: "select_account" } },
  }),
];

if (process.env.ALLOW_DEV_EMAILS === "true") {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev bypass",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        if (credentials?.token !== "dev") return null;
        return { id: "dev", email: "dev@localhost", name: "Dev User" };
      },
    })
  );
}

if (allowGuestLogin()) {
  providers.push(
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: { token: { label: "Token", type: "hidden" } },
      async authorize(credentials) {
        const id = sanitizeGuestId(credentials?.token ?? undefined);
        if (!id) return null;
        const email = guestEmailFromId(id);
        return { id: `guest-${id}`, email, name: "Guest" };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      // NextAuth uses provider "credentials" for all CredentialsProvider ids (guest, dev).
      if (account?.provider === "credentials" && isGuestEmail(email)) {
        return allowGuestLogin();
      }

      const primaryAdmin = (process.env.PRIMARY_ADMIN_EMAIL || "").trim().toLowerCase();
      if (primaryAdmin && email === primaryAdmin) return true;
      const rows = await db
        .select()
        .from(allowedEmails)
        .where(eq(allowedEmails.email, email))
        .limit(1);
      if (rows.length > 0) return true;
      if (process.env.ALLOW_DEV_EMAILS === "true") {
        try {
          const { v4: uuid } = await import("uuid");
          await db.insert(allowedEmails).values({ id: uuid(), email });
        } catch {
          /* ignore */
        }
        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        token.isGuest =
          account.provider === "credentials" && !!user.email && isGuestEmail(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.isGuest = token.isGuest === true;
      }
      return session;
    },
  },
};
