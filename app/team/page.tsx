"use client";

import { useEffect, useState } from "react";

type Member = {
  email: string;
  name: string;
  avatar: string;
  color: string;
  questionsAnswered: number;
  lastTopic: string;
  pct: number;
};

function ProgressRing({ pct, color, id }: { pct: number; color: string; id: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2937" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke={`url(#grad-${id})`}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color === "amber" ? "#f59e0b" : color === "blue" ? "#3b82f6" : color === "emerald" ? "#10b981" : "#a855f7"} />
          <stop offset="100%" stopColor={color === "amber" ? "#ea580c" : color === "blue" ? "#06b6d4" : color === "emerald" ? "#14b8a6" : "#ec4899"} />
        </linearGradient>
      </defs>
    </svg>
  );
}

const COLORS = ["amber", "blue", "emerald", "purple"];

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Training progress across all team members</p>
      </div>

      {members.length === 0 ? (
        <p className="text-gray-500 text-sm">No team members yet. Add emails in Access.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {members.map((m, i) => (
            <div
              key={m.email}
              className="relative rounded-xl border p-6 transition bg-gray-800/60 border-gray-700"
            >
              <div className="flex items-center gap-5">
                <div className="relative">
                  <ProgressRing pct={m.pct} color={COLORS[i % COLORS.length]} id={`team-${i}`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{m.pct}%</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-xs font-bold text-white`}>
                      {m.avatar}
                    </div>
                    <h3 className="font-semibold text-white truncate">{m.name}</h3>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Last topic</span>
                      <span className="text-gray-300">{m.lastTopic}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Questions answered</span>
                      <span className="text-gray-300">{m.questionsAnswered}</span>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
