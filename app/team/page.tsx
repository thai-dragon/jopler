"use client";

const TEAM_MEMBERS = [
  { name: "Valerii K.", email: "valerophob@gmail.com", avatar: "VK", color: "from-amber-500 to-orange-600" },
  { name: "Team Member 2", email: "pending@invite.com", avatar: "T2", color: "from-blue-500 to-cyan-600" },
  { name: "Team Member 3", email: "pending@invite.com", avatar: "T3", color: "from-emerald-500 to-teal-600" },
  { name: "Team Member 4", email: "pending@invite.com", avatar: "T4", color: "from-purple-500 to-pink-600" },
];

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1f2937" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke={`url(#grad-${color})`}
        strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color === "amber" ? "#f59e0b" : color === "blue" ? "#3b82f6" : color === "emerald" ? "#10b981" : "#a855f7"} />
          <stop offset="100%" stopColor={color === "amber" ? "#ea580c" : color === "blue" ? "#06b6d4" : color === "emerald" ? "#14b8a6" : "#ec4899"} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TeamPage() {
  const colors = ["amber", "blue", "emerald", "purple"];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Training progress across all team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TEAM_MEMBERS.map((m, i) => {
          const isActive = i === 0;
          const pct = isActive ? 12 : 0;
          const lastTopic = isActive ? "React & Hooks" : "—";
          const questionsAnswered = isActive ? 3 : 0;

          return (
            <div
              key={i}
              className={`relative rounded-xl border p-6 transition ${
                isActive
                  ? "bg-gray-800/60 border-gray-700"
                  : "bg-gray-900/40 border-gray-800/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-5">
                <div className="relative">
                  <ProgressRing pct={pct} color={colors[i]} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{pct}%</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-xs font-bold text-white`}>
                      {m.avatar}
                    </div>
                    <h3 className="font-semibold text-white truncate">{m.name}</h3>
                    {!isActive && (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Invited</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Last topic</span>
                      <span className="text-gray-300">{lastTopic}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Questions answered</span>
                      <span className="text-gray-300">{questionsAnswered}</span>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
