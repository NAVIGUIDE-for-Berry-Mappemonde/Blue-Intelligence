import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("blue_intelligence.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    description TEXT,
    funder TEXT,
    lat REAL,
    lng REAL,
    relevance_score REAL,
    category TEXT,
    status TEXT,
    image_url TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec(`ALTER TABLE projects ADD COLUMN image_url TEXT`);
} catch (e) {
  // Column might already exist, ignore error
}

try {
  db.exec(`ALTER TABLE projects ADD COLUMN start_date TEXT`);
  db.exec(`ALTER TABLE projects ADD COLUMN end_date TEXT`);
} catch (e) {
  // Columns might already exist, ignore error
}

// Migration: Allow null URLs
try {
  const info = db.prepare("PRAGMA table_info(projects)").all();
  const urlCol = info.find((c: any) => c.name === 'url');
  if (urlCol && urlCol.notnull === 1) {
    console.log("[Migration] Making url column nullable...");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE projects_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT UNIQUE,
          description TEXT,
          funder TEXT,
          lat REAL,
          lng REAL,
          relevance_score REAL,
          category TEXT,
          status TEXT,
          image_url TEXT,
          start_date TEXT,
          end_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO projects_new (id, title, url, description, funder, lat, lng, relevance_score, category, status, image_url, start_date, end_date, created_at)
        SELECT id, title, url, description, funder, lat, lng, relevance_score, category, status, image_url, start_date, end_date, created_at FROM projects;
        DROP TABLE projects;
        ALTER TABLE projects_new RENAME TO projects;
      `);
    })();
  }
} catch (e) {
  console.error("[Migration] Failed to migrate projects table:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engine TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL,
    projects_found INTEGER DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    raw_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec(`ALTER TABLE telemetry ADD COLUMN raw_response TEXT`);
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS failed_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_url TEXT NOT NULL,
    project_url TEXT UNIQUE NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const GOAL_PROMPT = `
### Objective
L'agent doit uniquement naviguer, gérer la pagination (cliquer sur "Suivant" ou "Charger plus") et identifier les liens vers les fiches individuelles.

### Instructions
1. Navigate to the project directory or listing page.
2. If there is pagination (e.g., "Next", "Page 2", numbers), you MUST visit every page.
3. If there is a "Load More" button or infinite scroll, you MUST trigger it repeatedly until ALL projects are visible. Keep clicking until the button disappears.
4. Identify the links to the individual project detail pages.
5. DO NOT extract detailed data (no descriptions, no coordinates). ONLY extract the URLs.

### Output Format
Return ONLY a clean JSON array of strings representing the absolute URLs of the projects.
Example: ["https://example.com/project1", "https://example.com/project2"]
`;

const EXTRACT_PROMPT = `
### Objective
L'agent doit lire la page du projet et extraire les informations détaillées.

### Instructions
1. Read the project details on the page.
2. Extract the following information: title, description, funder, latitude, longitude, category, status, image_url, start_date, end_date.
3. If some information is missing, use null or a reasonable default (e.g., 0 for lat/lng if not found).

### Output Format
Return ONLY a valid JSON object matching this schema:
{
  "title": "string",
  "url": "string",
  "description": "string",
  "funder": "string",
  "lat": number,
  "lng": number,
  "category": "string",
  "status": "string",
  "image_url": "string",
  "start_date": "string",
  "end_date": "string"
}
`;

const agentQueue: { url: string, proxy?: string, mode?: 'discover' | 'extract' }[] = [];
let activeAgents = 0;
const MAX_CONCURRENT_AGENTS = 2;

// Store active runs for SSE proxying and cancellation
const activeRuns = new Map<string, { streamingUrl: string, logs: any[], aborted?: boolean, status?: string }>();

async function processQueue() {
  if (activeAgents >= MAX_CONCURRENT_AGENTS || agentQueue.length === 0) {
    return;
  }
  
  activeAgents++;
  const task = agentQueue.shift()!;
  
  try {
    await runTinyFishAgent(task.url, task.proxy, 0, task.mode || 'discover');
  } catch (error) {
    console.error(`Agent failed for ${task.url}:`, error);
  } finally {
    activeAgents--;
    processQueue();
  }
}

const insertProjectStmt = db.prepare(`
  INSERT INTO projects (title, url, description, funder, lat, lng, category, status, relevance_score, image_url, start_date, end_date)
  VALUES (@title, @url, @description, @funder, @lat, @lng, @category, @status, @relevance_score, @image_url, @start_date, @end_date)
  ON CONFLICT(url) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    funder = excluded.funder,
    lat = excluded.lat,
    lng = excluded.lng,
    category = excluded.category,
    status = excluded.status,
    image_url = excluded.image_url,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    relevance_score = excluded.relevance_score
`);

const insertManyProjects = db.transaction((projects: any[]) => {
  let count = 0;
  for (const p of projects) {
    if (p && p.title && p.lat !== undefined && p.lng !== undefined) {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        try {
          // If URL is missing, we use a placeholder to avoid skipping
          const projectUrl = p.url || `internal://${p.title.replace(/[^\w]/g, '-').toLowerCase()}-${lat}-${lng}`;
          
          insertProjectStmt.run({
            title: p.title,
            url: projectUrl,
            description: p.description || "",
            funder: Array.isArray(p.funder) ? p.funder.join(", ") : (p.funder || ""),
            lat: lat,
            lng: lng,
            category: p.category || "General",
            status: p.status || "Active",
            image_url: p.image_url || null,
            start_date: p.start_date || null,
            end_date: p.end_date || null,
            relevance_score: p.relevance_score || 0.95
          });
          count++;
        } catch (e) {
          console.error(`[Database] Failed to insert project ${p.title}:`, e);
        }
      }
    }
  }
  return count;
});

function saveProjects(projects: any[]) {
  console.log(`[Database] saveProjects called with ${projects.length} items`);
  const savedCount = insertManyProjects(projects);
  console.log(`[Database] Saved ${savedCount} projects to database`);
  return savedCount;
}

function recordTelemetry(engine: string, targetUrl: string, status: string, projectsFound: number, durationMs: number, errorMessage: string | null = null, rawResponse: string | null = null) {
  db.prepare(`
    INSERT INTO telemetry (engine, target_url, status, projects_found, duration_ms, error_message, raw_response)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(engine, targetUrl, status, projectsFound, durationMs, errorMessage, rawResponse);
}

function parseProjectsData(projectsData: any) {
  console.log(`[Parser] Parsing data of type: ${typeof projectsData}`);
  let projects = projectsData;
  
  // If it's a string, try to parse it as JSON first
  if (typeof projects === 'string') {
    try {
      const parsed = JSON.parse(projects);
      if (typeof parsed === 'object' && parsed !== null) {
        projects = parsed;
      }
    } catch (e) {
      // Not a valid JSON object string, continue
    }
  }
  
  // Extract string from result/output wrapper if present
  if (typeof projects === 'object' && projects !== null && !Array.isArray(projects)) {
    if (typeof projects.result === 'string') {
      projects = projects.result;
    } else if (typeof projects.output === 'string') {
      projects = projects.output;
    }
  }

  if (typeof projects === 'string') {
    try {
      // Try to find JSON block
      const jsonMatch = projects.match(/```json\s*([\s\S]*?)\s*```/) || projects.match(/```\s*([\s\S]*?)\s*```/);
      const cleaned = jsonMatch ? jsonMatch[1] : projects.trim();
      
      // Remove any leading/trailing non-JSON characters if no block found
      let jsonStr = cleaned;
      if (!jsonMatch) {
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        const startObj = cleaned.indexOf('{');
        const endObj = cleaned.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && (start < startObj || startObj === -1)) {
          jsonStr = cleaned.substring(start, end + 1);
        } else if (startObj !== -1 && endObj !== -1) {
          jsonStr = cleaned.substring(startObj, endObj + 1);
        }
      }
      
      console.log(`[Parser] Attempting to parse JSON string: ${jsonStr.substring(0, 100)}...`);
      projects = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse string result:", typeof projects === 'string' ? projects.substring(0, 200) : projects);
      projects = [];
    }
  }

  if (!Array.isArray(projects) && projects !== null && typeof projects === 'object') {
    console.log(`[Parser] Data is object, extracting array. Keys: ${Object.keys(projects).join(', ')}`);
    if (projects.type === "FeatureCollection" && Array.isArray(projects.features)) {
       projects = projects.features;
    } else if (projects.projects && Array.isArray(projects.projects)) {
      projects = projects.projects;
    } else if (projects.result && Array.isArray(projects.result)) {
      projects = projects.result;
    } else if (projects.features && Array.isArray(projects.features)) {
       projects = projects.features;
    } else {
      projects = [projects];
    }
  }
  
  if (!Array.isArray(projects)) {
    console.warn("[Parser] Could not find array in data");
    return [];
  }

  console.log(`[Parser] Normalizing ${projects.length} items`);
  // Map GeoJSON features or normalize flat objects
  return projects.map((p: any) => {
    let normalized = p;
    if (p.type === "Feature" && p.properties && p.geometry) {
      normalized = {
        ...p.properties,
        lat: p.geometry.coordinates?.[1],
        lng: p.geometry.coordinates?.[0]
      };
    }
    
    // Normalize lat/lng keys
    if (normalized.latitude !== undefined && normalized.lat === undefined) normalized.lat = normalized.latitude;
    if (normalized.longitude !== undefined && normalized.lng === undefined) normalized.lng = normalized.longitude;
    
    return normalized;
  });
}

import { htmlToMarkdown } from "mdream";
import FirecrawlApp from "@mendable/firecrawl-js";

const turndownService = new TurndownService();

async function fetchMarkdown(url: string): Promise<{ markdown: string, method: string }> {
  let html = "";
  try {
    // Niveau 1: Local & Gratuit (Readability)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
    
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (article && article.textContent.length > 500) {
      const markdown = turndownService.turndown(article.content);
      return { markdown, method: 'Readability' };
    } else {
      throw new Error('Content too short or empty (JS-heavy)');
    }
  } catch (err: any) {
    console.log(`[Web Reading] Readability failed for ${url} (${err.message}), switching to Mdream...`);
    
    try {
      // Niveau 2: Mdream
      if (html) {
        const markdown = await htmlToMarkdown(html);
        if (markdown && markdown.length > 500) {
           return { markdown, method: 'Mdream' };
        }
      }
      throw new Error('Mdream result too short or empty');
    } catch (mdreamErr: any) {
      console.log(`[Web Reading] Mdream failed for ${url} (${mdreamErr.message}), switching to fallbacks...`);
      
      // Niveau 3: Jina Reader
      if (process.env.JINA_READER_API_KEY) {
        try {
          console.log(`[Web Reading] Trying Jina Reader for ${url}...`);
          const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
            headers: { 'Authorization': `Bearer ${process.env.JINA_READER_API_KEY}` }
          });
          if (!jinaRes.ok) throw new Error(`Jina HTTP ${jinaRes.status}`);
          const markdown = await jinaRes.text();
          if (markdown && markdown.length > 500) {
            return { markdown, method: 'Jina Reader' };
          }
          throw new Error('Jina Reader result too short or empty');
        } catch (jinaErr: any) {
          console.log(`[Web Reading] Jina Reader failed for ${url} (${jinaErr.message})`);
        }
      }

      // Niveau 4: Scrape.do
      const scrapeDoKey = process.env['SCRAPE.DO_API_KEY'] || process.env.SCRAPE_DO_API_KEY;
      if (scrapeDoKey) {
        try {
          console.log(`[Web Reading] Trying Scrape.do for ${url}...`);
          const scrapeRes = await fetch(`http://api.scrape.do?token=${scrapeDoKey}&url=${encodeURIComponent(url)}`);
          if (!scrapeRes.ok) throw new Error(`Scrape.do HTTP ${scrapeRes.status}`);
          const scrapeHtml = await scrapeRes.text();
          const markdown = await htmlToMarkdown(scrapeHtml);
          if (markdown && markdown.length > 500) {
            return { markdown, method: 'Scrape.do' };
          }
          throw new Error('Scrape.do result too short or empty');
        } catch (scrapeErr: any) {
          console.log(`[Web Reading] Scrape.do failed for ${url} (${scrapeErr.message})`);
        }
      }

      // Niveau 5: Firecrawl
      if (process.env.FIRECRAWL_API_KEY) {
        try {
          const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
          const scrapeResult = await firecrawl.scrape(url, { formats: ['markdown'] }) as any;
          if (!scrapeResult.success) {
            throw new Error(scrapeResult.error || "Firecrawl scrape failed");
          }
          return { markdown: scrapeResult.markdown || "", method: 'Firecrawl' };
        } catch (firecrawlErr: any) {
          console.log(`[Web Reading] Firecrawl failed for ${url} (${firecrawlErr.message})`);
          throw new Error(`All extraction methods failed. Last error: ${firecrawlErr.message}`);
        }
      } else {
        throw new Error(`All extraction methods failed. No API keys available for fallback.`);
      }
    }
  }
}

async function extractProjectData(markdown: string, url: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview',
      contents: `Extract the marine conservation project details from the following markdown content. The project URL is ${url}.\n\nMarkdown Content:\n${markdown}`,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            description: { type: Type.STRING },
            funder: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            category: { type: Type.STRING },
            status: { type: Type.STRING },
            image_url: { type: Type.STRING },
            start_date: { type: Type.STRING },
            end_date: { type: Type.STRING }
          },
          required: ["title", "url", "description", "funder", "lat", "lng", "category", "status", "image_url"]
        }
      }
    });
    
    if (!response.text) throw new Error("Empty response from Gemini");
    return JSON.parse(response.text);
  } catch (err: any) {
    throw new Error(`Gemini API Error: ${err.message}`);
  }
}

function parseUrlsData(projectsData: any): string[] {
  console.log(`[Parser] Parsing URLs data of type: ${typeof projectsData}`);
  let projects = projectsData;
  
  if (typeof projects === 'string') {
    try {
      const parsed = JSON.parse(projects);
      if (typeof parsed === 'object' && parsed !== null) {
        projects = parsed;
      }
    } catch (e) {}
  }
  
  if (typeof projects === 'object' && projects !== null && !Array.isArray(projects)) {
    if (typeof projects.result === 'string') projects = projects.result;
    else if (typeof projects.output === 'string') projects = projects.output;
  }

  if (typeof projects === 'string') {
    try {
      const jsonMatch = projects.match(/```json\s*([\s\S]*?)\s*```/) || projects.match(/```\s*([\s\S]*?)\s*```/);
      const cleaned = jsonMatch ? jsonMatch[1] : projects.trim();
      
      let jsonStr = cleaned;
      if (!jsonMatch) {
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          jsonStr = cleaned.substring(start, end + 1);
        }
      }
      
      projects = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse string result:", typeof projects === 'string' ? projects.substring(0, 200) : projects);
      projects = [];
    }
  }

  if (!Array.isArray(projects) && projects !== null && typeof projects === 'object') {
    if (projects.urls && Array.isArray(projects.urls)) projects = projects.urls;
    else if (projects.result && Array.isArray(projects.result)) projects = projects.result;
    else projects = [projects];
  }
  
  if (!Array.isArray(projects)) return [];
  
  return projects.filter(p => typeof p === 'string');
}

async function runTinyFishAgent(targetUrl: string, proxy?: string, retryCount = 0, mode: 'discover' | 'extract' = 'discover') {
  const startTime = performance.now();
  console.log(`[TinyFish] Starting agent for: ${targetUrl} (Attempt ${retryCount + 1}, Mode: ${mode})`);
  let runId = "";
  try {
    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) throw new Error("TINYFISH_API_KEY is not configured");

    // 1. Launch TinyFish Run
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-async", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        url: targetUrl,
        goal: mode === 'extract' ? EXTRACT_PROMPT : GOAL_PROMPT,
        max_steps: 60 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TinyFish] API Error Response (${response.status}):`, errorText);
      throw new Error(`TinyFish API Error: ${errorText}`);
    }

    const runData = await response.json();
    const safeRunData = { ...runData };
    if (safeRunData.error === null) delete safeRunData.error;
    console.log(`[TinyFish] Initial Run Data:`, JSON.stringify(safeRunData));
    
    if ((!runData.id && !runData.run_id) || (runData.error && runData.error !== null)) {
      console.error(`[TinyFish] Failed to start run for ${targetUrl}. Full Response:`, JSON.stringify(runData));
      const errorMsg = typeof runData.error === 'object' ? JSON.stringify(runData.error) : runData.error;
      throw new Error(errorMsg || `TinyFish failed to start run. Response: ${JSON.stringify(runData)}`);
    }
    runId = runData.id || runData.run_id;
    const streamingUrl = runData.streamingUrl || runData.streaming_url;
    
    console.log(`[TinyFish] Run started: ${runId} for ${targetUrl}. Status: ${runData.status || 'UNKNOWN'}`);
    if (runData.error) console.log(`[TinyFish] Note: Run started with non-fatal error key: ${runData.error}`);
    
    activeRuns.set(runId, { streamingUrl, logs: [], status: runData.status || "PENDING" });

    // 3. Poll for completion (or we could use SSE, but for the backend poll is safer for DB update)
    let status = runData.status || "PENDING";
    let result = null;
    let pendingStartTime = Date.now();
    const PENDING_TIMEOUT_MS = 300000; // 5 minutes timeout for PENDING state
    
    while (status === "RUNNING" || status === "PENDING") {
      // Check if run was aborted
      const currentRun = activeRuns.get(runId);
      if (!currentRun || currentRun.aborted) {
        console.log(`[TinyFish] Run ${runId} was aborted or removed. Stopping poll.`);
        break;
      }

      // Safety timeout for PENDING state
      const timeInPending = Date.now() - pendingStartTime;
      if (status === "PENDING" && (timeInPending > PENDING_TIMEOUT_MS)) {
        console.error(`[TinyFish] Run ${runId} timed out in PENDING state after ${Math.round(timeInPending/1000)}s.`);
        throw new Error("Agent timed out while waiting to start (PENDING state too long). This usually happens when the agent provider is under high load.");
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        const statusRes = await fetch(`https://agent.tinyfish.ai/v1/runs/${runId}`, {
          headers: { "X-API-Key": apiKey }
        });
        
        if (!statusRes.ok) {
           console.error(`[TinyFish] Failed to fetch status for run ${runId}. Status: ${statusRes.status}`);
           continue; // Try again next loop
        }

        const statusData = await statusRes.json();
        status = statusData.status;
        
        // Update streaming URL if it was missing and is now available
        if (currentRun && !currentRun.streamingUrl && (statusData.streamingUrl || statusData.streaming_url)) {
          activeRuns.set(runId, { 
            ...currentRun, 
            streamingUrl: statusData.streamingUrl || statusData.streaming_url,
            status: status
          });
        } else if (currentRun) {
          activeRuns.set(runId, { ...currentRun, status: status });
        }
        
        if (status !== "RUNNING") {
          console.log(`[TinyFish] Run ${runId} status: ${status}`);
        }
        
        if (status === "COMPLETED") {
          const safeStatusData = { ...statusData };
          if (safeStatusData.error === null) delete safeStatusData.error;
          if (safeStatusData.steps) delete safeStatusData.steps;
          if (safeStatusData.goal) delete safeStatusData.goal;
          if (safeStatusData.result) delete safeStatusData.result;
          if (safeStatusData.output) delete safeStatusData.output;
          console.log(`[TinyFish] Run ${runId} COMPLETED. Data:`, JSON.stringify(safeStatusData));
          result = statusData.result || statusData.output;
        } else if (status === "FAILED") {
          const safeStatusData = { ...statusData };
          if (safeStatusData.steps) delete safeStatusData.steps;
          if (safeStatusData.goal) delete safeStatusData.goal;
          if (safeStatusData.result) delete safeStatusData.result;
          if (safeStatusData.output) delete safeStatusData.output;
          console.error(`[TinyFish] Run ${runId} FAILED. Data:`, JSON.stringify(safeStatusData));
          const errorMsg = typeof statusData.error === 'object' && statusData.error !== null 
            ? (statusData.error.message || JSON.stringify(statusData.error)) 
            : statusData.error;
          throw new Error(errorMsg || "TinyFish run failed");
        }
      } catch (pollError: any) {
         console.error(`[TinyFish] Error polling status for run ${runId}:`, pollError.message);
         // Don't throw here, let the loop continue and potentially timeout if it's a transient network error
      }
    }

    let projectsFound = 0;
    let rawResponse = "";
    if (result) {
      rawResponse = typeof result === 'string' ? result : JSON.stringify(result);
      console.log(`[TinyFish] Received result for ${targetUrl}`);
      
      if (mode === 'extract') {
        try {
          // Parse the JSON result directly
          let projectData = result;
          if (typeof result === 'string') {
            const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/```\s*([\s\S]*?)\s*```/);
            const cleaned = jsonMatch ? jsonMatch[1] : result.trim();
            projectData = JSON.parse(cleaned);
          }
          
          const stmt = db.prepare(`
            INSERT INTO projects (title, url, description, funder, lat, lng, category, status, image_url, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              funder = excluded.funder,
              lat = excluded.lat,
              lng = excluded.lng,
              category = excluded.category,
              status = excluded.status,
              image_url = excluded.image_url,
              start_date = excluded.start_date,
              end_date = excluded.end_date
          `);
          
          stmt.run(
            projectData.title || 'Unknown',
            projectData.url || targetUrl,
            projectData.description || '',
            projectData.funder || 'Unknown',
            projectData.lat || 0,
            projectData.lng || 0,
            projectData.category || 'Marine Conservation',
            projectData.status || 'Active',
            projectData.image_url || '',
            projectData.start_date || null,
            projectData.end_date || null
          );
          
          try {
            db.prepare(`DELETE FROM failed_extractions WHERE project_url = ?`).run(targetUrl);
          } catch (e) {}
          
          projectsFound = 1;
          console.log(`[TinyFish] Extraction mode finished successfully for ${targetUrl}`);
        } catch (err: any) {
          console.error(`[TinyFish] Error parsing extraction result for ${targetUrl}:`, err.message);
          throw new Error(`Failed to parse extraction result: ${err.message}`);
        }
      } else {
        const urls = parseUrlsData(result);
        console.log(`[TinyFish] Discovered ${urls.length} URLs for ${targetUrl}. Starting hybrid extraction...`);
        
        let successCount = 0;
        for (let i = 0; i < urls.length; i++) {
          const projectUrl = urls[i];
          try {
            const { markdown, method } = await fetchMarkdown(projectUrl);
            const projectData = await extractProjectData(markdown, projectUrl);
            
            // Insert into DB
            const stmt = db.prepare(`
              INSERT INTO projects (title, url, description, funder, lat, lng, category, status, image_url, start_date, end_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(url) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                funder = excluded.funder,
                lat = excluded.lat,
                lng = excluded.lng,
                category = excluded.category,
                status = excluded.status,
                image_url = excluded.image_url,
                start_date = excluded.start_date,
                end_date = excluded.end_date
            `);
            
            stmt.run(
              projectData.title || 'Unknown',
              projectData.url || projectUrl,
              projectData.description || '',
              projectData.funder || 'Unknown',
              projectData.lat || 0,
              projectData.lng || 0,
              projectData.category || 'Marine Conservation',
              projectData.status || 'Active',
              projectData.image_url || '',
              projectData.start_date || null,
              projectData.end_date || null
            );
            
            // Remove from failed_extractions if it was there
            try {
              db.prepare(`DELETE FROM failed_extractions WHERE project_url = ?`).run(projectUrl);
            } catch (e) {}
            
            console.log(`[Extraction] ${i+1}/${urls.length} URL traitée via (${method}): ${projectUrl}`);
            successCount++;
          } catch (err: any) {
            console.error(`[Extraction] Error processing ${projectUrl}:`, err.message);
            try {
              db.prepare(`
                INSERT INTO failed_extractions (target_url, project_url, error_message)
                VALUES (?, ?, ?)
                ON CONFLICT(project_url) DO UPDATE SET
                  error_message = excluded.error_message,
                  created_at = CURRENT_TIMESTAMP
              `).run(targetUrl, projectUrl, err.message);
            } catch (dbErr) {
              console.error("Failed to save error to DB:", dbErr);
            }
          }
        }
        
        projectsFound = successCount;
        console.log(`[TinyFish] Hybrid extraction finished. Saved ${projectsFound} projects for ${targetUrl}`);
      }
    }
    
    const duration = Math.round(performance.now() - startTime);
    recordTelemetry('tinyfish', targetUrl, 'SUCCESS', projectsFound, duration, null, rawResponse);
    activeRuns.delete(runId);
  } catch (error: any) {
    console.error(`[TinyFish] Error for ${targetUrl}:`, error.message);
    const duration = Math.round(performance.now() - startTime);
    
    // Auto-retry once with standard profile if it failed early or timed out
    if (retryCount < 1 && !error.message.includes("aborted")) {
      console.log(`[TinyFish] Retrying ${targetUrl} due to error...`);
      if (runId) activeRuns.delete(runId);
      return runTinyFishAgent(targetUrl, proxy, retryCount + 1, mode);
    }
    
    recordTelemetry('tinyfish', targetUrl, 'ERROR', 0, duration, error.message);
    if (runId) activeRuns.delete(runId);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/debug/db", (req, res) => {
    try {
      const projects = db.prepare("SELECT * FROM projects").all();
      const telemetry = db.prepare("SELECT * FROM telemetry").all();
      res.json({ projects, telemetry });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/config-check", (req, res) => {
    res.json({
      tinyfishKeySet: !!process.env.TINYFISH_API_KEY,
      envKeys: Object.keys(process.env).filter(k => k.includes('FISH') || k.includes('API') || k.includes('KEY') || k.includes('TINY'))
    });
  });

  app.get("/api/projects", (req, res) => {
    try {
      const projects = db.prepare("SELECT * FROM projects").all();
      
      const geojson = {
        type: "FeatureCollection",
        features: projects.map((p: any) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [p.lng, p.lat],
          },
          properties: {
            id: p.id,
            title: p.title,
            url: p.url,
            description: p.description,
            funder: p.funder,
            relevance_score: p.relevance_score,
            category: p.category,
            status: p.status,
            image_url: p.image_url,
            start_date: p.start_date,
            end_date: p.end_date,
          },
        })),
      };
      
      res.json(geojson);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects/clear", (req, res) => {
    try {
      db.prepare("DELETE FROM projects").run();
      res.json({ status: "ok", message: "All projects cleared" });
    } catch (error) {
      console.error("Error clearing projects:", error);
      res.status(500).json({ error: "Failed to clear projects" });
    }
  });

  app.get("/api/telemetry", (req, res) => {
    try {
      const telemetry = db.prepare("SELECT * FROM telemetry ORDER BY created_at DESC LIMIT 100").all();
      res.json(telemetry);
    } catch (error) {
      console.error("Error fetching telemetry:", error);
      res.status(500).json({ error: "Failed to fetch telemetry" });
    }
  });

  app.get("/api/failed-extractions", (req, res) => {
    try {
      const failed = db.prepare("SELECT * FROM failed_extractions ORDER BY created_at DESC").all();
      res.json(failed);
    } catch (error) {
      console.error("Error fetching failed extractions:", error);
      res.status(500).json({ error: "Failed to fetch failed extractions" });
    }
  });

  app.post("/api/agent/force-extract", async (req, res) => {
    const { projectUrls, proxy } = req.body;
    
    if (!projectUrls || !Array.isArray(projectUrls) || projectUrls.length === 0) {
      return res.status(400).json({ error: "projectUrls array is required" });
    }

    const tinyfishKey = process.env.TINYFISH_API_KEY;
    if (!tinyfishKey) {
      return res.status(500).json({ error: "TINYFISH_API_KEY is not configured" });
    }

    // Add to queue and process in background
    for (const url of projectUrls) {
      if (!agentQueue.find(t => t.url === url)) {
        agentQueue.push({ url, proxy, mode: 'extract' });
      }
    }
    processQueue();

    res.json({ status: "QUEUED", message: `${projectUrls.length} agents deployed in background for forced extraction` });
  });

  app.post("/api/agent/start", async (req, res) => {
    const { targetUrl, proxy } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "targetUrl is required" });
    }

    const tinyfishKey = process.env.TINYFISH_API_KEY;
    if (!tinyfishKey) {
      return res.status(500).json({ error: "TINYFISH_API_KEY is not configured" });
    }

    // Add to queue and process in background
    if (!agentQueue.find(t => t.url === targetUrl)) {
      agentQueue.push({ url: targetUrl, proxy });
      processQueue();
    }

    res.json({ status: "QUEUED", message: "Agent deployed in background" });
  });

  app.get("/api/agent/active-runs", (req, res) => {
    res.json(Array.from(activeRuns.entries()).map(([id, data]) => ({ 
      id, 
      streamingUrl: data.streamingUrl,
      status: data.status 
    })));
  });

  app.get("/api/agent/stream/:runId", async (req, res) => {
    const { runId } = req.params;
    const run = activeRuns.get(runId);
    if (!run || !run.streamingUrl) {
      return res.status(404).json({ error: "Run or streaming URL not found" });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const apiKey = process.env.TINYFISH_API_KEY;
    const sseResponse = await fetch(run.streamingUrl, {
      headers: { "X-API-Key": apiKey! }
    });

    if (!sseResponse.body) return res.end();

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    res.end();
  });

  app.post("/api/agent/stop", (req, res) => {
    // Clear queue
    agentQueue.length = 0;
    
    // Mark all active runs as aborted
    for (const [id, run] of activeRuns.entries()) {
      activeRuns.set(id, { ...run, aborted: true });
    }
    
    // Force reset active count (the loops will exit on next poll)
    activeAgents = 0;
    
    res.json({ status: "STOPPED", message: "Agent queue cleared and active runs signaled to stop" });
  });

  app.get("/api/agent/status", (req, res) => {
    res.json({ activeAgents, queuedAgents: agentQueue.length });
  });

  app.get("/api/proxy-image", async (req, res) => {
    let imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("No URL provided");

    // Handle relative URLs just in case
    if (imageUrl.startsWith('/')) {
      return res.status(400).send("Invalid relative URL. Must be absolute.");
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": new URL(imageUrl).origin
        }
      });

      if (!response.ok) {
        console.error(`[Proxy Image] Failed to fetch ${imageUrl}: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch image");
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      // Cache for 24 hours
      res.setHeader("Cache-Control", "public, max-age=86400");

      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error(`[Proxy Image] Error fetching ${imageUrl}:`, error);
      res.status(404).send("Image not found");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const tfKey = process.env.TINYFISH_API_KEY;
    console.log(`[Startup] TinyFish API Key: ${tfKey ? tfKey.substring(0, 4) + '...' : 'MISSING'}`);
  });
}

startServer();
