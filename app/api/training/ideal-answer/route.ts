import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateIdealAnswer } from "@/lib/gemini-ideal";

export async function GET(req: NextRequest) {
  try {
    await getServerSession(authOptions);
    const questionId = req.nextUrl.searchParams.get("questionId");
    if (!questionId)
      return NextResponse.json({ error: "questionId required" }, { status: 400 });

    const rows = await db.select().from(trainingQuestions).where(eq(trainingQuestions.id, questionId)).limit(1);
    const q = rows[0];
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    if (q.idealAnswer) {
      return NextResponse.json({ idealAnswer: q.idealAnswer });
    }

    const idealAnswer = await generateIdealAnswer(
      q.question,
      q.codeSnippet,
      q.correctAnswer
    );
    await db.update(trainingQuestions).set({ idealAnswer }).where(eq(trainingQuestions.id, questionId));

    return NextResponse.json({ idealAnswer });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
