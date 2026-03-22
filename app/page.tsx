"use client";

import { useState, useRef, useEffect } from "react";

export default function HomePage() {
  const [parsing, setParsing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  async function streamSSE(url: string, setWorking: (v: boolean) => void) {
    setWorking(true);
    setLogs([]);

    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.body) {
        setLogs(["Error: no response body"]);
        setWorking(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.log) {
              setLogs((prev) => [...prev, data.log]);
            }
            if (data.done) {
              setLogs((prev) => [...prev, "--- DONE ---"]);
            }
          } catch {
            // malformed line
          }
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, `Error: ${err}`]);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Job Parser</h1>
      <p className="text-gray-500 mb-8">Parse frontend/fullstack jobs from Djinni & DOU, then analyze with AI.</p>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => streamSSE("/api/parse", setParsing)}
          disabled={parsing || summarizing}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition text-white"
        >
          {parsing ? "Parsing..." : "Parse Jobs"}
        </button>
        <button
          onClick={() => streamSSE("/api/summary", setSummarizing)}
          disabled={parsing || summarizing}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded font-medium transition text-white"
        >
          {summarizing ? "Generating..." : "Generate AI Summary"}
        </button>
      </div>

      {logs.length > 0 && (
        <div ref={logsRef} className="p-4 bg-gray-950 border border-gray-800 rounded max-h-[70vh] overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-400">Live logs ({logs.length})</h3>
            {(parsing || summarizing) && (
              <span className="text-xs text-green-400 animate-pulse">streaming...</span>
            )}
          </div>
          {logs.map((l, i) => (
            <div
              key={i}
              className={`text-xs font-mono py-0.5 ${
                l.includes("ERROR") ? "text-red-400" :
                l.includes("COMPLETE") || l === "--- DONE ---" ? "text-green-400" :
                l.includes("Found") || l.includes("Parsed") ? "text-blue-400" :
                l.includes("[AI") ? "text-amber-400" :
                "text-gray-500"
              }`}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
