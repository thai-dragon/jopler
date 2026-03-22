import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadmin } from "@/lib/config";
import { db } from "@/lib/db";
import { trainingQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateIdealAnswer } from "@/lib/gemini-ideal";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperadmin(session?.user?.email)) {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
    }

    const questions = await db.select().from(trainingQuestions);
    const missing = questions.filter((q) => !q.idealAnswer || q.idealAnswer.trim() === "");
    let generated = 0;

    for (const q of missing) {
      try {
        const idealAnswer = await generateIdealAnswer(
          q.question,
          q.codeSnippet,
          q.correctAnswer
        );
        await db.update(trainingQuestions).set({ idealAnswer }).where(eq(trainingQuestions.id, q.id));
        generated++;
      } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, generated, total: missing.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
