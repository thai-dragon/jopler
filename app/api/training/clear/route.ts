import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingProgress } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";
    const unitId = req.nextUrl.searchParams.get("unitId");
    if (!unitId)
      return NextResponse.json({ error: "unitId required" }, { status: 400 });

    await db
      .delete(trainingProgress)
      .where(and(eq(trainingProgress.unitId, unitId), eq(trainingProgress.userEmail, userEmail)));

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
