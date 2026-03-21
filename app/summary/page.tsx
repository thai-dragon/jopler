"use client";

import { useState, useEffect, useRef } from "react";

type Summary = {
  id: string;
  position: string;
  jobCount: number;
  avgSalaryMin?: number | null;
  avgSalaryMax?: number | null;
  salaryCurrency?: string | null;
  avgExperienceYears?: number | null;
  techScores?: string | null;
  topRequirements?: string | null;
  topBackendTech?: string | null;
  rawAnalysis?: string | null;
  generatedAt?: string | null;
};

function parseJson<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(score * 10, 100);
  const color =
    score >= 8 ? "bg-green-500" :
    score >= 5 ? "bg-blue-500" :
    score >= 3 ? "bg-yellow-500" :
    "bg-gray-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8">{score.toFixed(1)}</span>
    </div>
  );
}

export default function SummaryPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [metaSummary, setMetaSummary] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  async function downloadPDF() {
    if (!contentRef.current) return;
    setDownloading(true);
    try {
      const [html2canvasMod, jspdfMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const pdf = new jspdfMod.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const bgColor = "#111827";
      const opts = { scale: 2, useCORS: true, logging: false, backgroundColor: bgColor, scrollX: 0, scrollY: 0 };

      const fillPage = () => {
        pdf.setFillColor(17, 24, 39);
        pdf.rect(0, 0, pageW, pageH, "F");
      };

      const pages = contentRef.current.querySelectorAll<HTMLElement>(".pdf-page");
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
          fillPage();
        } else {
          fillPage();
        }
        const canvas = await html2canvasMod.default(pages[i], opts);
        const img = canvas.toDataURL("image/png");
        const imgW = pageW;
        const imgH = Math.min((canvas.height * pageW) / canvas.width, pageH * 1.2);
        pdf.addImage(img, "PNG", 0, 0, imgW, imgH);
      }
      pdf.save(`jopler-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then((data) => {
        setSummaries(data.summaries ?? data);
        setMetaSummary(data.metaSummary ?? null);
      })
      .catch(() => {});
  }, []);

  const lastUpdated = summaries.length > 0
    ? summaries.reduce((latest, s) => {
        const d = s.generatedAt ? new Date(s.generatedAt).getTime() : 0;
        return d > latest ? d : latest;
      }, 0)
    : 0;

  if (summaries.length === 0 && !metaSummary) {
    return (
      <main className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">AI Summary</h1>
        <p className="text-gray-500">No summaries yet. Parse jobs first, then generate AI summary.</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">AI Summary — Market Analysis</h1>
          {lastUpdated > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded font-medium text-sm transition"
        >
          {downloading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      <div ref={contentRef} className="px-12 overflow-visible">
        {metaSummary && (
          <div className="pdf-page mb-10 px-12 py-8 bg-gray-900 border border-amber-800/50 rounded-lg overflow-visible">
            <h2 className="text-sm font-medium text-amber-400/90 mb-2">Summary of summaries</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{metaSummary}</p>
          </div>
        )}

        <div className="space-y-10">
        {summaries.map((s) => {
          const techScores = parseJson<Record<string, number>>(s.techScores);
          const topReqs = parseJson<string[]>(s.topRequirements);
          const backendTech = parseJson<string[]>(s.topBackendTech);
          const raw = parseJson<Record<string, unknown>>(s.rawAnalysis);
          const sortedTech = techScores
            ? Object.entries(techScores).sort((a, b) => b[1] - a[1])
            : [];

          return (
            <section key={s.id} className="pdf-page px-12 py-8 bg-gray-900 border border-gray-800 rounded-lg overflow-visible">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div>
                  <h2 className="text-xl font-bold">{s.position}</h2>
                  <span className="text-gray-500 text-sm">{s.jobCount} vacancies analyzed</span>
                </div>
                <div className="text-right">
                  {s.avgSalaryMin != null && (
                    <div className="text-green-400 font-medium">
                      ${s.avgSalaryMin?.toFixed(0)} — ${s.avgSalaryMax?.toFixed(0)} {s.salaryCurrency}
                    </div>
                  )}
                  {s.avgExperienceYears != null && (
                    <div className="text-gray-400 text-sm">{s.avgExperienceYears?.toFixed(1)} years avg experience</div>
                  )}
                </div>
              </div>

              {sortedTech.length > 0 && (
                <div className="mb-6 pl-2">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Technology relevance (0-10)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 gap-x-6">
                    {sortedTech.map(([tech, score]) => (
                      <div key={tech} className="flex items-center justify-between gap-3 text-sm min-w-0">
                        <span className="text-gray-300 shrink-0">{tech}</span>
                        <ScoreBar score={score} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topReqs && topReqs.length > 0 && (
                <div className="mb-4 pl-2">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Top requirements</h3>
                  <ul className="list-disc list-outside ml-5 text-sm text-gray-300 space-y-1.5">
                    {topReqs.map((r, i) => <li key={i} className="pl-1">{r}</li>)}
                  </ul>
                </div>
              )}

              {backendTech && backendTech.length > 0 && (
                <div className="mb-4 pl-2">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Top backend technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {backendTech.map((t) => (
                      <span key={t} className="px-2 py-1 text-xs bg-gray-800 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {typeof raw?.insights === "string" && raw.insights && (
                <div className="mt-4 p-4 pl-6 bg-gray-950 rounded text-sm text-gray-400 italic">
                  {raw.insights}
                </div>
              )}
            </section>
          );
        })}
        </div>
      </div>
    </main>
  );
}
