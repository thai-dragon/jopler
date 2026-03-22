"use client";

import { useState, useEffect } from "react";

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filterSource, setFilterSource] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterType, setFilterType] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterSource) params.set("source", filterSource);
    if (filterLevel) params.set("level", filterLevel);
    if (filterType) params.set("type", filterType);
    fetch(`/api/jobs?${params}`).then((r) => r.json()).then(setJobs).catch(() => {});
  }, [filterSource, filterLevel, filterType]);

  const levels = [...new Set(jobs.map((j) => j.level).filter(Boolean))];
  const types = [...new Set(jobs.map((j) => j.type).filter(Boolean))];

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jobs ({jobs.length})</h1>
        <div className="flex gap-3 text-sm">
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5">
            <option value="">All sources</option>
            <option value="djinni">Djinni</option>
            <option value="dou">DOU</option>
          </select>
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5">
            <option value="">All levels</option>
            {levels.map((l) => <option key={l!} value={l!}>{l}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5">
            <option value="">All types</option>
            {types.map((t) => <option key={t!} value={t!}>{t}</option>)}
          </select>
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
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
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
                  <td className="py-2 px-3 text-gray-400 text-xs">{j.location || "—"}</td>
                  <td className="py-2 px-3 text-xs">{j.remote || "—"}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {techs.slice(0, 6).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 text-xs bg-gray-800 rounded">{t}</span>
                      ))}
                      {techs.length > 6 && <span className="text-xs text-gray-600">+{techs.length - 6}</span>}
                    </div>
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
