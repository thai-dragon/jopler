import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedEmails } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getPrimaryAdminEmail, isSuperadmin } from "@/lib/config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rows = await db.select().from(allowedEmails).orderBy(allowedEmails.addedAt);
    return NextResponse.json({ emails: rows, primaryAdminEmail: getPrimaryAdminEmail() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadmin(session.user.email)) {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
    }
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    await db.insert(allowedEmails).values({
      id: uuid(),
      email: email.toLowerCase().trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email already in access list" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadmin(session.user.email)) {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
    }
    const { email } = await req.json();
    if (email === getPrimaryAdminEmail()) {
      return NextResponse.json({ error: "Cannot remove the primary admin" }, { status: 403 });
    }
    await db.delete(allowedEmails).where(eq(allowedEmails.email, email.toLowerCase().trim()));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
