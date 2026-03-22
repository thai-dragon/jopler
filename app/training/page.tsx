"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Unit {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  relevanceScore: number;
  questionCount: number;
  attempted: number;
  correct: number;
  mastery: "mastered" | "proficient" | "familiar" | "attempted" | "not_started";
}

const MASTERY_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  mastered:    { bg: "bg-emerald-900/40", border: "border-emerald-500", text: "text-emerald-400", label: "Mastered" },
  proficient:  { bg: "bg-blue-900/40",    border: "border-blue-500",    text: "text-blue-400",    label: "Proficient" },
  familiar:    { bg: "bg-amber-900/40",   border: "border-amber-500",   text: "text-amber-400",   label: "Familiar" },
  attempted:   { bg: "bg-orange-900/40",  border: "border-orange-500",  text: "text-orange-400",  label: "Attempted" },
  not_started: { bg: "bg-gray-800/40",    border: "border-gray-600",    text: "text-gray-400",    label: "Not started" },
};

export default function TrainingPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/training/units");
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, []);

  async function generate() {
    setGenerating(true);
    setLogs([]);
    try {
      const res = await fetch("/api/training/generate", { method: "POST" });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const { msg } = JSON.parse(line.slice(6));
              setLogs((prev) => [...prev, msg]);
            } catch { /* skip */ }
          }
        }
      }
      await fetchUnits();
    } catch (err: any) {
      setLogs((prev) => [...prev, `ERROR: ${err.message}`]);
    } finally {
      setGenerating(false);
    }
  }

  const totalQuestions = units.reduce((s, u) => s + u.questionCount, 0);
  const totalCorrect = units.reduce((s, u) => s + u.correct, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>Interview Training</h1>
          <p className="text-gray-400 mt-1">Practice questions based on real job market requirements</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition"
        >
          {generating ? "Generating..." : units.length === 0 ? "Generate Training" : "Regenerate"}
        </button>
      </div>

      {units.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{units.length}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Topics</div>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{totalQuestions}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Questions</div>
          </div>
          <div className="bg-gray-800/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{overallPct}%</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Mastery</div>
          </div>
        </div>
      )}

      {generating && logs.length > 0 && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-xs">
          {logs.map((l, i) => (
            <div
              key={i}
              className={
                l.includes("ERROR") ? "text-red-400" :
                l.includes("COMPLETE") ? "text-emerald-400" :
                l.includes("Generating") ? "text-amber-300" : "text-gray-300"
              }
            >
              {l}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading...</div>
      ) : units.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>No training units yet</h2>
          <p className="text-gray-400 mb-6">
            Generate training from your parsed job data.<br />
            Make sure you&apos;ve parsed jobs and created summaries first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => {
            const m = MASTERY_COLORS[unit.mastery];
            const pct = unit.questionCount > 0 ? Math.round((unit.correct / unit.questionCount) * 100) : 0;
            return (
              <Link
                key={unit.id}
                href={`/training/${unit.slug}?unitId=${unit.id}`}
                className={`block rounded-xl border-2 ${m.border} ${m.bg} p-5 hover:scale-[1.02] transition-transform no-underline`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{unit.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.text} bg-black/30`}>
                    {m.label}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{unit.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Relevance: {(unit.relevanceScore * 10).toFixed(0)}%</span>
                  <span>{unit.correct}/{unit.questionCount} correct</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 80 ? "bg-emerald-500" :
                      pct >= 60 ? "bg-blue-500" :
                      pct >= 30 ? "bg-amber-500" : "bg-gray-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
