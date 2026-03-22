import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  source: text("source", { enum: ["djinni", "dou"] }).notNull(),
  sourceUrl: text("source_url").notNull(),
  title: text("title").notNull(),
  company: text("company"),
  level: text("level"),
  type: text("type"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  experience: text("experience"),
  location: text("location"),
  remote: text("remote"),
  technologies: text("technologies"),
  description: text("description"),
  requirements: text("requirements"),
  publishedAt: text("published_at"),
  parsedAt: text("parsed_at").$defaultFn(() => new Date().toISOString()),
});

export const trainingUnits = sqliteTable("training_units", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  techKey: text("tech_key").notNull(),
  relevanceScore: real("relevance_score").default(0),
  questionCount: integer("question_count").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const trainingQuestions = sqliteTable("training_questions", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull(),
  type: text("type", { enum: ["code_output", "fix_bug", "concept", "system_design", "best_practice", "multiple_choice", "code_write"] }).notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  question: text("question").notNull(),
  codeSnippet: text("code_snippet"),
  options: text("options"),
  correctAnswer: text("correct_answer").notNull(),
  idealAnswer: text("ideal_answer"),
  testCases: text("test_cases"),
  starterCode: text("starter_code"),
  explanation: text("explanation"),
  audioPath: text("audio_path"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const trainingSessions = sqliteTable("training_sessions", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull(),
  userEmail: text("user_email").notNull(),
  correctCount: integer("correct_count").default(0),
  totalCount: integer("total_count").default(0),
  closedAt: text("closed_at").notNull(),
});

export const trainingProgress = sqliteTable("training_progress", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull(),
  questionId: text("question_id").notNull(),
  userEmail: text("user_email").notNull(),
  userAnswer: text("user_answer"),
  isCorrect: integer("is_correct", { mode: "boolean" }).default(false),
  aiEvaluation: text("ai_evaluation"),
  attemptedAt: text("attempted_at").$defaultFn(() => new Date().toISOString()),
});

export const allowedEmails = sqliteTable("allowed_emails", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  addedAt: text("added_at").$defaultFn(() => new Date().toISOString()),
});

export const metaSummary = sqliteTable("meta_summary", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  generatedAt: text("generated_at").$defaultFn(() => new Date().toISOString()),
});

export const summaries = sqliteTable("summaries", {
  id: text("id").primaryKey(),
  position: text("position").notNull(),
  jobCount: integer("job_count").default(0),
  avgSalaryMin: real("avg_salary_min"),
  avgSalaryMax: real("avg_salary_max"),
  salaryCurrency: text("salary_currency"),
  avgExperienceYears: real("avg_experience_years"),
  techScores: text("tech_scores"),
  topRequirements: text("top_requirements"),
  topBackendTech: text("top_backend_tech"),
  rawAnalysis: text("raw_analysis"),
  generatedAt: text("generated_at").$defaultFn(() => new Date().toISOString()),
});
