import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthenticated } from "@/lib/authz";
import { db } from "@/lib/db";
import { trainingSessions } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";
    const unitId = req.nextUrl.searchParams.get("unitId");
    if (!unitId)
      return NextResponse.json({ error: "unitId required" }, { status: 400 });

    const rows = await db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.unitId, unitId), eq(trainingSessions.userEmail, userEmail)))
      .orderBy(desc(trainingSessions.closedAt));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAuthenticated(session);
    if (denied) return denied;

    const userEmail = session!.user!.email!;
    const { unitId, correctCount, totalCount } = await req.json();
    if (!unitId)
      return NextResponse.json({ error: "unitId required" }, { status: 400 });

    await db.insert(trainingSessions).values({
      id: uuid(),
      unitId,
      userEmail,
      correctCount: correctCount ?? 0,
      totalCount: totalCount ?? 0,
      closedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
