import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedEmails, trainingProgress, trainingUnits, trainingQuestions } from "@/lib/schema";

const COLORS = ["from-amber-500 to-orange-600", "from-blue-500 to-cyan-600", "from-emerald-500 to-teal-600", "from-purple-500 to-pink-600"];

function initials(email: string): string {
  const local = email.split("@")[0] || "";
  const a = local[0]?.toUpperCase() ?? "?";
  const b = local[1]?.toUpperCase() ?? a;
  return a + b;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emails = await db.select().from(allowedEmails).orderBy(allowedEmails.addedAt);
    const progressRows = await db.select().from(trainingProgress);
    const units = await db.select().from(trainingUnits);
    const allQuestions = await db.select().from(trainingQuestions);
    const totalInSystem = allQuestions.length;

    const unitMap = new Map(units.map((u) => [u.id, u]));
    const byUser = new Map<
      string,
      { attempted: Set<string>; correct: Set<string>; lastUnitId: string; lastAt: string }
    >();

    for (const row of progressRows) {
      if (!emails.some((e) => e.email === row.userEmail)) continue;
      let u = byUser.get(row.userEmail);
      if (!u) {
        u = { attempted: new Set(), correct: new Set(), lastUnitId: "", lastAt: "" };
        byUser.set(row.userEmail, u);
      }
      u.attempted.add(row.questionId);
      if (row.isCorrect) u.correct.add(row.questionId);
      const at = row.attemptedAt ?? "";
      if (at > u.lastAt) {
        u.lastAt = at;
        u.lastUnitId = row.unitId;
      }
    }

    const members = emails.map((e, i) => {
      const u = byUser.get(e.email);
      const correct = u ? u.correct.size : 0;
      const pct = totalInSystem > 0 ? Math.round((correct / totalInSystem) * 100) : 0;
      const lastUnit = u?.lastUnitId ? unitMap.get(u.lastUnitId) : null;
      return {
        email: e.email,
        name: e.email.split("@")[0],
        avatar: initials(e.email),
        color: COLORS[i % COLORS.length],
        questionsAnswered: correct,
        lastTopic: lastUnit?.title ?? "—",
        pct,
      };
    });

    return NextResponse.json({ members });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
