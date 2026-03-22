import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const EVAL_MODEL = "gpt-4.1-mini";

export async function POST(req: NextRequest) {
  try {
    await getServerSession(authOptions);
    const { question, codeSnippet, idealAnswer, userAnswer } = await req.json();
    if (!question || !idealAnswer || !userAnswer) {
      return NextResponse.json({ error: "Missing question, idealAnswer or userAnswer" }, { status: 400 });
    }

    const codeBlock = codeSnippet ? `\n\nCode to consider:\n\`\`\`\n${codeSnippet}\n\`\`\`` : "";

    const prompt = `You are evaluating a mock interview answer. Be FAIR and CONSTRUCTIVE.

Question: ${question}${codeBlock}

Reference (ideal) answer: ${idealAnswer}

User's answer: ${userAnswer}

CRITICAL: Base your evaluation ONLY on what the user actually wrote. Do NOT attribute concepts to the user that they did not mention. Do NOT hallucinate — if they only said X, don't praise them for Y. Answers may come from voice-to-text — ignore typos, evaluate meaning.

Return ONLY valid JSON:
{
  "verdict": "It's good answer" | "It's normal answer" | "It's bad answer",
  "score": number from 0 to 10,
  "explanation": "1-2 sentences. If something is missing, explain WHY. Be constructive.",
  "correctAnswer": "1-2 sentences summarizing key points from the ideal."
}

SCORING:
- 7-10: Correct concept, demonstrates understanding. Typo-heavy but correct meaning = at least 7.
- 4-6: Partially correct, missed some points.
- 0-3: Wrong or irrelevant. NEVER use for correct-but-typo answers.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EVAL_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI request failed");
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const verdict = parsed.verdict || "It's normal answer";
    const score = Math.min(10, Math.max(0, Number(parsed.score) ?? 5));
    const explanation = parsed.explanation || "";
    const correctAnswer = parsed.correctAnswer || "";

    return NextResponse.json({ verdict, score, explanation, correctAnswer });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
