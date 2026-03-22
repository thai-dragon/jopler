"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type LogEntry = { ts: number; msg: string };

export default function LiveLogs() {
  const pathname = usePathname();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("idle");
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  if (pathname === "/login") return null;
  const lastTsRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function poll() {
      while (active) {
        try {
          const url = lastTsRef.current
            ? `/api/logs?since=${lastTsRef.current}`
            : "/api/logs";
          const res = await fetch(url);
          const data = await res.json();

          if (data.logs?.length > 0) {
            setLogs((prev) => {
              const combined = lastTsRef.current === 0 ? data.logs : [...prev, ...data.logs];
              return combined.slice(-500);
            });
            const maxTs = Math.max(...data.logs.map((l: LogEntry) => l.ts));
            lastTsRef.current = maxTs;
          }
          setStatus(data.status);
        } catch {
          // server not ready
        }
        await new Promise((r) => setTimeout(r, status === "idle" ? 3000 : 800));
      }
    }

    poll();
    return () => { active = false; };
  }, [status]);

  useEffect(() => {
    if (panelRef.current && !collapsed) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [logs, collapsed]);

  if (logs.length === 0 && status === "idle") return null;

  const statusLabel = status === "parsing" ? "Parsing..." : status === "summarizing" ? "AI Summary..." : "Done";
  const statusColor = status === "idle" ? "bg-gray-600" : "bg-green-500 animate-pulse";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-800 shadow-2xl">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-inset transition"
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-gray-300 font-medium">Logs</span>
          <span className="text-gray-500">({logs.length}) — {statusLabel}</span>
        </div>
        <span className="text-gray-600">{collapsed ? "▲" : "▼"}</span>
      </button>
      {!collapsed && (
        <div ref={panelRef} className="max-h-64 overflow-auto px-4 pb-3">
          {logs.map((l, i) => (
            <div
              key={`${l.ts}-${i}`}
              className={`text-xs font-mono py-0.5 ${
                l.msg.includes("ERROR") ? "text-red-400" :
                l.msg.includes("COMPLETE") ? "text-green-400" :
                l.msg.includes("Found") || l.msg.includes("Parsed") || l.msg.includes("→") ? "text-blue-400" :
                l.msg.includes("[AI") ? "text-amber-400" :
                "text-gray-500"
              }`}
            >
              <span className="text-gray-700 mr-2">{new Date(l.ts).toLocaleTimeString()}</span>
              {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
