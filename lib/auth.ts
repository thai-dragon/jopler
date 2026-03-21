import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import { allowedEmails } from "./schema";
import { eq } from "drizzle-orm";

const providers: NextAuthOptions["providers"] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
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
        } catch { /* ignore */ }
        return true;
      }
      return false;
    },
    async session({ session }) {
      return session;
    },
  },
};
