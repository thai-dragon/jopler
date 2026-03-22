import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "jobs.db");

import fs from "fs";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

sqlite.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    level TEXT,
    type TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    experience TEXT,
    location TEXT,
    remote TEXT,
    technologies TEXT,
    description TEXT,
    requirements TEXT,
    published_at TEXT,
    parsed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS training_units (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tech_key TEXT NOT NULL,
    relevance_score REAL DEFAULT 0,
    question_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS training_questions (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    question TEXT NOT NULL,
    code_snippet TEXT,
    options TEXT,
    correct_answer TEXT NOT NULL,
    test_cases TEXT,
    starter_code TEXT,
    explanation TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS training_progress (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    user_email TEXT NOT NULL DEFAULT '',
    user_answer TEXT,
    is_correct INTEGER DEFAULT 0,
    ai_evaluation TEXT,
    attempted_at TEXT
  );
  CREATE TABLE IF NOT EXISTS allowed_emails (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    added_at TEXT
  );
  CREATE TABLE IF NOT EXISTS meta_summary (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    generated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    position TEXT NOT NULL,
    job_count INTEGER DEFAULT 0,
    avg_salary_min REAL,
    avg_salary_max REAL,
    salary_currency TEXT,
    avg_experience_years REAL,
    tech_scores TEXT,
    top_requirements TEXT,
    top_backend_tech TEXT,
    raw_analysis TEXT,
    generated_at TEXT
  );
`);

const seedEmail = (process.env.PRIMARY_ADMIN_EMAIL || "").trim().toLowerCase().replace(/'/g, "''");
if (seedEmail) {
  sqlite.exec(`INSERT OR IGNORE INTO allowed_emails (id, email, added_at) VALUES ('seed-1', '${seedEmail}', datetime('now'))`);
}

try { sqlite.exec("ALTER TABLE training_questions ADD COLUMN test_cases TEXT"); } catch {}
try { sqlite.exec("ALTER TABLE training_questions ADD COLUMN starter_code TEXT"); } catch {}
try { sqlite.exec("ALTER TABLE training_questions ADD COLUMN ideal_answer TEXT"); } catch {}
try { sqlite.exec("ALTER TABLE training_questions ADD COLUMN audio_path TEXT"); } catch {}
try {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    correct_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    closed_at TEXT NOT NULL
  )`);
} catch {}
