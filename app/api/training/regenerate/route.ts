import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadmin } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperadmin(session?.user?.email)) {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
    }

    const res = await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3002"}/api/training/generate`,
      { method: "POST" }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        dec.decode(value);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
