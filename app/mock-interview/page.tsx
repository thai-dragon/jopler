"use client";

import { useEffect, useState, useRef } from "react";

const DEFAULT_SELECTED_SLUGS = ["react-hooks", "typescript", "javascript-core", "css-layout", "nodejs-backend"];

interface Unit {
  id: string;
  slug: string;
  title: string;
  questionCount: number;
}

interface Question {
  id: string;
  question: string;
  codeSnippet: string | null;
  idealAnswer: string;
  options: string[] | null;
  audioPath?: string | null;
}

interface ChatMessage {
  role: "assistant" | "user" | "evaluation";
  content: string;
  codeSnippet?: string | null;
  options?: string[] | null;
  score?: number;
  verdict?: string;
  explanation?: string;
  correctAnswer?: string;
}

export default function MockInterviewPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [prefetchedQuestions, setPrefetchedQuestions] = useState<Question[]>([]);
  const prefetchedForRef = useRef<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const preloadedRef = useRef<{ index: number; url: string; questionId?: string } | null>(null);
  const preloadRequestRef = useRef<number | null>(null);
  const ttsInFlightRef = useRef<{ key: string; promise: Promise<string> } | null>(null);
  const speakIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/training/units")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setUnits(list);
        const ids = new Set(
          list.filter((u: Unit) => DEFAULT_SELECTED_SLUGS.includes(u.slug)).map((u: Unit) => u.id)
        );
        setSelectedIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedIds.size === 0 || interviewStarted) return;
    const idsKey = Array.from(selectedIds).sort().join(",");
    let cancelled = false;
    fetch(`/api/mock-interview/questions?unitIds=${idsKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const qs = Array.isArray(data) ? data : [];
        prefetchedForRef.current = idsKey;
        setPrefetchedQuestions(qs);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedIds, interviewStarted]);

  const selectedUnits = units.filter((u) => selectedIds.has(u.id));
  const visibleUnits = showAllTopics ? units : selectedUnits;
  const totalQuestions = selectedUnits.reduce((s, u) => s + u.questionCount, 0);

  function toggleTopic(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startInterview() {
    if (selectedIds.size === 0) return;
    const idsKey = Array.from(selectedIds).sort().join(",");
    const usePrefetched = prefetchedForRef.current === idsKey && prefetchedQuestions.length > 0;
    setLoading(true);
    try {
      let qs: Question[];
      if (usePrefetched) {
        qs = prefetchedQuestions;
      } else {
        const res = await fetch(
          `/api/mock-interview/questions?unitIds=${idsKey}`
        );
        const data = await res.json();
        qs = Array.isArray(data) ? data : [];
      }
      if (qs.length === 0) {
        alert("No questions found. Generate training first.");
        return;
      }
      if (!usePrefetched && preloadedRef.current) {
        URL.revokeObjectURL(preloadedRef.current.url);
        preloadedRef.current = null;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setSessionScores([]);
      setSessionComplete(false);
      setMessages([
        {
          role: "assistant",
          content: qs[0]?.question || "No questions available.",
          codeSnippet: qs[0]?.codeSnippet ?? null,
          options: qs[0]?.options ?? null,
        },
      ]);
      setInterviewStarted(true);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;
  const avgScore =
    sessionScores.length > 0
      ? (sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length).toFixed(1)
      : null;

  async function submitAnswer(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || !currentQ || evaluating) return;
    const userAnswer = text;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userAnswer }]);
    setEvaluating(true);

    try {
      const res = await fetch("/api/mock-interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ.question,
          codeSnippet: currentQ.codeSnippet ?? null,
          idealAnswer: currentQ.idealAnswer,
          userAnswer,
        }),
      });
      const data = await res.json();
      const score = Math.min(10, Math.max(0, Number(data.score) ?? 5));
      setSessionScores((prev) => [...prev, score]);
      setMessages((prev) => [
        ...prev,
        {
          role: "evaluation",
          content: `${data.verdict || "It's normal answer"} (${score}/10)`,
          verdict: data.verdict,
          score,
          explanation: data.explanation,
          correctAnswer: data.correctAnswer,
        },
      ]);

      if (isLast) {
        setSessionComplete(true);
      } else {
        const nextQ = questions[currentIndex + 1];
        setCurrentIndex((i) => i + 1);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: nextQ.question, codeSnippet: nextQ.codeSnippet ?? null, options: nextQ.options ?? null },
        ]);
      }
    } catch { /* ignore */ }
    setEvaluating(false);
  }

  function resetInterview() {
    setInterviewStarted(false);
    setQuestions([]);
    setMessages([]);
    setCurrentIndex(0);
    setSessionScores([]);
    setSessionComplete(false);
    if (preloadedRef.current) {
      URL.revokeObjectURL(preloadedRef.current.url);
      preloadedRef.current = null;
    }
  }

  async function fetchTTS(text: string): Promise<string> {
    const res = await fetch("/api/speech/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  function fetchTTSDeduped(text: string, index: number, questionId?: string): Promise<string> {
    const key = `${index}-${questionId ?? ""}`;
    if (ttsInFlightRef.current?.key === key) return ttsInFlightRef.current.promise;
    const promise = fetchTTS(text).finally(() => {
      if (ttsInFlightRef.current?.key === key) ttsInFlightRef.current = null;
    });
    ttsInFlightRef.current = { key, promise };
    return promise;
  }

  useEffect(() => {
    if (interviewStarted || prefetchedQuestions.length === 0) return;
    const q0 = prefetchedQuestions[0];
    if (!q0?.question) return;
    if (q0.audioPath && !q0.codeSnippet) return;
    if (preloadedRef.current?.index === 0 && preloadedRef.current?.questionId === q0.id) return;
    if (preloadedRef.current) {
      URL.revokeObjectURL(preloadedRef.current.url);
      preloadedRef.current = null;
    }
    const text = q0.question;
    const q0Id = q0.id;
    preloadRequestRef.current = 0;
    fetchTTSDeduped(text, 0, q0Id).then((url) => {
      if (preloadRequestRef.current === 0) {
        preloadedRef.current = { index: 0, url, questionId: q0Id };
      } else {
        URL.revokeObjectURL(url);
      }
    }).catch(() => {});
  }, [interviewStarted, prefetchedQuestions]);

  function cancelSpeak() {
    speakIdRef.current += 1;
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  }

  async function speakQuestion() {
    if (!currentQ?.question) return;
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    const myId = ++speakIdRef.current;
    setSpeaking(true);
    try {
      let url: string;
      const qId = currentQ.id;
      const text = currentQ.question;
      const hasCode = !!currentQ.codeSnippet;
      if (!hasCode && currentQ.audioPath) {
        url = currentQ.audioPath;
      } else if (preloadedRef.current?.index === currentIndex && (!qId || preloadedRef.current.questionId === qId)) {
        url = preloadedRef.current.url;
        preloadedRef.current = null;
      } else {
        url = await fetchTTSDeduped(text, currentIndex, qId);
      }
      if (myId !== speakIdRef.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      const revoke = () => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      };
      audio.onended = () => {
        revoke();
        if (myId === speakIdRef.current) setSpeaking(false);
      };
      audio.onerror = () => {
        revoke();
        if (myId === speakIdRef.current) setSpeaking(false);
      };
      await audio.play();
    } catch {
      if (myId === speakIdRef.current) setSpeaking(false);
    }
  }

  function preloadNextQuestion() {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) return;
    const nextQ = questions[nextIdx];
    if (!nextQ?.question) return;
    if (nextQ.audioPath && !nextQ.codeSnippet) return;
    const text = nextQ.question;
    if (preloadedRef.current?.index === nextIdx) return;
    if (preloadedRef.current) {
      URL.revokeObjectURL(preloadedRef.current.url);
    }
    preloadRequestRef.current = nextIdx;
    fetchTTSDeduped(text, nextIdx, nextQ.id).then((url) => {
      if (preloadRequestRef.current === nextIdx) {
        preloadedRef.current = { index: nextIdx, url };
      } else {
        URL.revokeObjectURL(url);
      }
    }).catch(() => {});
  }

  useEffect(() => {
    if (autoSpeak && interviewStarted && currentQ && !sessionComplete) {
      const delay = currentIndex === 0 ? 100 : 1500;
      const t = setTimeout(() => speakQuestion(), delay);
      preloadNextQuestion();
      return () => {
        clearTimeout(t);
        speakIdRef.current += 1;
        abortRef.current?.abort();
        audioRef.current?.pause();
        audioRef.current = null;
      };
    }
  }, [autoSpeak, interviewStarted, currentIndex, sessionComplete, questions]);

  useEffect(() => {
    return () => {
      if (preloadedRef.current) {
        URL.revokeObjectURL(preloadedRef.current.url);
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function toggleRecord() {
    cancelSpeak();
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (chunks.length === 0) return;
        setTranscribing(true);
        const blob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        fetch("/api/speech/transcribe", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((json) => {
            if (json.text) {
              submitAnswer(json.text);
            }
          })
          .catch(() => {})
          .finally(() => setTranscribing(false));
      };
      recorder.start();
      setIsRecording(true);
    } catch { /* ignore */ }
  }

  if (loading && units.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-4xl mx-auto ${interviewStarted ? "h-[calc(100vh-5rem)] flex flex-col overflow-hidden" : ""}`}>
      <h1 className="text-2xl font-bold mb-2 shrink-0" style={{ color: "var(--color-text)" }}>Mock Interview</h1>
      <p className="text-gray-400 text-sm mb-6 shrink-0">
        Practice with AI-evaluated answers. Select topics and start the interview.
      </p>

      {!interviewStarted ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={startInterview}
              disabled={selectedIds.size === 0 || loading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {loading ? "Starting..." : "Start mock interview"}
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                {showAllTopics ? "All topics" : "Selected topics"}
              </span>
              <button
                onClick={() => setShowAllTopics(!showAllTopics)}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                {showAllTopics ? "Hide" : "Show more"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleUnits.length === 0 ? (
                <span className="text-gray-500 text-sm">Show selected topics</span>
              ) : (
                visibleUnits.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleTopic(u.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedIds.has(u.id)
                        ? "bg-amber-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {u.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <p className="text-xs text-gray-500">
              {totalQuestions} questions from {selectedIds.size} topic(s)
            </p>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Question {currentIndex + 1} of {questions.length}
                {sessionScores.length > 0 && ` · Avg: ${avgScore}/10`}
              </span>
              {currentQ?.question && (
                <button
                  onClick={() => {
                    setAutoSpeak((prev) => {
                      const next = !prev;
                      cancelSpeak();
                      if (next) speakQuestion();
                      return next;
                    });
                  }}
                  title={autoSpeak ? "Auto-speak on (Gemini TTS)" : "Auto-speak off (click to turn on)"}
                  className={`p-1.5 rounded transition ${
                    autoSpeak ? "text-amber-400 bg-amber-900/40" : "text-gray-500 hover:text-amber-400 hover:bg-gray-700"
                  } ${speaking ? "animate-pulse" : ""}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </button>
              )}
            </div>
            {sessionComplete && (
              <button
                onClick={resetInterview}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                New interview
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
              <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "assistant"
                      ? ""
                      : m.role === "user"
                        ? "text-gray-300 ml-4"
                        : "text-amber-300/90 text-sm border-l-2 border-amber-500/50 pl-3"
                  }
                  style={m.role === "assistant" ? { color: "var(--color-text)" } : undefined}
                >
                  {m.role === "evaluation" ? (
                    <div>
                      <div className="font-medium">{m.content}</div>
                      {m.explanation && (
                        <div className="text-gray-400 text-xs mt-1">{m.explanation}</div>
                      )}
                      {m.correctAnswer && (
                        <div className="mt-2 p-2 bg-emerald-900/30 border-l-2 border-emerald-500 rounded-r text-xs text-emerald-200">
                          <span className="font-semibold text-emerald-400">Correct answer:</span>{" "}
                          {m.correctAnswer}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="whitespace-pre-wrap">{m.role === "assistant" ? "Q. " : m.role === "user" ? "A. " : ""}{m.content}</div>
                      {m.options && m.options.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                          <p className="text-amber-400/90 text-xs font-medium mb-2">Consider these statements. Which is correct? Explain your reasoning:</p>
                          <ul className="space-y-1 text-gray-400 text-sm">
                            {m.options.map((opt, j) => {
                              const trimmed = String(opt).replace(/^[A-Za-z][\.\)]\s*/i, "").trim() || String(opt);
                              return <li key={j}>• {trimmed}</li>;
                            })}
                          </ul>
                        </div>
                      )}
                      {m.codeSnippet && (
                        <pre className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {m.codeSnippet}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
              </div>
            </div>

            {!sessionComplete && (
            <div className="flex flex-col gap-3 p-4 pt-2 shrink-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitAnswer();
                  }
                }}
                placeholder="Type your answer (or use microphone)..."
                rows={5}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-y min-h-[120px]"
                disabled={evaluating}
              />
              <div className="flex gap-3 justify-end items-stretch">
                <button
                  onClick={toggleRecord}
                  disabled={evaluating || transcribing}
                  title={transcribing ? "Transcribing..." : isRecording ? "Stop recording" : "Record voice"}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition border disabled:opacity-70 active:scale-95
                    ${isRecording ? "bg-red-600/90 hover:bg-red-600 text-white border-red-500/50 border" :
                    transcribing ? "bg-gray-700 text-amber-400 border-amber-600/30 border" :
                    "bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white border-gray-600 border"
                    }`}
                >
                  {transcribing ? (
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => submitAnswer()}
                  disabled={!input.trim() || evaluating || transcribing}
                  className="h-12 min-w-[6rem] px-6 rounded-xl font-medium text-sm flex items-center justify-center transition
                    bg-amber-600 hover:bg-amber-500 text-white
                    disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
                    active:scale-[0.98]"
                >
                  Send
                </button>
              </div>
            </div>
            )}

            {sessionComplete && (
            <div className="shrink-0 p-4 pt-0 border-t border-gray-700/50">
              <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-4 text-center">
              <div className="text-lg font-semibold text-amber-400">
                Session complete · Average score: {avgScore}/10
              </div>
              <button
                onClick={resetInterview}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm"
              >
                Start new interview
              </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
