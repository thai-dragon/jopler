import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY not configured" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No audio file" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mime = file.type?.startsWith("audio/") ? file.type : "audio/webm";

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mime, data: base64 } },
            {
              text: "Transcribe this audio to text. Return only the raw transcription, nothing else. No timestamps, no formatting.",
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message || "Transcription failed" },
      { status: res.status }
    );
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text =
    parts.map((p: { text?: string }) => p?.text).filter(Boolean).join(" ").trim() ?? "";
  return NextResponse.json({ text });
}
