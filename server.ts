import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("blue_intelligence.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    description TEXT,
    funder TEXT,
    lat REAL,
    lng REAL,
    relevance_score REAL,
    category TEXT,
    status TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec(`ALTER TABLE projects ADD COLUMN image_url TEXT`);
} catch (e) {
  // Column might already exist, ignore error
}

const GOAL_PROMPT = `Blue Intelligence Swarm: System Instructions v2.01. Identity & Mission
You are the Lead Agent of the Global Project Swarm. Your mission is to autonomously identify, validate, and map global marine protection, restoration, and conservation initiatives. You operate within a parallel worker pool of 8 agents, ensuring high-concurrency data extraction with geospatial precision.

2. "Gatekeeper" Protocol (Semantic Filtering)
Before any extraction, you must validate that the project belongs strictly to the "Blue Only" domain.
Target Ecosystems: Coral reefs, mangroves, seagrass beds, pelagic zones, deep-sea abysses, saline estuaries.
Priority Actions: Marine Protected Areas (MPAs), illegal fishing (IUU) mitigation, blue carbon sequestration, marine biodiversity restoration.
Strict Exclusions: Reject purely terrestrial projects (forests), freshwater initiatives (lakes/rivers), or urban recycling programs unless they are directly linked to marine discharge.

3. Hybrid & Recursive Discovery Strategy
Seed Mode: Prioritize scraping and spidering the project directories of the pivot foundations.
"Follow the Money" Mode: For every page analyzed, extract the names of partners and grantees.
If the discovered entity is a Funder -> Add it to the Discovery Queue.
If it is an Implementer/NGO -> Trigger a search for their official site for deep extraction.

4. Spatial Integrity & Entity Resolution
Marine Validation: Apply a "Point-in-Ocean" test. If coordinates fall inland, force "snapping" to the nearest coastal zone or Exclusive Economic Zone (EEZ).
Entity Resolution (Deduplication): Before generating a Feature, check for duplicates based on three criteria:
URL Match: Immediate merge if the source URL is identical.
Spatial Buffer: Flag for review if two projects of the same category are within 500m of each other.
Semantic Similarity: Merge if descriptions have a similarity score > 0.90 using vector embeddings.
Ocean Relevance Score (S_ocean): Calculate for every entry:
S_ocean = (W_k * K) + (W_g * G) + (W_s * S)
(Where K=Technical Keywords, G=MPA Proximity, S=Source Reliability).

5. Output Specification (GeoJSON)
Output strictly valid JSON. No conversational filler. Every project must include its relevance score and multiple sources if merged. Return a FeatureCollection containing the extracted projects.
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [longitude, latitude] },
      "properties": {
        "title": "Project Name",
        "url": "Verified_Direct_URL",
        "description": "< 250 chars, focused on ecological impact metrics",
        "funder": ["Funder A", "Funder B"],
        "relevance_score": 0.00,
        "category": "Habitat/Species/Fisheries",
        "status": "Active/Completed",
        "image_url": "https://example.com/image.jpg"
      }
    }
  ]
}`;

const agentQueue: string[] = [];
let activeAgents = 0;
const MAX_CONCURRENT_AGENTS = 8;

async function processQueue() {
  if (activeAgents >= MAX_CONCURRENT_AGENTS || agentQueue.length === 0) {
    return;
  }
  
  activeAgents++;
  const targetUrl = agentQueue.shift()!;
  
  try {
    await runTinyFishAgent(targetUrl);
  } catch (error) {
    console.error(`Agent failed for ${targetUrl}:`, error);
  } finally {
    activeAgents--;
    processQueue();
  }
}

async function runGeminiFallback(targetUrl: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    ${GOAL_PROMPT}
    
    Target URL to analyze: ${targetUrl}
    
    Please use the googleSearch tool to find marine conservation projects associated with this foundation/URL.
    Extract the projects and return them as a FeatureCollection JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          features: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                geometry: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    coordinates: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER }
                    }
                  }
                },
                properties: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    description: { type: Type.STRING },
                    funder: { type: Type.ARRAY, items: { type: Type.STRING } },
                    relevance_score: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    status: { type: Type.STRING },
                    image_url: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  return null;
}

async function runTinyFishAgent(targetUrl: string) {
  let projects: any = null;

  try {
    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) throw new Error("TINYFISH_API_KEY is not configured");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        url: targetUrl,
        goal: GOAL_PROMPT,
        browser_profile: "lite",
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TinyFish API Error: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.status === "COMPLETED" && data.result) {
      projects = data.result;
    }
  } catch (error: any) {
    console.warn(`TinyFish failed for ${targetUrl}, falling back to Gemini:`, error.message);
    try {
      projects = await runGeminiFallback(targetUrl);
    } catch (geminiError: any) {
      console.error(`Gemini fallback also failed for ${targetUrl}:`, geminiError.message);
      throw geminiError;
    }
  }

  if (projects) {
    if (typeof projects === 'string') {
      try {
        const cleaned = projects.replace(/```json/g, '').replace(/```/g, '').trim();
        projects = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse string result:", projects);
        projects = [];
      }
    }

    if (!Array.isArray(projects)) {
      if (projects.type === "FeatureCollection" && Array.isArray(projects.features)) {
         projects = projects.features;
      } else if (projects.projects && Array.isArray(projects.projects)) {
        projects = projects.projects;
      } else if (projects.features && Array.isArray(projects.features)) {
         projects = projects.features;
      } else {
        projects = [projects];
      }
    }
    
    // Map GeoJSON features to flat objects
    projects = projects.map((p: any) => {
      if (p.type === "Feature" && p.properties && p.geometry) {
        return {
          ...p.properties,
          lat: p.geometry.coordinates?.[1],
          lng: p.geometry.coordinates?.[0]
        };
      }
      return p;
    });

    const insertStmt = db.prepare(`
      INSERT INTO projects (title, url, description, funder, lat, lng, category, status, relevance_score, image_url)
      VALUES (@title, @url, @description, @funder, @lat, @lng, @category, @status, @relevance_score, @image_url)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        funder = excluded.funder,
        lat = excluded.lat,
        lng = excluded.lng,
        category = excluded.category,
        status = excluded.status,
        image_url = excluded.image_url,
        relevance_score = excluded.relevance_score
    `);

    const insertMany = db.transaction((projs) => {
      for (const p of projs) {
        if (p && p.title && p.url && p.lat !== undefined && p.lng !== undefined) {
           const lat = parseFloat(p.lat);
           const lng = parseFloat(p.lng);
           
           if (!isNaN(lat) && !isNaN(lng)) {
             insertStmt.run({
               title: p.title,
               url: p.url,
               description: p.description || "",
               funder: Array.isArray(p.funder) ? p.funder.join(", ") : (p.funder || ""),
               lat: lat,
               lng: lng,
               category: p.category || "General",
               status: p.status || "Active",
               image_url: p.image_url || null,
               relevance_score: p.relevance_score || 0.95
             });
           }
        }
      }
    });

    insertMany(projects);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
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
          },
        })),
      };
      
      res.json(geojson);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/agent/start", async (req, res) => {
    const { targetUrl } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "targetUrl is required" });
    }

    const tinyfishKey = process.env.TINYFISH_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!tinyfishKey && !geminiKey) {
      return res.status(500).json({ error: "Neither TINYFISH_API_KEY nor GEMINI_API_KEY is configured" });
    }

    // Add to queue and process in background
    if (!agentQueue.includes(targetUrl)) {
      agentQueue.push(targetUrl);
      processQueue();
    }

    res.json({ status: "QUEUED", message: "Agent deployed in background" });
  });

  app.get("/api/agent/status", (req, res) => {
    res.json({ activeAgents, queuedAgents: agentQueue.length });
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
  });
}

startServer();
