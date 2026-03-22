/**
 * Seed mock data for local development: jobs, summary, meta_summary, training.
 * Run: npx tsx scripts/seed-mock.ts
 */
import { db } from "../lib/db";
import { jobs, summaries, metaSummary, trainingUnits, trainingQuestions } from "../lib/schema";
import { v4 as uuid } from "uuid";

const now = new Date().toISOString();

const MOCK_JOBS = [
  {
    id: uuid(),
    source: "djinni" as const,
    sourceUrl: "https://djinni.co/jobs/1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    level: "Senior",
    type: "Full-time",
    salaryMin: 4000,
    salaryMax: 6000,
    salaryCurrency: "USD",
    experience: "3+ years",
    location: "Kyiv",
    remote: "Hybrid",
    technologies: JSON.stringify(["React", "TypeScript", "Next.js", "Node.js"]),
    description: "We are looking for a Senior Frontend Developer...",
    requirements: "Strong React, TypeScript, 3+ years experience",
    publishedAt: now,
    parsedAt: now,
  },
  {
    id: uuid(),
    source: "djinni" as const,
    sourceUrl: "https://djinni.co/jobs/2",
    title: "Fullstack Developer (React + Node)",
    company: "StartupXYZ",
    level: "Middle",
    type: "Full-time",
    salaryMin: 2500,
    salaryMax: 4000,
    salaryCurrency: "USD",
    experience: "2+ years",
    location: "Remote",
    remote: "Full remote",
    technologies: JSON.stringify(["React", "Node.js", "PostgreSQL", "TypeScript"]),
    description: "Join our team to build amazing products...",
    requirements: "React, Node.js, SQL",
    publishedAt: now,
    parsedAt: now,
  },
  {
    id: uuid(),
    source: "dou" as const,
    sourceUrl: "https://jobs.dou.ua/1",
    title: "Frontend Developer",
    company: "ProductCo",
    level: "Middle",
    type: "Full-time",
    salaryMin: 3000,
    salaryMax: 5000,
    salaryCurrency: "USD",
    experience: "2-5 years",
    location: "Lviv",
    remote: "Office",
    technologies: JSON.stringify(["Vue", "JavaScript", "REST API"]),
    description: "Frontend developer for web applications...",
    requirements: "Vue.js, JavaScript, CSS",
    publishedAt: now,
    parsedAt: now,
  },
  {
    id: uuid(),
    source: "djinni" as const,
    sourceUrl: "https://djinni.co/jobs/3",
    title: "Senior Frontend Engineer",
    company: "BigTech",
    level: "Senior",
    type: "Full-time",
    salaryMin: 5000,
    salaryMax: 8000,
    salaryCurrency: "USD",
    experience: "5+ years",
    location: "Remote",
    remote: "Full remote",
    technologies: JSON.stringify(["React", "TypeScript", "GraphQL", "Jest"]),
    description: "Lead frontend architecture...",
    requirements: "React, TypeScript, testing, leadership",
    publishedAt: now,
    parsedAt: now,
  },
  {
    id: uuid(),
    source: "djinni" as const,
    sourceUrl: "https://djinni.co/jobs/4",
    title: "Fullstack Developer",
    company: "AgencyPro",
    level: "Middle",
    type: "Contract",
    salaryMin: 3500,
    salaryMax: 5500,
    salaryCurrency: "USD",
    experience: "3+ years",
    location: "Kyiv",
    remote: "Hybrid",
    technologies: JSON.stringify(["React", "Node.js", "MongoDB", "Redis"]),
    description: "Fullstack development for client projects...",
    requirements: "React, Node, MongoDB",
    publishedAt: now,
    parsedAt: now,
  },
];

const MOCK_SUMMARIES = [
  {
    id: uuid(),
    position: "Frontend Senior",
    jobCount: 3,
    avgSalaryMin: 4000,
    avgSalaryMax: 6300,
    salaryCurrency: "USD",
    avgExperienceYears: 3.5,
    techScores: JSON.stringify({
      React: 9.2,
      TypeScript: 8.8,
      "Next.js": 6.5,
      "Node.js": 5.2,
      Jest: 4.0,
    }),
    topRequirements: JSON.stringify(["3+ years experience", "Code review", "Agile", "Teamwork"]),
    topBackendTech: JSON.stringify(["Node.js", "PostgreSQL", "GraphQL"]),
    rawAnalysis: JSON.stringify({
      techScores: { React: 9.2, TypeScript: 8.8, "Next.js": 6.5, "Node.js": 5.2 },
      topRequirements: ["3+ years experience", "Code review", "Agile"],
      insights: "Strong demand for React + TypeScript. Next.js gaining traction.",
    }),
    generatedAt: now,
  },
  {
    id: uuid(),
    position: "Fullstack Middle",
    jobCount: 2,
    avgSalaryMin: 3000,
    avgSalaryMax: 4750,
    salaryCurrency: "USD",
    avgExperienceYears: 2.5,
    techScores: JSON.stringify({
      React: 8.5,
      "Node.js": 8.0,
      TypeScript: 7.5,
      PostgreSQL: 6.0,
      MongoDB: 4.5,
    }),
    topRequirements: JSON.stringify(["2+ years", "REST API", "Databases"]),
    topBackendTech: JSON.stringify(["Node.js", "PostgreSQL", "MongoDB", "Redis"]),
    rawAnalysis: JSON.stringify({
      techScores: { React: 8.5, "Node.js": 8.0, TypeScript: 7.5 },
      topRequirements: ["2+ years", "REST API"],
      insights: "Fullstack roles prefer React + Node stack.",
    }),
    generatedAt: now,
  },
];

const MOCK_META_SUMMARY = {
  id: "meta-1",
  content: `PART 1 — Tech stack by position:
Frontend Senior: React 92%, TypeScript 88%, Next.js 65%, Node.js 52%, Jest 40%
Fullstack Middle: React 85%, Node.js 80%, TypeScript 75%, PostgreSQL 60%, MongoDB 45%

PART 2 — Overall:
In general: React ~88%, TypeScript ~82%, Node.js ~65%. Salary $3000-$8000. Common: 2-5 yrs exp, Agile, teamwork.`,
  generatedAt: now,
};

const UNIT_REACT = uuid();
const UNIT_TS = uuid();

const MOCK_TRAINING_UNITS = [
  {
    id: UNIT_REACT,
    slug: "react-hooks",
    title: "React & Hooks",
    description: "Components, hooks, re-renders. Senior-level React patterns.",
    techKey: "react",
    relevanceScore: 9,
    questionCount: 3,
    sortOrder: 0,
    createdAt: now,
  },
  {
    id: UNIT_TS,
    slug: "typescript",
    title: "TypeScript",
    description: "Utility types, generics, type guards.",
    techKey: "typescript",
    relevanceScore: 8,
    questionCount: 2,
    sortOrder: 1,
    createdAt: now,
  },
];

const MOCK_TRAINING_QUESTIONS = [
  {
    id: uuid(),
    unitId: UNIT_REACT,
    type: "concept" as const,
    difficulty: "medium" as const,
    question: "Explain useRef — when would you use it over useState?",
    codeSnippet: null,
    options: null,
    correctAnswer: "useRef persists across re-renders without triggering them. Use for DOM refs, timers, mutable values that don't affect render.",
    idealAnswer: "useRef returns a mutable object that persists. Use for DOM refs, storing previous values, or values that don't need to trigger re-render.",
    testCases: null,
    starterCode: null,
    explanation: "useRef is for values you need to mutate without causing re-renders.",
    audioPath: null,
    createdAt: now,
  },
  {
    id: uuid(),
    unitId: UNIT_REACT,
    type: "concept" as const,
    difficulty: "easy" as const,
    question: "What is the purpose of React.memo?",
    codeSnippet: null,
    options: null,
    correctAnswer: "Prevents re-renders when props are shallowly equal.",
    idealAnswer: "React.memo is a HOC that memoizes a component and only re-renders when props change (shallow comparison).",
    testCases: null,
    starterCode: null,
    explanation: "React.memo skips re-renders if props are the same.",
    audioPath: null,
    createdAt: now,
  },
  {
    id: uuid(),
    unitId: UNIT_REACT,
    type: "best_practice" as const,
    difficulty: "hard" as const,
    question: "When would you use useCallback vs useMemo?",
    codeSnippet: null,
    options: null,
    correctAnswer: "useCallback memoizes functions, useMemo memoizes values. useCallback(fn, deps) === useMemo(() => fn, deps).",
    idealAnswer: "useCallback for functions passed to child components to prevent unnecessary re-renders. useMemo for expensive computations.",
    testCases: null,
    starterCode: null,
    explanation: "Both prevent recreation; useCallback specifically for function identity.",
    audioPath: null,
    createdAt: now,
  },
  {
    id: uuid(),
    unitId: UNIT_TS,
    type: "concept" as const,
    difficulty: "medium" as const,
    question: "What is the difference between 'interface' and 'type' in TypeScript?",
    codeSnippet: null,
    options: null,
    correctAnswer: "interface supports declaration merging; type can represent unions/intersections. Both can extend each other.",
    idealAnswer: "interface: can be extended, declaration merging. type: unions, intersections, mapped types. Prefer interface for objects.",
    testCases: null,
    starterCode: null,
    explanation: "interface supports declaration merging; type is more flexible for unions.",
    audioPath: null,
    createdAt: now,
  },
  {
    id: uuid(),
    unitId: UNIT_TS,
    type: "code_output" as const,
    difficulty: "easy" as const,
    question: "What will this output? const x: unknown = 'hello'; console.log((x as string).length);",
    codeSnippet: "const x: unknown = 'hello';\nconsole.log((x as string).length);",
    options: null,
    correctAnswer: "5",
    idealAnswer: "5 — we cast unknown to string, 'hello' has 5 chars.",
    testCases: null,
    starterCode: null,
    explanation: "Type assertion (as string) tells TS to treat x as string. 'hello'.length === 5.",
    audioPath: null,
    createdAt: now,
  },
];

async function seed() {
  console.log("Seeding mock data...");

  // Jobs
  for (const j of MOCK_JOBS) {
    try {
      await db.insert(jobs).values(j);
    } catch {
      // skip if duplicate
    }
  }
  console.log(`  ✓ ${MOCK_JOBS.length} jobs`);

  // Meta summary (clear old, insert new)
  await db.delete(metaSummary);
  await db.insert(metaSummary).values(MOCK_META_SUMMARY);
  console.log("  ✓ meta_summary");

  // Summaries (clear old, insert new)
  await db.delete(summaries);
  for (const s of MOCK_SUMMARIES) {
    await db.insert(summaries).values(s);
  }
  console.log(`  ✓ ${MOCK_SUMMARIES.length} summaries`);

  // Training (only if empty)
  const existingUnits = await db.select().from(trainingUnits).limit(1);
  if (existingUnits.length === 0) {
    for (const u of MOCK_TRAINING_UNITS) {
      await db.insert(trainingUnits).values(u);
    }
    for (const q of MOCK_TRAINING_QUESTIONS) {
      await db.insert(trainingQuestions).values(q);
    }
    console.log(`  ✓ ${MOCK_TRAINING_UNITS.length} training units, ${MOCK_TRAINING_QUESTIONS.length} questions`);
  } else {
    console.log("  ⊘ training already has data, skip");
  }

  console.log("Done! Open http://localhost:3002 — Jobs, Summary, Training should have data.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
