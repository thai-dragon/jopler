import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summaries, metaSummary } from "@/lib/schema";
import { generateAllSummaries } from "@/lib/ai-summary";
import { desc } from "drizzle-orm";
import { addLog, setStatus, clearLogs } from "@/lib/log-store";

export async function GET() {
  try {
    const rows = await db.select().from(summaries).orderBy(desc(summaries.generatedAt));
    const meta = await db.select().from(metaSummary).limit(1);
    return NextResponse.json({ summaries: rows, metaSummary: meta[0]?.content ?? null });
  } catch (err) {
    console.error("[API /summary] GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      clearLogs();
      setStatus("summarizing");

      const send = (msg: string) => {
        addLog(msg);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: msg })}\n\n`));
      };

      try {
        send("[Summary] Clearing old summaries...");
        await db.delete(summaries);
        await db.delete(metaSummary);
        const count = await generateAllSummaries(send);
        send(`[Summary] COMPLETE — ${count} summaries generated`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, count })}\n\n`));
      } catch (error) {
        send(`[Summary] ERROR: ${error}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, error: String(error) })}\n\n`));
      }
      setStatus("idle");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
