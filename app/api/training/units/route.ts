import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingUnits, trainingQuestions, trainingProgress } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";

    const units = await db.select().from(trainingUnits).orderBy(trainingUnits.sortOrder);

    const result = await Promise.all(
      units.map(async (u) => {
        const questions = await db.select().from(trainingQuestions).where(eq(trainingQuestions.unitId, u.id));
        const progress = await db
          .select()
          .from(trainingProgress)
          .where(and(eq(trainingProgress.unitId, u.id), eq(trainingProgress.userEmail, userEmail)));

        const attemptedIds = new Set(progress.map((p) => p.questionId));
        const correctIds = new Set(progress.filter((p) => p.isCorrect).map((p) => p.questionId));

        const total = questions.length;
        const attempted = attemptedIds.size;
        const correct = correctIds.size;
        const pct = total > 0 ? correct / total : 0;

        return {
          ...u,
          questionCount: total,
          attempted,
          correct,
          mastery:
            pct >= 0.8 ? "mastered" :
            pct >= 0.6 ? "proficient" :
            pct >= 0.3 ? "familiar" :
            attempted > 0 ? "attempted" : "not_started",
        };
      })
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
