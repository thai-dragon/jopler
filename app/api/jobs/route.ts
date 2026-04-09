import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { isSuperadmin } from "@/lib/config";
import { sessionIsGuest } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const levels = searchParams.getAll("level").filter(Boolean);
  const types = searchParams.getAll("type").filter(Boolean);

  try {
    let rows = await db.select().from(jobs).orderBy(desc(jobs.parsedAt));

    if (source) rows = rows.filter((j) => j.source === source);
    if (levels.length) rows = rows.filter((j) => levels.includes(j.level ?? ""));
    if (types.length) rows = rows.filter((j) => types.includes(j.type ?? ""));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[API /jobs] GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionIsGuest(session) || !isSuperadmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(jobs);
  return NextResponse.json({ deleted: true });
}
