import * as cheerio from "cheerio";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { jobs } from "../schema";

const BASE = "https://djinni.co";
const SEARCH_URLS = [
  "/jobs/?primary_keyword=JavaScript&exp_level=3y&exp_level=5y&exp_level=6y",
  "/jobs/?primary_keyword=JavaScript&exp_level=2y",
  "/jobs/?primary_keyword=React",
  "/jobs/?primary_keyword=React&exp_level=3y&exp_level=5y&exp_level=6y",
  "/jobs/?all-ede=Front-end",
  "/jobs/?all-ede=Full-stack&primary_keyword=JavaScript",
  "/jobs/?primary_keyword=Next.js",
  "/jobs/?primary_keyword=TypeScript",
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9,uk;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function detectLevel(title: string, text: string): string {
  const combined = (title + " " + text).toLowerCase();
  if (combined.includes("lead") || combined.includes("team lead")) return "Lead";
  if (combined.includes("senior") || combined.includes("сеньйор")) return "Senior";
  if (combined.includes("middle") || combined.includes("мідл")) return "Middle";
  if (combined.includes("junior") || combined.includes("джуніор")) return "Junior";
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
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function parseListPage(url: string, log?: (msg: string) => void): Promise<string[]> {
  const allLinks: string[] = [];
  let currentUrl = url;
  let page = 1;

  while (currentUrl) {
    const html = await fetchPage(BASE + currentUrl);
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (/\/jobs\/\d+/.test(href)) {
        const full = href.startsWith("http") ? href : BASE + href;
        allLinks.push(full.split("?")[0]);
      }
    });

    // Find next page link (hrefs are relative like "?...&page=2")
    let nextUrl: string | null = null;
    const basePath = currentUrl.split("?")[0]; // e.g. "/jobs/"
    $("a[href*='page=']").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const m = href.match(/page=(\d+)/);
      if (m && parseInt(m[1], 10) === page + 1) {
        // Resolve relative URL: "?foo&page=2" → "/jobs/?foo&page=2"
        nextUrl = href.startsWith("/") ? href : basePath + href;
      }
    });

    if (nextUrl) {
      page++;
      currentUrl = nextUrl;
      log?.(`[Djinni]   following page ${page} (${allLinks.length} links so far)`);
      await new Promise((r) => setTimeout(r, 1000));
    } else {
      break;
    }
  }

  return [...new Set(allLinks)];
}

async function parseJobPage(url: string): Promise<typeof jobs.$inferInsert | null> {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Primary source: JSON-LD structured data
    let ld: Record<string, unknown> = {};
    try {
      const ldJson = $("script[type='application/ld+json']").first().html();
      if (ldJson) ld = JSON.parse(ldJson);
    } catch { /* ignore */ }

    const title = (ld.title as string) || $("h1").first().text().trim();
    if (!title) return null;

    const company = (ld.hiringOrganization as { name?: string })?.name
      || $(".detail--company-name, [class*='company-name']").first().text().trim()
      || null;

    const publishedAt = (ld.datePosted as string) ?? null;

    // Description from JSON-LD (HTML) — strip tags
    const rawDesc = (ld.description as string) ?? "";
    const description = rawDesc
      ? rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : $("body").text().trim().slice(0, 5000);

    // Remote from structured jobLocationType
    const locType = ((ld.jobLocationType as string) ?? "").toUpperCase();
    const remote = locType === "TELECOMMUTE" ? "Remote"
      : locType === "INPERSON" ? "Office"
      : description.toLowerCase().includes("remote") ? "Remote"
      : "Unknown";

    const salary = extractSalary(description + " " + title);
    const techList = extractTechnologies(title + " " + description);
    const location = $(".location-text, [class*='location']").first().text().trim() || null;

    return {
      id: uuid(),
      source: "djinni",
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
      publishedAt,
    };
  } catch (err) {
    console.error(`[Djinni] Failed to parse ${url}:`, err);
    return null;
  }
}

export async function parseDjinni(onProgress?: (msg: string) => void): Promise<number> {
  const log = onProgress ?? console.log;
  const allLinks = new Set<string>();

  for (const searchUrl of SEARCH_URLS) {
    try {
      log(`[Djinni] Fetching list: ${searchUrl}`);
      const links = await parseListPage(searchUrl, log);
      links.forEach((l) => allLinks.add(l));
      log(`[Djinni] Found ${links.length} jobs (all pages)`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      log(`[Djinni] List page failed: ${searchUrl}: ${err}`);
    }
  }

  log(`[Djinni] Total unique job links: ${allLinks.size}`);
  let parsed = 0;

  let idx = 0;
  for (const url of allLinks) {
    idx++;
    log(`[Djinni] (${idx}/${allLinks.size}) Parsing: ${url}`);
    const job = await parseJobPage(url);
    if (job) {
      const techs = job.technologies ? JSON.parse(job.technologies) : [];
      const sal = job.salaryMin ? `$${job.salaryMin}-$${job.salaryMax}` : "no salary";
      log(`[Djinni]   → "${job.title}" | ${job.level} ${job.type} | ${sal} | ${techs.length} techs: ${techs.slice(0, 5).join(", ")}`);
      try {
        await db.insert(jobs).values(job).onConflictDoNothing();
        parsed++;
      } catch {
        // duplicate
      }
    } else {
      log(`[Djinni]   → skipped (no data)`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  log(`[Djinni] Parsed ${parsed} jobs`);
  return parsed;
}
