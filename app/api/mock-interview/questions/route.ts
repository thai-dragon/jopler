import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingUnits, trainingQuestions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await getServerSession(authOptions);
    const unitIds = req.nextUrl.searchParams.get("unitIds")?.split(",").filter(Boolean) ?? [];
    if (unitIds.length === 0) return NextResponse.json([]);

    const units = await db.select().from(trainingUnits).where(inArray(trainingUnits.id, unitIds));
    const unitIdSet = new Set(units.map((u) => u.id));
    const questions = await db
      .select()
      .from(trainingQuestions)
      .where(inArray(trainingQuestions.unitId, unitIds));

    const theoretical = questions.filter((q) =>
      ["concept", "best_practice", "code_output", "system_design"].includes(q.type)
    );
    const coding = questions.filter((q) => ["code_write", "fix_bug"].includes(q.type));
    const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const mixed = [...shuffle(theoretical), ...shuffle(coding)];

    const result = mixed.map((q) => ({
      id: q.id,
      unitId: q.unitId,
      type: q.type,
      question: q.question,
      codeSnippet: q.codeSnippet,
      idealAnswer: q.idealAnswer || q.correctAnswer,
      options: q.options ? JSON.parse(q.options) : null,
      audioPath: q.audioPath ?? null,
    }));

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
