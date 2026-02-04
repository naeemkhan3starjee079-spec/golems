#!/usr/bin/env bun
/**
 * Job Golem - Scraper
 *
 * Scrapes job listings from:
 * - Indeed Israel (via ts-jobspy, no rate limits)
 * - SecretTLV (English, tech-focused)
 * - Drushim (Hebrew, general tech)
 * - Goozali Telegram channels
 *
 * Fetches each job page to verify active and get real details.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { scrapeJobs as scrapeIndeed } from "ts-jobspy";

const HOME = process.env.HOME || "/Users/etanheyman";
const DATA_DIR = join(HOME, ".golems-zikaron/job-golem");
const SEEN_FILE = join(DATA_DIR, "seen-jobs.json");
const SECRETLV_CACHE_FILE = join(DATA_DIR, "secretlv-cache.json");
const CACHE_TTL_HOURS = 24;

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  description: string;
  url: string;
  source: "secretTLV" | "drushim" | "indeed" | "goozali";
  language: "en" | "he";
  scrapedAt: string;
}

// Goozali Telegram channels to monitor
const GOOZALI_CHANNELS = [
  { name: "hitechjobsjunior", label: "Junior" },
  { name: "hitechjobsisrael", label: "Software" },
  { name: "hitechjobsdatascience", label: "AI/ML" },
  // Private channels need user to forward messages - skip for now
  // { name: "+CwDWQuAZC_owODc0", label: "Frontend" },
  // { name: "+5nK1fQiqLO1iZDI0", label: "Mobile" },
];

// Ensure data directory exists
function ensureDataDir() {
  const fs = require("fs");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load seen job IDs (to avoid duplicates)
function loadSeenJobs(): Set<string> {
  try {
    if (existsSync(SEEN_FILE)) {
      const data = JSON.parse(readFileSync(SEEN_FILE, "utf-8"));
      return new Set(data);
    }
  } catch {}
  return new Set();
}

// Save seen job IDs
function saveSeenJobs(seen: Set<string>) {
  writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2));
}

// SecretTLV cache: { slug: { job: JobListing | null, cachedAt: ISO string } }
interface SecretLVCache {
  [slug: string]: {
    job: JobListing | null;  // null = verified inactive
    cachedAt: string;
  };
}

function loadSecretLVCache(): SecretLVCache {
  try {
    if (existsSync(SECRETLV_CACHE_FILE)) {
      return JSON.parse(readFileSync(SECRETLV_CACHE_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveSecretLVCache(cache: SecretLVCache) {
  // Clean up entries older than 7 days to prevent unbounded growth
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned: SecretLVCache = {};
  for (const [slug, entry] of Object.entries(cache)) {
    if (new Date(entry.cachedAt).getTime() > weekAgo) {
      cleaned[slug] = entry;
    }
  }
  writeFileSync(SECRETLV_CACHE_FILE, JSON.stringify(cleaned, null, 2));
}

function isCacheValid(cachedAt: string): boolean {
  const cacheTime = new Date(cachedAt).getTime();
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000;
  return Date.now() - cacheTime < ttlMs;
}

/**
 * Fetch with retry logic for rate limiting (429)
 * TODO: Increase delay between requests (slower but more reliable) - currently hits 429 after ~50 jobs
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response | null> {
  let delay = 5000; // Start with 5 second delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);

      if (resp.status === 429) {
        if (attempt < maxRetries) {
          console.log(`    ⏳ Rate limited, waiting ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        return null;
      }

      return resp;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return null;
    }
  }

  return null;
}

/**
 * Fetch a single SecretTLV job page and extract details
 * Returns null if job is inactive/expired
 */
async function fetchSecretTLVJobDetails(url: string, slug: string): Promise<JobListing | null> {
  try {
    const resp = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!resp || !resp.ok) {
      return null;
    }

    const html = await resp.text();

    // Check if job is inactive/expired
    if (
      html.includes("Selected job is inactive") ||
      html.includes("do not exist") ||
      html.includes("has expired") ||
      html.includes("no longer available")
    ) {
      return null;
    }

    // Extract title - look for job title in various places
    let title = "";
    const titlePatterns = [
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<|]+)/i,
      /class="[^"]*job-title[^"]*"[^>]*>([^<]+)/i,
    ];
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].includes("Secret Tel Aviv")) {
        title = match[1].trim();
        break;
      }
    }
    if (!title) {
      title = slug.replace(/-\d+$/, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }

    // Extract company
    let company = "Unknown";
    const companyPatterns = [
      /class="[^"]*company[^"]*"[^>]*>([^<]+)/i,
      /<strong>Company:?\s*<\/strong>\s*([^<]+)/i,
      /Company:?\s*<\/?\w+[^>]*>\s*([^<]+)/i,
    ];
    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        company = match[1].trim();
        break;
      }
    }

    // Extract location - SecretTLV jobs are all in Israel
    let location = "Israel";
    const locationPatterns = [
      /class="[^"]*location[^"]*"[^>]*>([^<]+)/i,
      /<strong>Location:?\s*<\/strong>\s*([^<]+)/i,
      /Location:?\s*<\/?\w+[^>]*>\s*([^<]+)/i,
      /(Tel Aviv|Ramat Gan|Herzliya|Jerusalem|Haifa|Remote|Hybrid|Israel)[^<]*/i,
    ];
    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        location = match[1].trim().replace(/,?\s*Israel$/i, "").trim() || "Israel";
        break;
      }
    }

    // Extract description
    let description = "";
    const descPatterns = [
      /<div[^>]*class="[^"]*job[-_]?description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        description = match[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 800);
        if (description.length > 50) break;
      }
    }

    return {
      id: `stlv-${slug}`,
      title,
      company,
      location,
      description,
      url,
      source: "secretTLV",
      language: "en",
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Scrape SecretTLV jobs
 * Fetches each job page to verify active and get real details
 * TODO: Cache results so we don't re-verify recently checked URLs (e.g., 24h cache by slug)
 */
export async function scrapeSecretTLV(): Promise<JobListing[]> {
  console.log("[SecretTLV] Searching for developer jobs...");

  const jobUrls: { slug: string; url: string }[] = [];
  const seenSlugs = new Set<string>();

  // Search for developer jobs
  const searchTerms = ["developer", "engineer", "react", "frontend", "fullstack", "backend", "software"];

  for (const term of searchTerms) {
    try {
      // Use retry logic for search requests too
      const resp = await fetchWithRetry(
        `https://jobs.secrettelaviv.com/?s=${term}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        },
        2 // max 2 retries for search
      );

      if (!resp || !resp.ok) continue;

      const html = await resp.text();
      const jobLinks = html.matchAll(/href="https:\/\/jobs\.secrettelaviv\.com\/job\/([^"]+)"/g);

      for (const match of jobLinks) {
        const slug = match[1].replace(/\/$/, "");
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        jobUrls.push({ slug, url: `https://jobs.secrettelaviv.com/job/${slug}/` });
      }

      // Longer delay between search requests
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      // Continue on error
    }
  }

  // Load cache for faster verification
  const cache = loadSecretLVCache();
  let cacheHits = 0;
  let cacheMisses = 0;

  console.log(`[SecretTLV] Found ${jobUrls.length} URLs, verifying with cache...`);

  // Fetch each job page to verify active and get details
  const jobs: JobListing[] = [];
  let inactive = 0;

  // Process in batches of 10, with longer pauses between batches
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds between each request
  const DELAY_BETWEEN_BATCHES = 15000; // 15 seconds between batches

  for (let i = 0; i < jobUrls.length; i++) {
    const { slug, url } = jobUrls[i];

    // Progress indicator every 10 jobs
    if (i % BATCH_SIZE === 0 && i > 0) {
      console.log(`  📊 Progress: ${i}/${jobUrls.length} (${jobs.length} active, ${inactive} inactive, ${cacheHits} cached)`);
      // Longer pause between batches
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    // Check cache first (24h TTL)
    const cached = cache[slug];
    if (cached && isCacheValid(cached.cachedAt)) {
      cacheHits++;
      if (cached.job) {
        jobs.push(cached.job);
        console.log(`  ⚡ ${cached.job.title.slice(0, 40)}... (cached)`);
      } else {
        inactive++;  // Cached as inactive
      }
      continue;  // Skip fetch, no delay needed
    }

    // Cache miss - fetch and verify
    cacheMisses++;
    const job = await fetchSecretTLVJobDetails(url, slug);

    // Cache the result (job or null for inactive)
    cache[slug] = {
      job,
      cachedAt: new Date().toISOString(),
    };

    if (job) {
      jobs.push(job);
      console.log(`  ✓ ${job.title.slice(0, 40)}... (${job.location})`);
    } else {
      inactive++;
    }

    // Delay between requests (only for cache misses)
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS));
  }

  // Save cache for next run
  saveSecretLVCache(cache);

  console.log(`[SecretTLV] ${jobs.length} active jobs (${inactive} inactive, ${cacheHits} cache hits, ${cacheMisses} fetched)`);
  return jobs;
}

/**
 * Fetch a single Drushim job page
 */
async function fetchDrushimJobDetails(url: string, jobId: string): Promise<JobListing | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
      },
    });

    if (!resp.ok) return null;

    const html = await resp.text();

    // Check if job is inactive
    if (html.includes("המשרה לא פעילה") || html.includes("not found") || html.includes("404")) {
      return null;
    }

    // Extract title from og:title (format: "דרושים IL - ACTUAL TITLE")
    let title = `Job #${jobId}`;
    const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i) ||
                         html.match(/name="og:title"\s+content="([^"]+)"/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      // Remove "דרושים IL - " prefix
      title = ogTitleMatch[1].replace(/^דרושים IL\s*-\s*/, "").trim();
    }

    // Try to extract company from description or use "Drushim" as source indicator
    let company = "";
    // Look for company names in the description (usually after "חברת" or at start)
    const companyPatterns = [
      /חברת\s+([^\s,]+)/,
      /בחברת\s+([^\s,]+)/,
    ];
    for (const pattern of companyPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        company = match[1].trim();
        break;
      }
    }
    if (!company) company = "דרושים";

    // Extract location from Hebrew content
    let location = "ישראל";
    const locationPatterns = [
      /מקום העבודה:\s*([^<\n]+)/i,
      /אזור\s+([^<\n,]+)/i,
      /(תל אביב|רמת גן|הרצליה|ירושלים|חיפה|באר שבע|נתניה|ראשון לציון|פתח תקווה|אשדוד|חולון|בני ברק)/i,
      /(רחוק|היברידי|מהבית|עבודה מרחוק)/i,
    ];
    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        location = match[1].trim();
        break;
      }
    }

    // Extract description from og:description
    let description = "";
    const ogDescMatch = html.match(/property="og:description"\s+content="([^"]+)"/i) ||
                        html.match(/name="og:description"\s+content="([^"]+)"/i);
    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1]
        .replace(/^דרושים IL\s*-\s*תאור משרה\s*/, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .trim()
        .slice(0, 800);
    }

    return {
      id: `drushim-${jobId}`,
      title,
      company,
      location,
      description,
      url,
      source: "drushim",
      language: "he",
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Scrape Drushim (Hebrew job board)
 * Categories: cat6 = software, cat5 = general hi-tech, cat24 = QA
 */
export async function scrapeDrushim(): Promise<JobListing[]> {
  console.log("[Drushim] Fetching Hebrew hi-tech jobs...");

  const jobUrls: { jobId: string; url: string }[] = [];
  const seenIds = new Set<string>();

  // Scrape multiple hi-tech categories
  const categories = ["cat6", "cat5", "cat24"]; // Software, General Hi-Tech, QA

  for (const cat of categories) {
    const resp = await fetch(`https://www.drushim.co.il/jobs/${cat}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "he-IL,he;q=0.9",
      },
    });

    if (!resp.ok) {
      console.error(`[Drushim] HTTP ${resp.status} for ${cat}`);
      continue;
    }

    const html = await resp.text();
    const jobLinks = html.matchAll(/href="\/job\/(\d+)\/([a-fA-F0-9]+)\/?"/g);

    for (const match of jobLinks) {
      const [, jobId, hash] = match;
      if (seenIds.has(jobId)) continue;
      seenIds.add(jobId);
      jobUrls.push({ jobId, url: `https://www.drushim.co.il/job/${jobId}/${hash}/` });
    }

    // Small delay between category requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`[Drushim] Found ${jobUrls.length} URLs, verifying...`);

  const jobs: JobListing[] = [];
  let inactive = 0;

  for (const { jobId, url } of jobUrls.slice(0, 40)) {
    // Limit to 40 to be respectful
    const job = await fetchDrushimJobDetails(url, jobId);
    if (job) {
      jobs.push(job);
    } else {
      inactive++;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[Drushim] ${jobs.length} active jobs (${inactive} inactive)`);
  return jobs;
}

/**
 * Parse a Goozali Telegram message into a JobListing
 */
function parseGoozaliMessage(text: string, channelLabel: string): JobListing | null {
  // Format: 🆕 TITLE\n💼 Company: X\n🔍 Location: X\n🧑‍💻️ Experience required: X yrs\n...
  const lines = text.split("\n").map(l => l.trim());

  let title = "";
  let company = "";
  let location = "Israel";
  let experience = "0 yrs";
  let description = "";

  for (const line of lines) {
    if (line.startsWith("🆕")) {
      title = line.replace("🆕", "").trim();
    } else if (line.includes("Company:")) {
      company = line.split("Company:")[1]?.trim() || "";
    } else if (line.includes("Location:")) {
      location = line.split("Location:")[1]?.trim() || "Israel";
    } else if (line.includes("Experience required:")) {
      experience = line.split("Experience required:")[1]?.trim() || "0 yrs";
    } else if (line.includes("Description:")) {
      description = line.split("Description:")[1]?.trim() || "";
    } else if (line.includes("Requirements:")) {
      // Append requirements to description
      const req = line.split("Requirements:")[1]?.trim() || "";
      if (req) description += " Requirements: " + req;
    }
  }

  if (!title || !company) return null;

  // Generate ID from title+company
  const id = `goozali-${title.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}-${company.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;

  return {
    id,
    title,
    company,
    location,
    experience,
    description: description.slice(0, 500),
    url: `https://goozali.com/#jobopenings`, // Link to Goozali table
    source: "goozali",
    language: "en",
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Scrape Goozali Telegram channels (public ones only)
 * Extracts actual job URLs from the posts
 */
export async function scrapeGoozali(): Promise<JobListing[]> {
  console.log("[Goozali] Scraping Telegram channels...");

  const jobs: JobListing[] = [];
  const seenIds = new Set<string>();

  for (const channel of GOOZALI_CHANNELS) {
    try {
      console.log(`  • Fetching @${channel.name}...`);

      const resp = await fetch(`https://t.me/s/${channel.name}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!resp.ok) {
        console.log(`    ⚠️ HTTP ${resp.status}`);
        continue;
      }

      const html = await resp.text();

      // Extract messages with their surrounding HTML (to get links)
      const messageBlocks = html.matchAll(/<div class="tgme_widget_message_bubble"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g);

      for (const block of messageBlocks) {
        const blockHtml = block[1];

        // Skip if not a job post
        if (!blockHtml.includes("🆕")) continue;

        // Extract text content
        const textMatch = blockHtml.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
        if (!textMatch) continue;

        let text = textMatch[1]
          .replace(/<br\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .trim();

        // Extract job URL from the block (careers page links)
        let jobUrl = "https://goozali.com/#jobopenings";
        const urlMatches = blockHtml.matchAll(/href="(https?:\/\/[^"]+(?:careers|jobs|job|apply|linkedin\.com\/jobs)[^"]*)"/gi);
        for (const urlMatch of urlMatches) {
          const url = urlMatch[1];
          // Skip telegram links, prefer actual job/careers URLs
          if (!url.includes("t.me/") && !url.includes("goozali.com")) {
            jobUrl = url.replace(/&amp;/g, "&");
            break;
          }
        }

        const job = parseGoozaliMessage(text, channel.label);
        if (job && !seenIds.has(job.id)) {
          job.url = jobUrl; // Override with actual URL
          seenIds.add(job.id);
          jobs.push(job);
        }
      }

      console.log(`    ✓ Found ${jobs.length} jobs so far`);

      // Small delay between channels
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`    ⚠️ Error: ${err}`);
    }
  }

  console.log(`[Goozali] Total: ${jobs.length} jobs from ${GOOZALI_CHANNELS.length} channels`);
  return jobs;
}

/**
 * Scrape Indeed Israel using ts-jobspy
 * No rate limits - uses official-ish API under the hood
 */
export async function scrapeIndeedIsrael(): Promise<JobListing[]> {
  console.log("[Indeed] Searching Israel jobs via ts-jobspy...");

  const searchTerms = ["react developer", "frontend developer", "typescript developer", "full stack developer"];
  const allJobs: JobListing[] = [];
  const seenIds = new Set<string>();

  for (const searchTerm of searchTerms) {
    try {
      console.log(`  • Searching: "${searchTerm}"...`);

      const results = await scrapeIndeed({
        siteName: "indeed",
        searchTerm,
        location: "Israel",
        countryIndeed: "israel",
        resultsWanted: 25,  // Per search term
        hoursOld: 72,       // Last 3 days
        descriptionFormat: "plain",
      });

      for (const job of results) {
        // Create stable ID from job URL or title+company
        const id = job.id || `indeed-${(job.title + job.company).replace(/\s+/g, "-").toLowerCase().slice(0, 50)}`;

        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Convert ts-jobspy format to our JobListing format
        const listing: JobListing = {
          id: `indeed-${id}`,
          title: job.title,
          company: job.company || "Unknown",
          location: job.location || "Israel",
          description: job.description?.slice(0, 800) || "",
          url: job.jobUrl,
          source: "indeed",
          language: "en",
          scrapedAt: new Date().toISOString(),
        };

        allJobs.push(listing);
      }

      console.log(`    ✓ Found ${results.length} jobs`);

      // Small delay between searches
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`    ⚠️ Error searching "${searchTerm}": ${err}`);
    }
  }

  console.log(`[Indeed] Total: ${allJobs.length} unique jobs`);
  return allJobs;
}

/**
 * Wrapper to safely scrape a source with error handling
 * Returns empty array on failure, logs the error
 */
async function safeSourceScrape(
  name: string,
  scrapeFn: () => Promise<JobListing[]>
): Promise<{ source: string; jobs: JobListing[]; error?: string }> {
  try {
    const jobs = await scrapeFn();
    return { source: name, jobs };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${name}] ❌ Failed: ${errorMsg}`);
    return { source: name, jobs: [], error: errorMsg };
  }
}

/**
 * Scrape all sources in PARALLEL with resilience
 * - Uses Promise.allSettled so one failure doesn't stop others
 * - Each source wrapped in try/catch
 * - Set SKIP_SECRETLV=1 or SKIP_DRUSHIM=1 to skip specific sources
 */
export async function scrapeAllJobs(): Promise<JobListing[]> {
  ensureDataDir();

  const seen = loadSeenJobs();

  // Build list of sources to scrape
  const sources: Array<{ name: string; fn: () => Promise<JobListing[]> }> = [];

  // Goozali (Telegram, fast)
  sources.push({ name: "Goozali", fn: scrapeGoozali });

  // Indeed Israel (ts-jobspy, no rate limits)
  if (process.env.SKIP_INDEED !== "1") {
    sources.push({ name: "Indeed", fn: scrapeIndeedIsrael });
  } else {
    console.log("[Indeed] Skipped (SKIP_INDEED=1)");
  }

  // SecretTLV (rate limited, slow)
  if (process.env.SKIP_SECRETLV !== "1") {
    sources.push({ name: "SecretTLV", fn: scrapeSecretTLV });
  } else {
    console.log("[SecretTLV] Skipped (SKIP_SECRETLV=1)");
  }

  // Drushim (Hebrew)
  if (process.env.SKIP_DRUSHIM !== "1") {
    sources.push({ name: "Drushim", fn: scrapeDrushim });
  } else {
    console.log("[Drushim] Skipped (SKIP_DRUSHIM=1)");
  }

  console.log(`[Scraper] Fetching ${sources.length} sources in parallel...`);
  const startTime = Date.now();

  // Fetch ALL sources in parallel with resilience
  const results = await Promise.allSettled(
    sources.map(s => safeSourceScrape(s.name, s.fn))
  );

  // Combine successful results
  const allJobs: JobListing[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { source, jobs, error } = result.value;
      if (error) {
        errors.push(`${source}: ${error}`);
      }
      allJobs.push(...jobs);
    } else {
      // Promise itself rejected (shouldn't happen with safeSourceScrape)
      errors.push(`Unknown source: ${result.reason}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Log summary
  if (errors.length > 0) {
    console.log(`[Scraper] ⚠️ ${errors.length} source(s) failed but continuing:`);
    errors.forEach(e => console.log(`  • ${e}`));
  }

  // Filter out seen jobs
  const newJobs = allJobs.filter(job => !seen.has(job.id));

  // Mark new jobs as seen
  for (const job of newJobs) {
    seen.add(job.id);
  }
  saveSeenJobs(seen);

  console.log(`[Scraper] Total: ${allJobs.length} active jobs, ${newJobs.length} new (${elapsed}s)`);
  return newJobs;
}

// CLI
if (import.meta.main) {
  console.log("🔍 Job Golem Scraper\n");
  const jobs = await scrapeAllJobs();
  console.log(`\nFound ${jobs.length} new jobs`);

  if (jobs.length > 0) {
    console.log("\nSample jobs:");
    jobs.slice(0, 5).forEach(job => {
      console.log(`  • [${job.source}] ${job.title} @ ${job.company} (${job.location})`);
    });
  }
}
