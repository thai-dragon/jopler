import { NextRequest, NextResponse } from "next/server";
import { generateAllTraining } from "@/lib/training-ai";
import { addLog, setStatus } from "@/lib/log-store";

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (msg: string) => {
        addLog(msg);
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`));
      };
      try {
        setStatus("summarizing");
        send("[Training] Starting training generation...");
        await generateAllTraining(send);
      } catch (err: any) {
        send(`[Training] ERROR: ${err.message}`);
      } finally {
        setStatus("idle");
        ctrl.close();
      }
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
