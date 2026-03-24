import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTTSBuffer } from "@/lib/tts";
import { requireBillableAi } from "@/lib/authz";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireBillableAi(session);
    if (denied) return denied;

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const wav = await generateTTSBuffer(text);
    const body = new Uint8Array(wav);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(body.length),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
