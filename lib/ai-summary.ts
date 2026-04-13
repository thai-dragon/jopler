import { v4 as uuid } from "uuid";
import { db } from "./db";
import { jobs, summaries, metaSummary } from "./schema";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL = "gemini-2.5-flash";

const SUMMARY_PROMPT = `You are a job market analyst specializing in IT/tech positions.

You will receive a list of job postings for a specific position category (e.g. "Frontend Senior", "Fullstack Middle").

Analyze ALL jobs and return a JSON object with this EXACT structure:
{
  "position": "Frontend Senior",
  "jobCount": 42,
  "avgSalaryMin": 4000,
  "avgSalaryMax": 6000,
  "salaryCurrency": "USD",
  "avgExperienceYears": 5,
  "techScores": {
    "React": 9.2,
    "TypeScript": 8.8,
    "JavaScript": 9.5,
    "Next.js": 6.4,
    "Node.js": 5.1,
    "Redux": 4.2,
    "GraphQL": 3.8,
    "REST": 7.5,
    "CSS": 6.0,
    "Tailwind": 4.5,
    "Docker": 3.2,
    "AWS": 2.8,
    "Git": 8.0,
    "CI/CD": 3.5,
    "Jest": 4.0,
    "Vue": 1.2,
    "Angular": 0.8,
    "PostgreSQL": 2.5,
    "MongoDB": 1.8
  },
  "topRequirements": [
    "5+ years of experience with React",
    "Strong TypeScript knowledge",
    "Experience with SSR/SSG (Next.js)",
    "REST API integration",
    "Pixel-perfect UI from Figma"
  ],
  "topBackendTech": ["Node.js", "NestJS", "PostgreSQL", "Docker", "AWS"],
  "insights": "Most senior frontend positions require React + TypeScript as core stack. Next.js is becoming standard. About 40% mention fullstack responsibilities. Average salary range is $4000-$6000 for Ukraine-based remote."
}

RULES:
- techScores: 0.0 = never mentioned, 10.0 = in every single job posting. Score represents how frequently the technology appears across all postings.
- Include ALL technologies you find, not just the ones in the example.
- avgSalaryMin/Max: average across jobs that HAVE salary data. Use null if no salary data.
- avgExperienceYears: average minimum years required. Use null if not specified.
- topRequirements: top 5-10 most common requirements, with frequency context.
- topBackendTech: top backend technologies (for Fullstack positions especially).
- insights: 2-3 sentences about key market observations.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

type JobRow = typeof jobs.$inferSelect;

function groupJobs(allJobs: JobRow[]): Map<string, JobRow[]> {
  const groups = new Map<string, JobRow[]>();
  for (const job of allJobs) {
    const level = job.level ?? "Unknown";
    const type = job.type ?? "Unknown";
    const key = `${type} ${level}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(job);
  }
  return groups;
}

function jobToSummaryText(job: JobRow): string {
  const parts = [
    `Title: ${job.title}`,
    job.company ? `Company: ${job.company}` : null,
    job.salaryMin ? `Salary: $${job.salaryMin}-$${job.salaryMax ?? job.salaryMin}` : null,
    job.experience ? `Experience: ${job.experience}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.remote ? `Remote: ${job.remote}` : null,
    job.technologies ? `Technologies: ${job.technologies}` : null,
    job.description ? `Description: ${job.description.slice(0, 500)}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

async function generateForGroup(position: string, groupJobs: JobRow[], onProgress?: (msg: string) => void, filterSource?: string | null): Promise<void> {
  const log = onProgress ?? console.log;
  const jobTexts = groupJobs.map(jobToSummaryText).join("\n\n---\n\n");
  const userMessage = `Position category: ${position}\nTotal jobs: ${groupJobs.length}\n\n${jobTexts}`;

  log(`[AI] Sending ${groupJobs.length} jobs to Gemini (${MODEL}) for "${position}"...`);
  log(`[AI] Prompt size: ~${(userMessage.length / 1024).toFixed(1)}KB`);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SUMMARY_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 65536, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 2048 } },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const err = data.error as Record<string, unknown> | undefined;
      log(`[AI] ERROR for ${position}: ${err?.message || JSON.stringify(err) || res.statusText}`);
      return;
    }

    const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }> | undefined;
    // Skip thinking parts, get only text parts
    const textParts = candidates?.[0]?.content?.parts?.filter((p) => !p.thought) ?? [];
    const raw = textParts.map((p) => p.text).join("").trim();
    const finishReason = candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP") {
      log(`[AI] WARNING: finishReason=${finishReason} for ${position}`);
    }
    const usage = data.usageMetadata as Record<string, number> | undefined;
    log(`[AI] Response received. Tokens: ${usage?.promptTokenCount ?? "?"}→${usage?.candidatesTokenCount ?? "?"} (${usage?.totalTokenCount ?? "?"} total)`);

    if (!raw) {
      log(`[AI] WARNING: empty response for ${position}`);
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to fix truncated JSON by closing open braces/brackets
      let fixed = raw;
      const opens = (fixed.match(/\{/g) || []).length;
      const closes = (fixed.match(/\}/g) || []).length;
      // Trim trailing incomplete key/value, then close braces
      fixed = fixed.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
      for (let i = 0; i < opens - closes; i++) fixed += "}";
      try {
        parsed = JSON.parse(fixed);
        log(`[AI] Recovered truncated JSON for ${position}`);
      } catch {
        log(`[AI] WARNING: Invalid JSON for ${position}. First 300 chars: ${raw.substring(0, 300)}`);
        await db.insert(summaries).values({
          id: uuid(),
          position,
          jobCount: groupJobs.length,
          rawAnalysis: raw,
        });
        return;
      }
    }

    const techScores = parsed.techScores as Record<string, number> | undefined;
    if (techScores) {
      const sorted = Object.entries(techScores).sort((a, b) => b[1] - a[1]).slice(0, 8);
      log(`[AI] Top tech for "${position}": ${sorted.map(([t, s]) => `${t}:${s}`).join(", ")}`);
    }
    if (parsed.avgSalaryMin) log(`[AI] Salary: $${parsed.avgSalaryMin}-$${parsed.avgSalaryMax}`);
    if (parsed.insights) log(`[AI] Insight: ${String(parsed.insights).slice(0, 150)}`);

    await db.insert(summaries).values({
      id: uuid(),
      position,
      filterSource: filterSource ?? null,
      jobCount: groupJobs.length,
      avgSalaryMin: (parsed.avgSalaryMin as number) ?? null,
      avgSalaryMax: (parsed.avgSalaryMax as number) ?? null,
      salaryCurrency: (parsed.salaryCurrency as string) ?? null,
      avgExperienceYears: (parsed.avgExperienceYears as number) ?? null,
      techScores: JSON.stringify(parsed.techScores ?? {}),
      topRequirements: JSON.stringify(parsed.topRequirements ?? []),
      topBackendTech: JSON.stringify(parsed.topBackendTech ?? []),
      rawAnalysis: JSON.stringify(parsed),
    });

    log(`[AI] SAVED summary for "${position}" (${groupJobs.length} jobs)`);
  } catch (err) {
    log(`[AI] ERROR for ${position}: ${err}`);
  }
}

export async function generateAllSummaries(onProgress?: (msg: string) => void): Promise<number> {
  const log = onProgress ?? console.log;
  const allJobs = await db.select().from(jobs);
  log(`[AI Summary] Total jobs in DB: ${allJobs.length}`);

  if (allJobs.length === 0) return 0;

  if (!GOOGLE_API_KEY) {
    log(`[AI Summary] ERROR: GOOGLE_API_KEY not set in .env`);
    return 0;
  }

  const groups = groupJobs(allJobs);
  log(`[AI Summary] Position groups: ${[...groups.keys()].join(", ")}`);

  let count = 0;
  for (const [position, posJobs] of groups) {
    if (posJobs.length < 2) continue;
    log(`[AI Summary] Generating for: ${position} (${posJobs.length} jobs)`);
    await generateForGroup(position, posJobs, log);
    count++;
  }

  if (count > 0) {
    log(`[AI Summary] Generating meta-summary (overview of all positions)...`);
    await generateMetaSummary(log);
  }

  return count;
}

const META_PROMPT = `You are a job market analyst. You receive summaries of IT job positions with techScores (0-10 scale, 10 = in every job).

Output format — two parts:

PART 1 — Tech stack by position (percent = techScore × 10, e.g. 7.2 → 72%):
For each position, list top 5-7 technologies with %:
"Frontend Senior: React 95%, TypeScript 90%, Next.js 70%, Node.js 45%, Redux 40%"
"Fullstack Middle: React 85%, Node.js 80%, TypeScript 90%, PostgreSQL 55%, Docker 50%"
etc.

PART 2 — Overall (1-2 sentences):
"In general: Next.js ~70%, React ~90%, TypeScript ~85%. Salary $600-$8000. Common: 2-5 yrs exp, Agile, teamwork."

Use techScores from input: multiply by 10 for %. Be concise. English or Russian.`;

async function generateMetaSummary(onProgress?: (msg: string) => void): Promise<void> {
  const log = onProgress ?? console.log;
  const rows = await db.select().from(summaries);
  const input = rows.map((r) => {
    let raw: Record<string, unknown> = {};
    try { raw = r.rawAnalysis ? JSON.parse(r.rawAnalysis) : {}; } catch { /* ignore */ }
    return `${r.position} (${r.jobCount} jobs): salary $${raw.avgSalaryMin ?? "?"}-$${raw.avgSalaryMax ?? "?"}, top tech: ${JSON.stringify(raw.techScores ?? {})}, requirements: ${JSON.stringify(raw.topRequirements ?? [])}`;
  }).join("\n\n");

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: META_PROMPT }] },
        contents: [{ parts: [{ text: `Summaries:\n\n${input}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 1024 } },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
    const content = candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!res.ok || !content) {
      const err = data.error as Record<string, unknown> | undefined;
      log(`[AI] Meta-summary failed: ${err?.message || "empty"}`);
      return;
    }

    await db.delete(metaSummary);
    await db.insert(metaSummary).values({
      id: uuid(),
      content,
    });
    log(`[AI] Meta-summary saved`);
  } catch (err) {
    log(`[AI] Meta-summary ERROR: ${err}`);
  }
}

export type JobInput = {
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
};

export async function generateSummariesFromJobs(
  inputJobs: JobInput[],
  filterSource: string,
  onProgress?: (msg: string) => void,
): Promise<number> {
  const log = onProgress ?? console.log;

  if (inputJobs.length === 0) return 0;
  if (!GOOGLE_API_KEY) {
    log(`[AI Summary] ERROR: GOOGLE_API_KEY not set in .env`);
    return 0;
  }

  const jobRows = inputJobs.map((j) => ({
    ...j,
    id: "",
    source: "" as "djinni" | "dou",
    sourceUrl: "",
    requirements: null,
    publishedAt: null,
    parsedAt: null,
  })) as JobRow[];

  const groups = groupJobs(jobRows);
  log(`[AI Summary] Filtered jobs: ${inputJobs.length}, groups: ${[...groups.keys()].join(", ")}`);

  let count = 0;
  for (const [position, posJobs] of groups) {
    if (posJobs.length < 2) continue;
    log(`[AI Summary] Generating for: ${position} (${posJobs.length} jobs)`);
    await generateForGroup(position, posJobs, log, filterSource);
    count++;
  }

  return count;
}
