import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingQuestions, trainingProgress } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";

    const questionId = req.nextUrl.searchParams.get("questionId");
    if (!questionId) {
      return NextResponse.json({ error: "questionId required" }, { status: 400 });
    }

    const rows = await db.select().from(trainingQuestions).where(eq(trainingQuestions.id, questionId)).limit(1);
    if (!rows[0]) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    await db
      .delete(trainingProgress)
      .where(and(eq(trainingProgress.questionId, questionId), eq(trainingProgress.userEmail, userEmail)));

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";

    const unitId = req.nextUrl.searchParams.get("unitId");
    if (!unitId) {
      return NextResponse.json({ error: "unitId required" }, { status: 400 });
    }

    const questions = await db.select().from(trainingQuestions).where(eq(trainingQuestions.unitId, unitId));
    const progress = await db
      .select()
      .from(trainingProgress)
      .where(and(eq(trainingProgress.unitId, unitId), eq(trainingProgress.userEmail, userEmail)));

    const progressMap = new Map<string, { isCorrect: boolean; aiEvaluation: string | null }>();
    for (const p of progress) {
      if (!progressMap.has(p.questionId) || p.isCorrect) {
        progressMap.set(p.questionId, { isCorrect: p.isCorrect ?? false, aiEvaluation: p.aiEvaluation });
      }
    }

    const result = questions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      progress: progressMap.get(q.id) ?? null,
      idealAnswer: q.idealAnswer ?? null,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
