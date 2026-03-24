import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAnswer } from "@/lib/training-ai";
import { requireAuthenticated } from "@/lib/authz";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAuthenticated(session);
    if (denied) return denied;

    const userEmail = session?.user?.email || "anonymous";

    const { questionId, userAnswer } = await req.json();
    if (!questionId || userAnswer === undefined) {
      return NextResponse.json({ error: "questionId and userAnswer required" }, { status: 400 });
    }

    const result = await checkAnswer(questionId, userAnswer, userEmail);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
