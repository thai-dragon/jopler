const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

export async function generateIdealAnswer(
  question: string,
  codeSnippet: string | null,
  correctAnswer: string
): Promise<string> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not configured");

  const codeBlock = codeSnippet ? `\n\nCode:\n${codeSnippet}` : "";
  const prompt = `You are a senior tech interviewer. Write a concise, model answer for this interview question.

Question: ${question}${codeBlock}

Reference answer (brief): ${correctAnswer}

Write a polished, interview-ready answer (2-4 short paragraphs). Be specific and practical. Output only the answer text, no preamble.`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GOOGLE_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini request failed");
  const text =
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text).filter(Boolean).join(" ").trim() ?? "";
  return text || correctAnswer;
}
