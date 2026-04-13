"use client";

import { useState, useEffect, useRef } from "react";

type Job = {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  company?: string | null;
  level?: string | null;
  type?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  experience?: string | null;
  location?: string | null;
  remote?: string | null;
  technologies?: string | null;
  description?: string | null;
  publishedAt?: string | null;
};

function parseTech(t: string | null | undefined): string[] {
  if (!t) return [];
  try { return JSON.parse(t); } catch { return []; }
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
  // DOU returns Ukrainian text like "8 квітня 2026" — try to parse manually
  const UA_MONTHS: Record<string, number> = {
    "січня": 1, "лютого": 2, "березня": 3, "квітня": 4,
    "травня": 5, "червня": 6, "липня": 7, "серпня": 8,
    "вересня": 9, "жовтня": 10, "листопада": 11, "грудня": 12,
  };
  const m = raw.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (m) {
    const month = UA_MONTHS[m[2].toLowerCase()];
    if (month) {
      const dd = m[1].padStart(2, "0");
      const mm = String(month).padStart(2, "0");
      return `${dd}.${mm}.${m[3]}`;
    }
  }
  return raw;
}

const LEVEL_SCORE: Record<string, number> = {
  Principal: 7, Staff: 6, Lead: 5, Senior: 4, Middle: 3, Junior: 2, Intern: 1, Unknown: 0,
};

function parsePublishedAt(raw: string | null | undefined): number {
  if (!raw) return 0;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.getTime();
  const UA_MONTHS: Record<string, number> = {
    "січня": 0, "лютого": 1, "березня": 2, "квітня": 3,
    "травня": 4, "червня": 5, "липня": 6, "серпня": 7,
    "вересня": 8, "жовтня": 9, "листопада": 10, "грудня": 11,
  };
  const m = raw.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (m) {
    const month = UA_MONTHS[m[2].toLowerCase()];
    if (month !== undefined) return new Date(Number(m[3]), month, Number(m[1])).getTime();
  }
  return 0;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allLevels, setAllLevels] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState("");
  const [filterLevels, setFilterLevels] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<"hottest" | "newest">("hottest");
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const levelsRef = useRef<HTMLDivElement>(null);
  const typesRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openCount, setOpenCount] = useState(10);
  const [openOffset, setOpenOffset] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/jobs").then((r) => r.json()).then((data: Job[]) => {
      setAllLevels([...new Set(data.map((j) => j.level).filter(Boolean))] as string[]);
      setAllTypes([...new Set(data.map((j) => j.type).filter(Boolean))] as string[]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterSource) params.set("source", filterSource);
    filterLevels.forEach((l) => params.append("level", l));
    filterTypes.forEach((t) => params.append("type", t));
    fetch(`/api/jobs?${params}`).then((r) => r.json()).then((data) => { setJobs(data); setOpenOffset(0); }).catch(() => {});
  }, [filterSource, filterLevels, filterTypes]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (levelsRef.current && !levelsRef.current.contains(e.target as Node)) setLevelsOpen(false);
      if (typesRef.current && !typesRef.current.contains(e.target as Node)) setTypesOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function clearJobs() {
    if (!confirm(`Delete all ${jobs.length} jobs?`)) return;
    setClearing(true);
    try {
      await fetch("/api/jobs", { method: "DELETE" });
      setJobs([]);
      setOpenOffset(0);
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setClearing(false);
    }
  }


  async function generateSummary() {
    if (!confirm(`Generate AI summary for ${jobs.length} filtered jobs?`)) return;
    setGenerating(true);
    try {
      const payload = jobs.map((j) => ({
        title: j.title,
        company: j.company,
        level: j.level,
        type: j.type,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: j.salaryCurrency,
        experience: j.experience,
        location: j.location,
        remote: j.remote,
        technologies: j.technologies,
        description: j.description,
      }));
      const filterLabel = [filterSource, ...filterLevels, ...filterTypes].filter(Boolean).join(", ") || "all";
      const res = await fetch("/api/jobs/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: payload, filterSource: filterLabel }),
      });
      if (!res.ok) {
        alert(`Error: ${res.statusText}`);
        return;
      }
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const match = text.match(/"done"\s*:\s*true/);
          if (match) break;
        }
      }
      window.open("/summary", "_blank");
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setGenerating(false);
    }
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortMode === "newest") {
      return parsePublishedAt(b.publishedAt) - parsePublishedAt(a.publishedAt);
    }
    // hottest: level score + salary bonus + recency
    const levelDiff = (LEVEL_SCORE[b.level ?? "Unknown"] ?? 0) - (LEVEL_SCORE[a.level ?? "Unknown"] ?? 0);
    if (levelDiff !== 0) return levelDiff;
    const aSal = a.salaryMin ?? -1;
    const bSal = b.salaryMin ?? -1;
    if (bSal !== aSal) return bSal - aSal;
    return parsePublishedAt(b.publishedAt) - parsePublishedAt(a.publishedAt);
  });

  function toggleLevel(v: string) {
    setFilterLevels((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }
  function toggleType(v: string) {
    setFilterTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">Jobs ({jobs.length})</h1>
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={clearJobs}
              disabled={clearing}
              className="text-xs text-red-500/70 hover:text-red-400 border border-red-900/40 hover:border-red-800/60 rounded px-2 py-1 transition disabled:opacity-40"
            >
              {clearing ? "Clearing…" : "Clear all"}
            </button>
          )}
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={generateSummary}
              disabled={generating}
              className="text-xs text-amber-500/80 hover:text-amber-400 border border-amber-900/40 hover:border-amber-800/60 rounded px-2 py-1 transition disabled:opacity-40"
            >
              {generating ? "Generating…" : "Generate Summary"}
            </button>
          )}
        </div>
        <div className="flex gap-2 text-sm items-center flex-wrap">
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            {(["hottest", "newest"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortMode(mode)}
                className={`px-3 py-1.5 capitalize transition ${sortMode === mode ? "bg-gray-700 text-gray-200" : "bg-gray-900 text-gray-400 hover:bg-gray-700"}`}
              >
                {mode === "hottest" ? "Hottest" : "Newest"}
              </button>
            ))}
          </div>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-200">
            <option value="">All sources</option>
            <option value="djinni">Djinni</option>
            <option value="dou">DOU</option>
          </select>
          <div ref={levelsRef} className="relative">
            <button
              type="button"
              onClick={() => { setLevelsOpen((o) => !o); setTypesOpen(false); }}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 min-w-[8rem] flex items-center justify-between gap-2 text-gray-200 hover:bg-gray-700 transition"
            >
              <span>{filterLevels.length === 0 ? "All levels" : filterLevels.length === 1 ? filterLevels[0] : `${filterLevels.length} levels`}</span>
              <span className="text-gray-500 text-xs">{levelsOpen ? "▴" : "▾"}</span>
            </button>
            {levelsOpen && (
              <div className="absolute left-0 z-30 mt-1 min-w-[160px] rounded border border-gray-700 bg-gray-900 shadow-xl">
                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-800">
                  <span className="text-xs font-medium text-gray-400">Levels</span>
                  {filterLevels.length > 0 && <button type="button" className="text-xs text-amber-500 hover:text-amber-400" onClick={() => setFilterLevels([])}>Clear</button>}
                </div>
                {allLevels.map((l) => (
                  <div key={l} onClick={() => toggleLevel(l)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 select-none">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${filterLevels.includes(l) ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                      {filterLevels.includes(l) && <span className="text-[10px] leading-none" style={{ color: "#fff" }}>✓</span>}
                    </span>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div ref={typesRef} className="relative">
            <button
              type="button"
              onClick={() => { setTypesOpen((o) => !o); setLevelsOpen(false); }}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 min-w-[8rem] flex items-center justify-between gap-2 text-gray-200 hover:bg-gray-700 transition"
            >
              <span>{filterTypes.length === 0 ? "All types" : filterTypes.length === 1 ? filterTypes[0] : `${filterTypes.length} types`}</span>
              <span className="text-gray-500 text-xs">{typesOpen ? "▴" : "▾"}</span>
            </button>
            {typesOpen && (
              <div className="absolute left-0 z-30 mt-1 min-w-[160px] rounded border border-gray-700 bg-gray-900 shadow-xl">
                <div className="flex justify-between items-center px-3 py-2 border-b border-gray-800">
                  <span className="text-xs font-medium text-gray-400">Types</span>
                  {filterTypes.length > 0 && <button type="button" className="text-xs text-amber-500 hover:text-amber-400" onClick={() => setFilterTypes([])}>Clear</button>}
                </div>
                {allTypes.map((t) => (
                  <div key={t} onClick={() => toggleType(t)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 select-none">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${filterTypes.includes(t) ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                      {filterTypes.includes(t) && <span className="text-[10px] leading-none" style={{ color: "#fff" }}>✓</span>}
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center rounded overflow-hidden border border-gray-700">
            <button
              type="button"
              disabled={sortedJobs.length === 0 || openOffset >= sortedJobs.length}
              onClick={() => {
                const batch = sortedJobs.slice(openOffset, openOffset + openCount);
                batch.forEach((j, i) => {
                  setTimeout(() => window.open(j.sourceUrl, j.id), i * 300);
                });
                setOpenOffset((prev) => prev + batch.length);
              }}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 transition text-gray-200 whitespace-nowrap"
            >
              {openOffset === 0 ? "Open" : `Open next`}
              {jobs.length > 0 && (
                <span className="ml-1 text-gray-500 text-xs">
                  {openOffset}/{sortedJobs.length}
                </span>
              )}
            </button>
            <select
              value={openCount}
              onChange={(e) => { setOpenCount(Number(e.target.value)); setOpenOffset(0); }}
              className="bg-gray-900 border-l border-gray-700 px-2 py-1.5 text-gray-400"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {openOffset > 0 && (
              <button
                type="button"
                onClick={() => setOpenOffset(0)}
                className="px-2 py-1.5 bg-gray-900 border-l border-gray-700 text-gray-600 hover:text-gray-400 transition text-xs"
                title="Reset to start"
              >
                ↺
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500">
              <th className="py-2 px-3">Source</th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Company</th>
              <th className="py-2 px-3">Level</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Salary</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3">Remote</th>
              <th className="py-2 px-3">Technologies</th>
              <th className="py-2 px-3">Posted</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((j) => {
              const techs = parseTech(j.technologies);
              const isExpanded = expanded.has(j.id);
              return (
                <tr key={j.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-2 px-3">
                    <span className="font-semibold">
                      {j.source}
                    </span>
                  </td>
                  <td className="py-2 px-3 max-w-[280px] min-w-0 overflow-hidden">
                    <span className="flex items-center gap-2 min-w-0">
                      <a
                        href={j.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate min-w-0"
                        title={j.title}
                      >
                        {j.title}
                      </a>
                      <button
                        onClick={() => setExpanded((s) => {
                          const n = new Set(s);
                          if (n.has(j.id)) n.delete(j.id); else n.add(j.id);
                          return n;
                        })}
                        className="flex-shrink-0 text-xs text-gray-600 hover:text-gray-400"
                      >
                        {isExpanded ? "[-]" : "[+]"}
                      </button>
                    </span>
                    {isExpanded && j.description && (
                      <div className="mt-2 text-xs text-gray-500 max-h-48 overflow-auto whitespace-pre-wrap">
                        {j.description.slice(0, 1500)}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-400 max-w-[220px] min-w-0 overflow-hidden">
                    <span
                      className="block truncate"
                      title={j.company || undefined}
                    >
                      {j.company || "—"}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-semibold">
                      {j.level || "—"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-300">{j.type || "—"}</td>
                  <td className="py-2 px-3">
                    {j.salaryMin ? (
                      <span className="font-semibold">
                        ${j.salaryMin}{j.salaryMax && j.salaryMax !== j.salaryMin ? `-$${j.salaryMax}` : ""}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs max-w-[120px]"><div className="truncate" title={j.location ?? undefined}>{j.location || "—"}</div></td>
                  <td className="py-2 px-3 text-xs">{j.remote || "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {techs.slice(0, 6).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-800 rounded">{t}</span>
                      ))}
                      {techs.length > 6 && <span className="text-xs text-gray-600">+{techs.length - 6}</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(j.publishedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
