import { parseDjinni } from "@/lib/parsers/djinni";
import { parseDou } from "@/lib/parsers/dou";
import { addLog, setStatus, clearLogs } from "@/lib/log-store";

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      clearLogs();
      setStatus("parsing");

      const send = (msg: string) => {
        addLog(msg);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: msg })}\n\n`));
      };

      try {
        send("[Parse] Starting Djinni...");
        const djinniCount = await parseDjinni(send);
        send(`[Parse] Djinni done: ${djinniCount} jobs`);

        send("[Parse] Starting DOU...");
        const douCount = await parseDou(send);
        send(`[Parse] DOU done: ${douCount} jobs`);

        send(`[Parse] COMPLETE — total: ${djinniCount + douCount} jobs`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, djinni: djinniCount, dou: douCount })}\n\n`));
      } catch (error) {
        send(`[Parse] ERROR: ${error}`);
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
