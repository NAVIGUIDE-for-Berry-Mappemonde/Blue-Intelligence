# Blue Intelligence — User Manual (English)

**Maritime OSINT Swarm for NAVIGUIDE and Berry-Mappemonde**

---

## 1. Overview

Blue Intelligence is an autonomous maritime geospatial intelligence agent. It deploys TinyFish agents to discover and extract marine conservation projects from foundation websites, then displays them on an interactive world map. Use the **Help mode** (?) in the right sidebar to see detailed tooltips on every UI element.

---

## 2. Log Sequence (ETL Pipeline)

The application displays real-time logs reflecting the ETL pipeline and swarm process:

### Deploy Phase
```
[ETL] Swarm deploy starting...
[ETL] Database cleared                    (if "Clear database before starting" is checked)
[ETL] MasterSeeds: X foundations
[ETL] DeepLinkCache: Y lists, Z pages
[ETL] Queue: X discover + Y extract = N tasks
[ETL] N tasks enqueued → Swarm
```

### Agent Dispatch
```
[Swarm] TinyFish 1 dispatched → [URL]
[TinyFish 1] Discovery browsing → [URL]   (or Extract browsing in extract mode)
```

### Discovery Phase
```
[TinyFish 1] Discovery complete
[ETL] DeepLinkCache updated (+M pages)
[ETL] Extraction pipeline: M URLs (concurrency=X)
```

### Extraction Pipeline
```
[ETL] Fetch 1/M: [hostname]
[ETL] Claude extract → [title]
[ETL] Saved → [title]
[ETL] Extraction complete: K projects saved
```

### Extract-Only Mode
```
[ETL] Extract-only → [URL]
[ETL] Fetch → [hostname]
[ETL] Gatekeeper rejected → [host]        (if rejected)
[ETL] Claude extract → [title]
[ETL] Saved → [title]
[ETL] Extract complete: 1 project saved
```

### Stop / Clear
```
[Swarm] Stop requested
[ETL] Database cleared
```

---

## 3. Tooltips (Help Mode)

Click the **?** icon in the right sidebar to enable Help mode. When ON, every button, input, and section shows a detailed tooltip on hover.

| Element | Tooltip |
|---------|---------|
| **Blue Intelligence** | Autonomous AI-driven geospatial mapping engine. Transforms unstructured web data into a live GeoJSON map of global marine conservation. |
| **Maritime OSINT Swarm** | Part of the NAVIGUIDE ecosystem—Impact module for the Berry-Mappemonde sailing expedition. |
| **Target mode** | Test (2): deploys only 2 foundations for quick validation. Full: deploys all MasterSeeds (65+) plus DeepLinkCache pages. |
| **Proxy** | Optional proxy location for TinyFish agents. Use when target sites restrict access by region. |
| **AI Swarm** | Launches the ETL swarm. TinyFish agents discover project URLs from MasterSeeds and DeepLinkCache, then extract via Readability + Claude. Implements recursive « Follow the Money » discovery. |
| **Clear database before starting** | If checked, deletes all projects before deploying. Use for a fresh start. |
| **Stop Swarm** | Stops all active TinyFish agents, clears the queue, and aborts ongoing extractions. |
| **Process logs** | Real-time logs of the ETL pipeline: deploy, discovery, extraction, data flow. |
| **Active / Queued** | Active: number of TinyFish agents currently running (max 2). Queued: tasks waiting (discover or extract). |
| **Live Swarm Console** | Shows active TinyFish agents with target URL, status, mode, and live logs. |
| **Watch Agent** | Opens the TinyFish agent streaming URL in a new tab to watch the agent browse in real time. |
| **Organization filter** | Filter projects by funding organization. Each option displays project count. |
| **Filtered Projects** | Number of projects matching the current funder filter. Displayed on the map as markers. |
| **Export GeoJSON** | Downloads the filtered projects as a GeoJSON FeatureCollection. Use in QGIS, MapLibre, or any GIS tool. |
| **Clear All Projects** | Deletes all projects from the database. Disabled while swarm is running. |
| **Settings** | GSHHG marine filtering, Claude models, extraction concurrency, documentation downloads. Stored in browser localStorage; sent to server when swarm is deployed. |
| **Help (?)** | Toggle help mode. When ON, every element shows a detailed tooltip on hover. |
| **Coast distance (km)** | 0 = strict (point on land = inland). 100 = allow up to 100 km from sea. |
| **Marine / Inland thresholds** | Gatekeeper: minimum marine_relevance (0–1) for coastal vs inland projects. |
| **Concurrency** | 1–10. Number of project URLs extracted in parallel. Higher = faster, more API load. |
| **Gatekeeper model** | Claude model for semantic filtering. Haiku recommended (fast, cheap). |
| **Extraction model** | Claude model for extraction and S_ocean scoring. Sonnet recommended for quality. |
| **Map** | Zoom limits and marker sampling. Fewer markers when zoomed out for performance. |
| **Swarm Audit** | Dashboard: total extractions, success rate, projects mapped. Telemetry table. Failed extractions with force-retry. |
| **Force extract** | Re-queues a failed URL for extraction with TinyFish. |

---

## 4. Quick Start

1. Configure `TINYFISH_API_KEY` and `CLAUDE_API_KEY` in `.env`
2. Run `npm run download-gshhg` then `npm run dev`
3. Open http://localhost:3000
4. (Optional) Enable Help mode (?) to explore tooltips
5. Click **AI Swarm** to start extraction
6. Use **Export GeoJSON** to download results

---

## 5. ETL Pipeline Summary

- **Inputs:** MasterSeeds.json, DeepLinkCacheProjectsLists.json, DeepLinkCacheProjectsPages.json
- **Discovery:** TinyFish agents explore site trees, inject new URLs into caches
- **Scraping:** Readability.js cleans HTML before Claude
- **Transformation:** Claude Gatekeeper (Haiku) → Claude Extraction (Sonnet) → Claude Scoring (Sonnet) S_ocean
- **Coastal snapping:** Inland coordinates snapped to nearest maritime zone
- **Deduplication:** URL match, < 500 m proximity, semantic similarity
- **Output:** GeoJSON stream to map

---

## 6. Parameters Reference

### GSHHG (Marine Filtering)

- **Coast distance (km):** Max distance from sea to consider a project "coastal". 0 = strict (point on land = inland). 100 = allow projects up to 100 km from coast. Used with NOAA GSHHG to classify coastal vs inland for threshold application.
- **Min marine score (coastal):** Gatekeeper threshold 0–1. Projects below are rejected. Lower = more permissive.
- **Min marine score (inland):** Stricter threshold for projects far from coast. E.g. 0.9 to reject terrestrial/freshwater initiatives.

### Claude Models (3-stage pipeline)

- **Gatekeeper model:** Semantic filter. Rejects purely terrestrial (forests) or freshwater (lakes) projects. Ensures only true "Blue" initiatives enter the system. Haiku recommended (fast, cheap).
- **Extraction model:** Extracts title, description, coordinates, funder from cleaned HTML. Performs coastal snapping if coordinates land inland. Sonnet recommended for quality.
- **Scoring model:** Computes S_ocean score (0–1): technicality, source reliability, oceanic localization. Sonnet recommended.

### Agents & Concurrency

- **Number of TinyFish agents:** 1–10. Max TinyFish agents in parallel for discovery (browsing foundation sites).
- **Number of Readability agents:** 1–20. Readability+Claude extractions in parallel. Higher = faster but more API load.

### Map

- **Zoom min:** Minimum zoom level of the map.
- **Max markers:** Spatial sampling by zoom. Zoom < 5: 200 markers; < 8: 500; else: 2000. Fewer when zoomed out for performance.

---

## Links

- **Blue Intelligence Discord:** https://discord.gg/zQcPgxpH
- **NAVIGUIDE Discord:** https://discord.gg/UPTWWGtE
- **Berry-Mappemonde Discord:** https://discord.gg/NsWrxXUQ
- NAVIGUIDE: https://naviguide.fr
- Berry-Mappemonde: https://berrymappemonde.org
- GitHub: https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence

---

*Blue Intelligence — Maritime OSINT Swarm for NAVIGUIDE and Berry-Mappemonde*
