import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdminHeavyOps } from "@/lib/authz";
import { generateSummariesFromJobs, type JobInput } from "@/lib/ai-summary";
import { addLog, setStatus, clearLogs } from "@/lib/log-store";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminHeavyOps(session);
  if (denied) return denied;

  const body = await req.json();
  const jobs: JobInput[] = body.jobs ?? [];
  const filterSource: string = body.filterSource ?? "";

  if (jobs.length === 0) {
    return NextResponse.json({ error: "No jobs provided" }, { status: 400 });
  }

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
        send(`[Summary] Generating for ${jobs.length} filtered jobs (${filterSource || "all sources"})...`);
        const count = await generateSummariesFromJobs(jobs, filterSource, send);
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
