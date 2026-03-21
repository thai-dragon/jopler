import * as cheerio from "cheerio";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { jobs } from "../schema";

const BASE = "https://jobs.dou.ua";
const SEARCH_URLS = [
  "/vacancies/?category=Front%20End",
  "/vacancies/?category=Front%20End&exp=3-5",
  "/vacancies/?category=Front%20End&exp=5plus",
  "/vacancies/?search=React",
  "/vacancies/?search=Next.js",
  "/vacancies/?search=TypeScript",
  "/vacancies/?category=Full%20Stack",
  "/vacancies/?category=Full%20Stack&search=React",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function detectLevel(title: string, text: string): string {
  const combined = (title + " " + text).toLowerCase();
  if (combined.includes("lead") || combined.includes("team lead")) return "Lead";
  if (combined.includes("senior") || combined.includes("сеньйор") || combined.includes("старший")) return "Senior";
  if (combined.includes("middle") || combined.includes("мідл") || combined.includes("середній")) return "Middle";
  if (combined.includes("junior") || combined.includes("джуніор") || combined.includes("молодший")) return "Junior";
  return "Unknown";
}

function detectType(title: string, text: string): string {
  const combined = (title + " " + text).toLowerCase();
  if (combined.includes("full-stack") || combined.includes("fullstack") || combined.includes("full stack")) return "Fullstack";
  if (combined.includes("back-end") || combined.includes("backend")) return "Backend";
  if (combined.includes("front-end") || combined.includes("frontend")) return "Frontend";
  if (combined.includes("react") || combined.includes("next.js") || combined.includes("vue") || combined.includes("angular")) return "Frontend";
  return "Unknown";
}

function extractSalary(text: string): { min: number | null; max: number | null; currency: string | null } {
  const m = text.match(/\$\s*([\d,]+)\s*[-–—]\s*\$?\s*([\d,]+)/);
  if (m) {
    return { min: parseInt(m[1].replace(/,/g, ""), 10), max: parseInt(m[2].replace(/,/g, ""), 10), currency: "USD" };
  }
  const single = text.match(/\$\s*([\d,]+)/);
  if (single) {
    const val = parseInt(single[1].replace(/,/g, ""), 10);
    return { min: val, max: val, currency: "USD" };
  }
  return { min: null, max: null, currency: null };
}

function extractTechnologies(text: string): string[] {
  const techs = [
    "React", "Next.js", "TypeScript", "JavaScript", "Vue", "Angular", "Node.js",
    "Express", "NestJS", "GraphQL", "REST", "Redux", "MobX", "Zustand",
    "Tailwind", "CSS", "SASS", "SCSS", "HTML", "Webpack", "Vite",
    "Docker", "AWS", "GCP", "Azure", "PostgreSQL", "MongoDB", "MySQL",
    "Redis", "Git", "CI/CD", "Jest", "Cypress", "Playwright", "Storybook",
    "Figma", "Jira", "Agile", "Scrum", "Python", "Go", "Java", "PHP",
    "Laravel", "Django", "FastAPI", "Prisma", "Drizzle", "tRPC",
    "React Native", "Flutter", "Electron", "SSR", "SSG", "SPA",
    "Material UI", "Ant Design", "Chakra", "Radix", "shadcn",
    "WebSocket", "Socket.io", "RabbitMQ", "Kafka", "Kubernetes",
    "Terraform", "Linux", "Nginx", "Firebase", "Supabase", "Vercel",
  ];
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const t of techs) {
    if (lower.includes(t.toLowerCase())) found.push(t);
  }
  return [...new Set(found)];
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function parseListPage(url: string): Promise<string[]> {
  const html = await fetchPage(BASE + url);
  const $ = cheerio.load(html);
  const links: string[] = [];
  $(".l-vacancy a.vt, a[href*='/vacancies/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("/vacancies/") && !href.includes("category=")) {
      const full = href.startsWith("http") ? href : BASE + href;
      if (!links.includes(full)) links.push(full);
    }
  });
  return [...new Set(links)];
}

async function parseJobPage(url: string): Promise<typeof jobs.$inferInsert | null> {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const title = $("h1.g-h2, h1").first().text().trim();
    if (!title) return null;

    const descEl = $(".b-typo.vacancy-section, .vacancy-section, .l-vacancy-description, .b-typo");
    const description = descEl.text().trim() || $("body").text().trim().slice(0, 5000);
    const company = $(".l-n a, .info .l-n, [class*='company']").first().text().trim() || null;
    const salaryText = $(".salary, .sh-info .salary, [class*='salary']").text();
    const salary = extractSalary(salaryText + " " + title);
    const techList = extractTechnologies(title + " " + description);
    const location = $(".sh-info .city, .cities, [class*='city'], [class*='location']").first().text().trim() || null;
    const remote = description.toLowerCase().includes("remote") || description.toLowerCase().includes("віддален") ? "Remote" : "Office";
    const dateText = $(".date, .sh-info .date, [class*='date']").first().text().trim() || null;

    return {
      id: uuid(),
      source: "dou",
      sourceUrl: url,
      title,
      company,
      level: detectLevel(title, description),
      type: detectType(title, description),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      experience: null,
      location,
      remote,
      technologies: JSON.stringify(techList),
      description: description.slice(0, 10000),
      requirements: null,
      publishedAt: dateText,
    };
  } catch (err) {
    console.error(`[DOU] Failed to parse ${url}:`, err);
    return null;
  }
}

export async function parseDou(onProgress?: (msg: string) => void): Promise<number> {
  const log = onProgress ?? console.log;
  const allLinks = new Set<string>();

  for (const searchUrl of SEARCH_URLS) {
    try {
      log(`[DOU] Fetching list: ${searchUrl}`);
      const links = await parseListPage(searchUrl);
      links.forEach((l) => allLinks.add(l));
      log(`[DOU] Found ${links.length} jobs on page`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      log(`[DOU] List page failed: ${searchUrl}: ${err}`);
    }
  }

  log(`[DOU] Total unique job links: ${allLinks.size}`);
  let parsed = 0;

  let idx = 0;
  for (const url of allLinks) {
    idx++;
    log(`[DOU] (${idx}/${allLinks.size}) Parsing: ${url}`);
    const job = await parseJobPage(url);
    if (job) {
      const techs = job.technologies ? JSON.parse(job.technologies) : [];
      const sal = job.salaryMin ? `$${job.salaryMin}-$${job.salaryMax}` : "no salary";
      log(`[DOU]   → "${job.title}" | ${job.level} ${job.type} | ${sal} | ${techs.length} techs: ${techs.slice(0, 5).join(", ")}`);
      try {
        await db.insert(jobs).values(job).onConflictDoNothing();
        parsed++;
      } catch {
        // duplicate
      }
    } else {
      log(`[DOU]   → skipped (no data)`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  log(`[DOU] Parsed ${parsed} jobs`);
  return parsed;
}
