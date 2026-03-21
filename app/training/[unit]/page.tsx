"use client";

import { Suspense, useEffect, useState, lazy } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CodeEditor = lazy(() => import("../../components/code-editor"));

interface Question {
  id: string;
  type: string;
  difficulty: string;
  question: string;
  codeSnippet: string | null;
  options: string[] | null;
  correctAnswer: string;
  starterCode: string | null;
  testCases: string | null;
  explanation: string | null;
  progress: { isCorrect: boolean; aiEvaluation: string | null } | null;
}

const CODE_TYPES = new Set(["code_write", "fix_bug"]);
const READONLY_CODE_TYPES = new Set(["code_output"]);

const DIFF_COLORS: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-900/30",
  medium: "text-amber-400 bg-amber-900/30",
  hard: "text-red-400 bg-red-900/30",
};

const TYPE_LABELS: Record<string, string> = {
  code_output: "Code Output",
  fix_bug: "Fix the Bug",
  code_write: "Write Code",
  concept: "Concept",
  best_practice: "Best Practice",
  multiple_choice: "Multiple Choice",
  system_design: "System Design",
};

function UnitPageContent() {
  const params = useSearchParams();
  const unitId = params.get("unitId") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; evaluation: string; testResults?: Array<{ description: string; passed: boolean; expected: string; got: string }> } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!unitId) return;
    fetch(`/api/training/progress?unitId=${unitId}`)
      .then((r) => r.json())
      .then((data) => {
        const qs: Question[] = Array.isArray(data) ? data : [];
        setQuestions(qs);
        const idx = qs.findIndex((q) => !q.progress);
        const startIdx = idx >= 0 ? idx : 0;
        setCurrent(startIdx);
        const startQ = qs[startIdx];
        if (startQ && CODE_TYPES.has(startQ.type)) {
          setUserAnswer(startQ.type === "fix_bug" ? (startQ.codeSnippet ?? "") : (startQ.starterCode ?? ""));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unitId]);

  const q = questions[current];
  const answered = questions.filter((q) => q.progress).length;
  const correct = questions.filter((q) => q.progress?.isCorrect).length;

  async function retryQuestion() {
    if (!q) return;
    setFeedback(null);
    setShowExplanation(false);
    setUserAnswer(CODE_TYPES.has(q.type) ? (q.type === "fix_bug" ? (q.codeSnippet ?? "") : (q.starterCode ?? "")) : "");
    try {
      await fetch(`/api/training/progress?questionId=${q.id}`, { method: "DELETE" });
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, progress: null } : item))
      );
    } catch { /* ignore */ }
  }

  async function submitAnswer() {
    if (!q || !userAnswer.trim()) return;
    setChecking(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/training/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, userAnswer: userAnswer.trim() }),
      });
      const result = await res.json();
      setFeedback(result);
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, progress: { isCorrect: result.isCorrect, aiEvaluation: result.evaluation } }
            : item
        )
      );
    } catch { /* ignore */ }
    setChecking(false);
  }

  function getInitialCode(q: Question) {
    if (q.type === "fix_bug") return q.codeSnippet ?? "";
    if (q.type === "code_write") return q.starterCode ?? "";
    return "";
  }

  function nextQuestion() {
    const next = Math.min(current + 1, questions.length - 1);
    const nextQ = questions[next];
    setUserAnswer(CODE_TYPES.has(nextQ?.type) ? getInitialCode(nextQ) : "");
    setFeedback(null);
    setShowExplanation(false);
    setCurrent(next);
  }

  function prevQuestion() {
    const prev = Math.max(current - 1, 0);
    const prevQ = questions[prev];
    setUserAnswer(CODE_TYPES.has(prevQ?.type) ? getInitialCode(prevQ) : "");
    setFeedback(null);
    setShowExplanation(false);
    setCurrent(prev);
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading questions...</div>;
  if (questions.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-400 mb-4">No questions generated for this unit yet.</p>
        <Link href="/training" className="text-amber-400 hover:text-amber-300">Back to Training</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/training" className="text-gray-400 hover:text-white text-sm">&larr; Back to Training</Link>
        <div className="text-sm text-gray-400">
          {correct}/{questions.length} correct &middot; {answered} attempted
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {questions.map((item, i) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrent(i);
              const clickedQ = questions[i];
              setUserAnswer(CODE_TYPES.has(clickedQ?.type) ? (clickedQ.type === "fix_bug" ? (clickedQ.codeSnippet ?? "") : (clickedQ.starterCode ?? "")) : "");
              setFeedback(null);
              setShowExplanation(false);
            }}
            className={`w-3 h-3 rounded-full transition-all ${
              i === current ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-900" : ""
            } ${
              item.progress?.isCorrect ? "bg-emerald-500" :
              item.progress ? "bg-red-500" : "bg-gray-600"
            }`}
          />
        ))}
      </div>

      {q && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-gray-500">
              {current + 1}/{questions.length}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || "text-gray-400 bg-gray-700"}`}>
              {q.difficulty}
            </span>
            <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">
              {TYPE_LABELS[q.type] || q.type}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-lg font-semibold text-white mb-4 leading-relaxed">{q.question}</h2>

          {/* Code snippet (read-only display for code_output and non-code types) */}
          {q.codeSnippet && !CODE_TYPES.has(q.type) && (
            READONLY_CODE_TYPES.has(q.type) ? (
              <div className="mb-4">
                <Suspense fallback={<pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{q.codeSnippet}</pre>}>
                  <CodeEditor
                    value={q.codeSnippet}
                    onChange={() => {}}
                    readOnly
                    showRunButton={false}
                    defaultHeight={450}
                    resizable
                  />
                </Suspense>
              </div>
            ) : (
              <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {q.codeSnippet}
              </pre>
            )
          )}

          {/* Answer input: code editor for code types, buttons for MC, textarea for rest */}
          {CODE_TYPES.has(q.type) ? (
            <div className="mb-4">
              <Suspense fallback={<div className="h-[550px] bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500 text-sm">Loading editor...</div>}>
                <CodeEditor
                  value={userAnswer || ""}
                  onChange={(v) => setUserAnswer(v)}
                  defaultValue={q.type === "fix_bug" ? (q.codeSnippet ?? "") : (q.starterCode ?? "")}
                  readOnly={!!feedback}
                  defaultHeight={550}
                  resizable
                  language="typescript"
                  showRunButton={q.type === "code_write"}
                />
              </Suspense>
            </div>
          ) : q.options && q.options.length > 0 ? (
            <div className="space-y-2 mb-4">
              {q.options.map((opt, i) => {
                const letter = opt.charAt(0).toUpperCase();
                const isSelected = userAnswer === letter || userAnswer === opt;
                return (
                  <button
                    key={i}
                    onClick={() => setUserAnswer(letter)}
                    disabled={!!feedback}
                    className={`w-full text-left p-3 rounded-lg border transition text-sm ${
                      isSelected
                        ? "border-amber-500 bg-amber-900/30 text-white"
                        : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500"
                    } ${feedback ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={!!feedback}
              placeholder="Type your answer here..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-y mb-4"
            />
          )}

          {/* Submit / Feedback */}
          {!feedback && !q.progress ? (
            <button
              onClick={submitAnswer}
              disabled={checking || !userAnswer.trim()}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition text-sm"
            >
              {checking ? "Checking..." : "Submit Answer"}
            </button>
          ) : (
            <div className="space-y-3">
              {(feedback || q.progress) && (
                <div
                  className={`rounded-lg p-4 border ${
                    (feedback?.isCorrect ?? q.progress?.isCorrect)
                      ? "bg-emerald-900/30 border-emerald-600"
                      : "bg-red-900/30 border-red-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-lg ${(feedback?.isCorrect ?? q.progress?.isCorrect) ? "text-emerald-400" : "text-red-400"}`}>
                      {(feedback?.isCorrect ?? q.progress?.isCorrect) ? "✓ Correct!" : "✗ Incorrect"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {feedback?.evaluation ?? q.progress?.aiEvaluation}
                  </p>
                </div>
              )}

              {feedback?.testResults && feedback.testResults.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2 font-medium">
                    Test Results ({feedback.testResults.filter((t) => t.passed).length}/{feedback.testResults.length} passed)
                  </div>
                  <div className="space-y-1">
                    {feedback.testResults.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-mono">
                        <span className={t.passed ? "text-emerald-400" : "text-red-400"}>
                          {t.passed ? "PASS" : "FAIL"}
                        </span>
                        <span className="text-gray-400">{t.description}</span>
                        {!t.passed && (
                          <span className="text-gray-600 ml-auto">expected: {t.expected}, got: {t.got}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.explanation && (
                <div>
                  <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    {showExplanation ? "Hide" : "Show"} detailed explanation
                  </button>
                  {showExplanation && (
                    <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                      {q.explanation}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={retryQuestion}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
                >
                  Try again
                </button>
                <button
                  onClick={prevQuestion}
                  disabled={current === 0}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm transition"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={current === questions.length - 1}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm transition"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UnitPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
      <UnitPageContent />
    </Suspense>
  );
}
