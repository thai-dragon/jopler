type LogEntry = { ts: number; msg: string };

let logs: LogEntry[] = [];
let status: "idle" | "parsing" | "summarizing" = "idle";
let startedAt: number | null = null;

export function addLog(msg: string) {
  console.log(msg);
  logs.push({ ts: Date.now(), msg });
  if (logs.length > 500) logs = logs.slice(-500);
}

export function getLogs(): { logs: LogEntry[]; status: string; startedAt: number | null } {
  return { logs: [...logs], status, startedAt };
}

export function getLogsSince(since: number): { logs: LogEntry[]; status: string; startedAt: number | null } {
  return { logs: logs.filter((l) => l.ts > since), status, startedAt };
}

export function setStatus(s: "idle" | "parsing" | "summarizing") {
  status = s;
  if (s !== "idle") {
    startedAt = Date.now();
  } else {
    startedAt = null;
  }
}

export function clearLogs() {
  logs = [];
}
