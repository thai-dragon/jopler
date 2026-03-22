import { NextRequest, NextResponse } from "next/server";
import { generateTTSBuffer } from "@/lib/tts";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const wav = await generateTTSBuffer(text);
    return new NextResponse(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
