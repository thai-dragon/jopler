import { v4 as uuid } from "uuid";
import { db } from "./db";
import { trainingUnits, trainingQuestions, trainingProgress } from "./schema";
import { eq, and } from "drizzle-orm";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GENERATE_MODEL = "gpt-5.4";
const CHECK_MODEL = "gpt-4.1-mini";

export const THEMATIC_UNITS = [
  {
    slug: "react-hooks",
    title: "React & Hooks",
    description: "Components, hooks, re-renders, memo, refs, architecture (FSD, modular). Senior-level React patterns.",
    topic: "React: hooks (useState, useEffect, useRef, useMemo, useCallback), React.memo, re-render behavior, component architecture (FSD, modular), context, portals, suspense, error boundaries",
  },
  {
    slug: "typescript",
    title: "TypeScript",
    description: "Type system depth: utility types, generics, type guards, unknown vs any, interface vs type, conditional types.",
    topic: "TypeScript: utility types (Omit, Pick, Record, Partial, Required), generics, type guards with 'is', unknown vs any, interface vs type (declaration merging), conditional types, infer, mapped types, template literal types",
  },
  {
    slug: "javascript-core",
    title: "JavaScript Core",
    description: "Event loop, closures, promises, prototypes, deep copy, coercion, scope, this. The fundamentals that trip up seniors.",
    topic: "JavaScript: event loop (microtasks vs macrotasks, execution order), closures, promises (async/await, Promise.all/race/allSettled), prototypal inheritance, deep vs shallow copy, type coercion, 'this' binding, scope chain, WeakMap/WeakSet, generators, proxy",
  },
  {
    slug: "css-layout",
    title: "CSS & Layout",
    description: "Position, box-sizing, flexbox, grid, responsive design, units, critical CSS, specificity, BEM, animations.",
    topic: "CSS: all position values, box-sizing, flexbox vs grid, responsive design (rem/em/vw/vh), critical CSS, specificity calculation, BEM methodology, CSS animations/transitions, z-index stacking context, contain, will-change, custom properties",
  },
  {
    slug: "nextjs-ssr",
    title: "Next.js & SSR",
    description: "App Router, SSR/SSG/ISR, server components, data fetching, middleware, caching, streaming, edge runtime.",
    topic: "Next.js: App Router vs Pages Router, server components vs client components, SSR/SSG/ISR, data fetching patterns, middleware, caching strategies (revalidate, tags), streaming, edge runtime, parallel routes, intercepting routes, server actions",
  },
  {
    slug: "nodejs-backend",
    title: "Node.js & Express",
    description: "REST API design, Express middleware, auth patterns, streams, error handling, security, scaling.",
    topic: "Node.js: Express middleware chain, REST API design, authentication (JWT, sessions, OAuth), streams, error handling patterns, security (CORS, helmet, rate limiting, SQL injection, XSS), clustering, worker threads, event emitter",
  },
  {
    slug: "databases",
    title: "Databases",
    description: "PostgreSQL, MongoDB, queries, indexes, transactions, normalization, ORMs, query optimization.",
    topic: "Databases: PostgreSQL (joins, indexes, EXPLAIN, transactions, isolation levels, CTEs), MongoDB (aggregation pipeline, indexes, schema design), ORM patterns (Drizzle, Prisma), N+1 problem, query optimization, database normalization, ACID",
  },
  {
    slug: "devops-tools",
    title: "DevOps & Tools",
    description: "Git workflows, AWS services, CI/CD, Docker basics, deployment strategies.",
    topic: "DevOps: Git (rebase vs merge, cherry-pick, bisect, reflog, branching strategies), AWS (S3, EC2, Lambda, CloudFront, RDS, ECS), CI/CD pipelines, Docker (multi-stage builds, compose), deployment strategies (blue-green, canary, rolling)",
  },
  {
    slug: "architecture",
    title: "Architecture & Patterns",
    description: "FSD, SOLID, design patterns, testing strategies, code review principles, state management.",
    topic: "Software architecture: Feature-Sliced Design (FSD), SOLID principles in frontend, design patterns (Observer, Strategy, Factory, Singleton in JS), testing strategies (unit/integration/e2e, testing pyramid), state management (Redux vs Zustand vs Context), code splitting, monorepo patterns",
  },
  {
    slug: "web-fundamentals",
    title: "Web Fundamentals",
    description: "URL→render pipeline, HTTP/2, reflow/repaint, web security, performance optimization, accessibility.",
    topic: "Web fundamentals: what happens when you enter a URL (DNS→TCP→TLS→HTTP→parse→render), reflow vs repaint, HTTP/2 and HTTP/3, web security (CSP, CORS, XSS, CSRF), performance (Core Web Vitals, lazy loading, code splitting, tree shaking), accessibility (ARIA, semantic HTML), WebSocket, Service Workers",
  },
];

const GENERATE_PROMPT = `You are a SENIOR tech interviewer at a top product company. You interview candidates for Senior Frontend / Senior Fullstack (Node.js) positions.

Generate exactly {COUNT} interview questions for the topic: "{TOPIC}".

These must be REAL questions that are actually asked in interviews — not textbook fluff. Think of what a tech lead would ask to separate a mid from a senior.

Examples of the style and depth expected:

For React/TS:
- "What architecture did you use? Did you ever initiate or approve an architecture decision, and why?" (expect FSD, modular, reasoning)
- "If a parent has two states and passes one unchanged prop to a child, will the child re-render? Under what conditions?"
- "Explain useRef — when would you use it over useState?"
- "What is unknown type and when would you use it over any?"
- "What does ?? do differently from ||?"

For CSS:
- "List all position values and explain when you'd use each"
- "What is box-sizing and how does border-box change layout?"
- "What is critical CSS and why does it matter for performance?"

For JavaScript:
- "Explain event loop: what's the output of console.log('1'); Promise.resolve().then(()=>console.log('2')); setTimeout(()=>console.log('3'),0);"
- "How do you deep-copy an object? What breaks with JSON.parse(JSON.stringify())?"
- "What happens if setTimeout callback contains a heavy function — when does it actually run?"
- "What is a pure function and why does it matter?"

For general:
- "What happens when a user enters a URL and presses Enter?" (DNS → TCP → HTTPS → HTML → parse → render)
- "What is reflow vs repaint?"
- "Merge two arrays by id with O(n) complexity"
- "What is a type guard? How does 'is' keyword work?"
- "interface vs type — when to use which?"

Question types to mix:
- code_output: "What will this code output?" (include realistic code snippet with tricky but fair edge cases)
- fix_bug: "Find and fix the bug" (subtle production bugs, not syntax errors — provide the buggy code in codeSnippet, user edits it in a code editor)
- code_write: "Implement this function/feature" (user writes code from scratch or from a starter in a code editor — provide testCases for automated verification)
- concept: "Explain X" or "What is the difference between X and Y" (deep understanding, not Wikipedia)
- best_practice: "Which approach is better and why?" (architectural decisions, patterns)
- multiple_choice: A/B/C/D with plausible wrong answers

IMPORTANT: At least 3-4 questions out of {COUNT} MUST be code_write type. These are coding challenges where the user writes real code.

Return a JSON array. Each item:
{
  "type": "code_output" | "fix_bug" | "code_write" | "concept" | "best_practice" | "multiple_choice",
  "difficulty": "easy" | "medium" | "hard",
  "question": "The question text",
  "codeSnippet": "code block if needed (use \\n for newlines)" or null,
  "starterCode": "starter template for code_write (e.g. function signature)" or null,
  "testCases": "[{\"input\":\"args\",\"expected\":\"result\",\"description\":\"test name\"}]" or null,
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
  "correctAnswer": "The correct answer / reference implementation with brief reasoning",
  "explanation": "Detailed explanation: why this is correct, common mistakes, what senior devs should know. 2-4 sentences."
}

For code_write questions:
- starterCode: provide a function signature or minimal template (e.g. "function debounce(fn, delay) {\\n  // your code here\\n}")
- testCases: JSON array of test cases. Each: { "input": "debounce(() => 1, 100)", "expected": "function", "description": "returns a function" }. Keep test inputs as strings that can be eval'd. 3-5 test cases per question.
- correctAnswer: a working reference implementation

For fix_bug questions:
- codeSnippet: the buggy code (user will edit it directly in a code editor)

RULES:
- Questions MUST feel like a real interview, not a quiz app
- Answers should demonstrate SENIOR-level understanding
- Code snippets: realistic, production-like, not fizzbuzz
- Difficulty: 20% easy, 50% medium, 30% hard
- All in English
- {COUNT} questions total

Return ONLY valid JSON array. No markdown, no code fences.`;

const CHECK_PROMPT = `You are grading a developer interview answer. Your feedback must be CLEAR, PRACTICAL, and ACTIONABLE.

Question: {QUESTION}
{CODE_SNIPPET}
Correct answer: {CORRECT}
User's answer: {USER_ANSWER}

Evaluate if the user's answer is correct. Be reasonably lenient — accept answers that demonstrate understanding even if not word-for-word.

FEEDBACK RULES:
- Use plain language. No jargon walls. A developer should skim it in 5 seconds.
- If wrong: state exactly what was wrong in ONE sentence. Then add ONE practical takeaway (e.g. "Remember: cleanup runs after the next render, before the new effect.").
- If correct: one short confirmation + one thing to remember for interviews.
- Max 2-3 sentences. Be specific, not generic.

Return JSON:
{
  "isCorrect": true/false,
  "evaluation": "Clear, specific, actionable feedback. 2-3 sentences max."
}

Return ONLY valid JSON.`;

const CHECK_CODE_PROMPT = `You are grading a coding challenge from a developer interview. Your feedback must be CLEAR, PRACTICAL, and ACTIONABLE.

Task: {QUESTION}
{CODE_SNIPPET}
Reference solution: {CORRECT}

User's code:
\`\`\`
{USER_CODE}
\`\`\`

{TEST_RESULTS}

Evaluate the user's code. Be specific and practical.

FEEDBACK RULES:
- Use plain language. No jargon walls. A developer should skim it in 5 seconds.
- If wrong: state the ONE main issue (e.g. "The bug: X happens because Y"). Add ONE actionable fix or takeaway.
- If correct: short confirmation + one tip to remember for production.
- Max 2-3 sentences. Be specific, not generic.

Return JSON:
{
  "isCorrect": true/false,
  "evaluation": "Clear, specific, actionable feedback. 2-3 sentences max."
}

Return ONLY valid JSON.`;

async function callOpenAI(model: string, systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: model === GENERATE_MODEL ? 0.7 : 0.1,
      max_completion_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function generateAllTraining(onProgress?: (msg: string) => void): Promise<{ units: number; questions: number }> {
  const log = onProgress ?? console.log;

  log("[Training] Clearing old training data...");
  await db.delete(trainingQuestions);
  await db.delete(trainingUnits);

  log(`[Training] Creating ${THEMATIC_UNITS.length} thematic units...`);

  for (let i = 0; i < THEMATIC_UNITS.length; i++) {
    const t = THEMATIC_UNITS[i];
    await db.insert(trainingUnits).values({
      id: uuid(),
      slug: t.slug,
      title: t.title,
      description: t.description,
      techKey: t.slug,
      relevanceScore: 10 - i * 0.5,
      questionCount: 0,
      sortOrder: i + 1,
    });
    log(`[Training] Unit ${i + 1}: ${t.title}`);
  }

  const units = await db.select().from(trainingUnits).orderBy(trainingUnits.sortOrder);
  let totalQ = 0;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const thematic = THEMATIC_UNITS[i];
    const count = 15;

    log(`[Training] Generating ${count} questions for "${unit.title}" using ${GENERATE_MODEL}...`);

    const prompt = GENERATE_PROMPT
      .replace(/{COUNT}/g, String(count))
      .replace(/{TOPIC}/g, thematic.topic);

    try {
      const raw = await callOpenAI(GENERATE_MODEL, prompt, `Generate ${count} senior-level interview questions about ${thematic.topic}.`, 8192);
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const questions = JSON.parse(jsonMatch?.[0] ?? raw) as Array<Record<string, unknown>>;

      const validTypes = ["code_output", "fix_bug", "code_write", "concept", "system_design", "best_practice", "multiple_choice"] as const;
      type QType = (typeof validTypes)[number];
      const validDiffs = ["easy", "medium", "hard"] as const;
      type QDiff = (typeof validDiffs)[number];

      let saved = 0;
      for (const q of questions) {
        const rawType = String(q.type || "concept");
        const rawDiff = String(q.difficulty || "medium");
        const qType: QType = validTypes.includes(rawType as QType) ? (rawType as QType) : "concept";
        const qDiff: QDiff = validDiffs.includes(rawDiff as QDiff) ? (rawDiff as QDiff) : "medium";

        await db.insert(trainingQuestions).values({
          id: uuid(),
          unitId: unit.id,
          type: qType,
          difficulty: qDiff,
          question: String(q.question ?? ""),
          codeSnippet: q.codeSnippet ? String(q.codeSnippet) : null,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: String(q.correctAnswer ?? ""),
          testCases: q.testCases ? (typeof q.testCases === "string" ? q.testCases : JSON.stringify(q.testCases)) : null,
          starterCode: q.starterCode ? String(q.starterCode) : null,
          explanation: q.explanation ? String(q.explanation) : null,
        });
        saved++;
      }

      await db.update(trainingUnits).set({ questionCount: saved }).where(eq(trainingUnits.id, unit.id));
      totalQ += saved;
      log(`[Training] ✓ Saved ${saved} questions for "${unit.title}"`);
    } catch (err) {
      log(`[Training] ERROR generating for "${unit.title}": ${err}`);
    }
  }

  log(`[Training] COMPLETE: ${THEMATIC_UNITS.length} units, ${totalQ} questions generated`);
  return { units: THEMATIC_UNITS.length, questions: totalQ };
}

async function runCodeInSandbox(code: string): Promise<{ stdout: string[]; result: unknown; error: string | null }> {
  const vm = await import("node:vm");
  const stdout: string[] = [];
  let totalOutput = 0;
  const MAX_OUTPUT = 10 * 1024;

  const fakeConsole = {
    log: (...args: unknown[]) => {
      const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      totalOutput += line.length;
      if (totalOutput <= MAX_OUTPUT) stdout.push(line);
    },
    warn: (...args: unknown[]) => fakeConsole.log(...args),
    error: (...args: unknown[]) => fakeConsole.log(...args),
    info: (...args: unknown[]) => fakeConsole.log(...args),
  };

  const sandbox = {
    console: fakeConsole,
    JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp,
    Error, TypeError, RangeError, SyntaxError, Map, Set, WeakMap, WeakSet,
    Promise, Symbol, parseInt, parseFloat, isNaN, isFinite,
  };

  const context = vm.createContext(sandbox);
  try {
    const result = vm.runInContext(`(function(){"use strict";${code}})()`, context, { timeout: 5000, filename: "user-code.js" });
    return { stdout, result, error: null };
  } catch (e: unknown) {
    const err = e as Error;
    return { stdout, result: null, error: `${err.name}: ${err.message}` };
  }
}

interface TestResult { description: string; passed: boolean; expected: string; got: string }

async function runTestCases(userCode: string, testCasesJson: string): Promise<{ results: TestResult[]; allPassed: boolean }> {
  let testCases: Array<{ input: string; expected: string; description: string }>;
  try {
    testCases = JSON.parse(testCasesJson);
  } catch {
    return { results: [], allPassed: false };
  }

  const results: TestResult[] = [];
  for (const tc of testCases) {
    const testCode = `${userCode}\n;(${tc.input})`;
    try {
      const { result, error } = await runCodeInSandbox(testCode);
      const got = error ? `Error: ${error}` : JSON.stringify(result);
      const expectedStr = tc.expected;
      const passed = !error && (got === expectedStr || got === JSON.stringify(expectedStr) || String(result) === expectedStr);
      results.push({ description: tc.description, passed, expected: expectedStr, got });
    } catch {
      results.push({ description: tc.description, passed: false, expected: tc.expected, got: "Execution failed" });
    }
  }

  return { results, allPassed: results.every((r) => r.passed) };
}

const CODE_QUESTION_TYPES = new Set(["code_write", "fix_bug"]);

export async function checkAnswer(
  questionId: string,
  userAnswer: string,
  userEmail: string
): Promise<{ isCorrect: boolean; evaluation: string; testResults?: TestResult[] }> {
  const rows = await db.select().from(trainingQuestions).where(eq(trainingQuestions.id, questionId)).limit(1);
  if (!rows[0]) return { isCorrect: false, evaluation: "Question not found." };

  const q = rows[0];
  const isCodeQuestion = CODE_QUESTION_TYPES.has(q.type);

  if (isCodeQuestion) {
    let testResultsSection = "";
    let testResults: TestResult[] | undefined;

    if (q.testCases) {
      const { results, allPassed } = await runTestCases(userAnswer, q.testCases);
      testResults = results;
      const summary = results.map((r) => `${r.passed ? "PASS" : "FAIL"}: ${r.description} (expected: ${r.expected}, got: ${r.got})`).join("\n");
      testResultsSection = `Test results (${results.filter((r) => r.passed).length}/${results.length} passed):\n${summary}`;

      if (allPassed && results.length > 0) {
        const prompt = CHECK_CODE_PROMPT
          .replace("{QUESTION}", q.question)
          .replace("{CODE_SNIPPET}", q.codeSnippet ? `Original code:\n${q.codeSnippet}` : "")
          .replace("{CORRECT}", q.correctAnswer)
          .replace("{USER_CODE}", userAnswer)
          .replace("{TEST_RESULTS}", testResultsSection);

        try {
          const raw = await callOpenAI(CHECK_MODEL, prompt, "Evaluate this code.", 512);
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          const result = JSON.parse(jsonMatch?.[0] ?? raw);

          await db.insert(trainingProgress).values({
            id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
            isCorrect: true, aiEvaluation: result.evaluation || "All tests passed!",
          });
          return { isCorrect: true, evaluation: result.evaluation || "All tests passed!", testResults };
        } catch {
          await db.insert(trainingProgress).values({
            id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
            isCorrect: true, aiEvaluation: "All tests passed!",
          });
          return { isCorrect: true, evaluation: "All tests passed!", testResults };
        }
      }
    }

    const prompt = CHECK_CODE_PROMPT
      .replace("{QUESTION}", q.question)
      .replace("{CODE_SNIPPET}", q.codeSnippet ? `Original code:\n${q.codeSnippet}` : "")
      .replace("{CORRECT}", q.correctAnswer)
      .replace("{USER_CODE}", userAnswer)
      .replace("{TEST_RESULTS}", testResultsSection || "No automated tests available.");

    try {
      const raw = await callOpenAI(CHECK_MODEL, prompt, "Evaluate this code.", 512);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch?.[0] ?? raw);

      await db.insert(trainingProgress).values({
        id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
        isCorrect: !!result.isCorrect, aiEvaluation: result.evaluation || null,
      });
      return { isCorrect: !!result.isCorrect, evaluation: result.evaluation || "", testResults };
    } catch {
      await db.insert(trainingProgress).values({
        id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
        isCorrect: false, aiEvaluation: "Could not evaluate code.",
      });
      return { isCorrect: false, evaluation: "Could not evaluate code.", testResults };
    }
  }

  // Non-code questions: original logic
  const codeBlock = q.codeSnippet ? `\nCode:\n${q.codeSnippet}` : "";
  const prompt = CHECK_PROMPT
    .replace("{QUESTION}", q.question)
    .replace("{CODE_SNIPPET}", codeBlock)
    .replace("{CORRECT}", q.correctAnswer)
    .replace("{USER_ANSWER}", userAnswer);

  try {
    const raw = await callOpenAI(CHECK_MODEL, prompt, "Evaluate this answer.", 256);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch?.[0] ?? raw);

    await db.insert(trainingProgress).values({
      id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
      isCorrect: !!result.isCorrect, aiEvaluation: result.evaluation || null,
    });
    return { isCorrect: !!result.isCorrect, evaluation: result.evaluation || "" };
  } catch {
    const isExact = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    await db.insert(trainingProgress).values({
      id: uuid(), unitId: q.unitId, questionId, userEmail, userAnswer,
      isCorrect: isExact, aiEvaluation: isExact ? "Correct!" : `Expected: ${q.correctAnswer}`,
    });
    return { isCorrect: isExact, evaluation: isExact ? "Correct!" : `Expected: ${q.correctAnswer}` };
  }
}
