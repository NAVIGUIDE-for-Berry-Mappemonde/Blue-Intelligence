================================================================================
                    BLUE INTELLIGENCE — README
         Autonomous Maritime Spatial Intelligence Agent
================================================================================

================================================================================
1. PROJECT DESCRIPTION
================================================================================

Blue Intelligence is an autonomous maritime geospatial intelligence agent,
powered by the TinyFish API. It transforms the living, chaotic web of maritime
data into an executable, up-to-date geospatial database.

PROBLEM SOLVED
--------------
The world's oceans are undergoing rapid industrialization ("Blue Acceleration"):
offshore wind, deep-sea mining, aquaculture, conservation efforts. Spatial data
describing who builds what and where is locked in the maritime industry's
"Deep Web." This data does not reside in clean APIs. It is buried in government
permitting portals, corporate registries, port authority databases, and
environmental impact studies. These sites are designed for human eyes: complex
interface navigation, multi-step forms, infinite pagination, dynamic rendering
(JavaScript).

Currently, analysts and GIS professionals spend hours manually clicking through
these fragmented portals to compile a common operational picture (COP). This
manual work is slow, costly, and produces a COP that is obsolete upon
publication.

OBJECTIVE
---------
Replace the manual work of OSINT analysts with an autonomous agentic system.
Blue Intelligence navigates, extracts, structures, and maps marine conservation,
restoration, and protection projects (MPAs, reefs, mangroves, seagrass,
anti-IUU efforts) worldwide.


================================================================================
2. NAVIGUIDE / BERRY-MAPPEMONDE / BLUE INTELLIGENCE ECOSYSTEM
================================================================================

Blue Intelligence is part of a larger ecosystem:

  • NAVIGUIDE (naviguide.fr)
    Intelligent navigation platform for the Berry-Mappemonde expedition.
    Combines Copernicus, Galileo, EGNOS, KINÉIS, IRIS² data for optimal
    routing, climatological analysis, and real-time tracking.

  • BERRY-MAPPEMONDE (berrymappemonde.org)
    36-month maritime expedition linking Berry to 13 French overseas
    territories, 45,000 nautical miles. Blue Intelligence identifies
    local conservation initiatives along the route to organize site visits
    and document marine restoration efforts.

  • BLUE INTELLIGENCE
    "Impact" module of the NAVIGUIDE ecosystem. Exports discoveries as
    standardized GeoJSON, enabling the yacht routing engine to integrate
    an environmentally-focused navigation layer. The route becomes a literal
    bridge between marine sanctuaries and protection projects detected
    automatically by AI.

  • WEBSITES
    • https://www.naviguide.fr
    • https://www.berrymappemonde.org


================================================================================
3. FULL APPLICATION DESCRIPTION
================================================================================

ARCHITECTURE
------------
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Leaflet + MapLibre
- Backend: Node.js + Express + better-sqlite3
- Database: SQLite (blue_intelligence.db)
- APIs: TinyFish (web agent), Anthropic Claude (extraction, gatekeeper)

MAIN FEATURES
-------------

  A. Interactive world map
     • Marine conservation projects displayed as GeoJSON
     • Marker clusters by zoom level
     • Spatial sampling to avoid visual overload
     • Popups with title, funder, description, status, dates, image
     • Filtering by funder (foundations/organizations)

  B. Left sidebar
     • Selector: "All X Organizations (Y)" — X = number of organizations
       (MasterSeeds), Y = number of projects found
     • Filtered project list with coordinates
     • "Deploy ETL Swarm" button to launch automatic extraction

  C. Right sidebar (Settings)
     • "?" icon: enables help mode (tooltips on all buttons and elements)
     • FR/EN toggle: interface language (English by default)
     • Download links: Manual and README in EN and FR
     • Light / dark mode
     • GSHHG filtering (land/sea):
       - Max distance to coast for "coastal" project (km)
       - Gatekeeper thresholds: marine_threshold, inland_threshold
     • Parameter persistence in localStorage

  D. GSHHG filtering
     • Land/sea mask based on NOAA GSHHG (Global Self-consistent Hierarchical
       High-resolution Geography)
     • "Crude" resolution embedded by default (no download required)
     • Configurable distance to coast to include coastal projects

  E. Database
     • projects table: id, title, url, description, funder, lat, lng,
       relevance_score, s_ocean_score, category, status, image_url,
       start_date, end_date
     • telemetry table: TinyFish run tracking
     • failed_extractions table: extraction failures

  F. Real-time stream
     • API /api/projects/stream: SSE for new projects
     • API /api/projects/ndjson: NDJSON export

  G. MasterSeeds
     • 78 organizations (foundations, NGOs, government portals) in
       data/MasterSeeds.json
     • Extensible list: Blue Intelligence discovers new portals
       through exploration


================================================================================
4. COMPLETE ETL PIPELINE
================================================================================

STRUCTURAL MEMORY
----------------
• MasterSeeds.json: list of target portals (foundations, NGOs, CORDIS, etc.)
• DeepLinkCacheProjectsLists.json: URLs of list pages already visited
• DeepLinkCacheProjectsPages.json: URLs of individual project pages

PHASE 1: DISCOVERY (discover mode)
----------------------------------
• TinyFish Agent receives a portal URL (MasterSeeds or cache)
• Goal: navigate, handle pagination, identify links to individual pages
• OUTPUT: JSON array of project URLs
• Injection into DeepLinkCache

PHASE 2: EXTRACTION (extract mode)
---------------------------------
• For each project URL:
  a) Content retrieval: Readability → Mdream → Firecrawl → Scrape.do
     → Jina Reader (cascade)
  b) 3-stage pipeline: Haiku gatekeeper → Sonnet extract+coastal snapping
     → Sonnet S_ocean
  c) Gatekeeper: reject if marine_relevance < threshold (coastal or inland)
  d) Extraction: title, description, funder, lat, lng, category, status,
     image_url, start_date, end_date
  e) Coastal snapping: if coordinates on land → recalculate to maritime zone
  f) S_ocean score: technical reliability, source, oceanic localization
  g) Deduplication: title/description similarity > 85%, proximity < 500 m
  h) Upsert to database (insert or update)

PHASE 3: DEDUPLICATION
----------------------
• Criteria: haversine < 500 m, textSimilarity title ≥ 0.85,
  textSimilarity description ≥ 0.85
• Funder merge on duplicate

PHASE 4: OUTPUT
--------------
• GeoJSON FeatureCollection via /api/projects
• SSE broadcast for new projects
• NDJSON export via /api/projects/ndjson

ETL API
-------
• GET  /api/etl/seeds        : list MasterSeeds
• GET  /api/etl/caches       : lists and pages in cache
• POST /api/etl/swarm-deploy : deploy swarm (discover + extract)
• POST /api/agent/start      : launch agent on target URL
• POST /api/agent/force-extract : forced extraction on given URLs


================================================================================
5. LINKS AND RESOURCES
================================================================================

COMMUNITY
---------
• NAVIGUIDE / Berry-Mappemonde Discord server:
  https://discord.gg/UPTWWGtE

• X (Twitter) Berry-Mappemonde:
  https://x.com/BerryMappemonde

OFFICIAL SITES
--------------
• NAVIGUIDE: https://www.naviguide.fr
• Berry-Mappemonde: https://www.berrymappemonde.org

HACKATHONS & PLATFORMS
----------------------
• LabLab.ai — Berry-Mappemonde profile:
  https://lablab.ai/u/@BerryMappemonde

• LabLab.ai — Complete AI Agent Hackathon (NAVIGUIDE):
  https://lablab.ai/ai-hackathons/complete-ai-agent-hackathon/naviguide/naviguide-for-berry-mappemonde

• LabLab.ai — AI Agents AI Week Hackathon:
  https://lablab.ai/ai-hackathons/ai-agents-ai-week-hackathon/naviguide-for-berry-mappemonde

• TAIKAI — CASSINI Hackathons EU Space Consumer Experience (idea):
  https://taikai.network/cassinihackathons/hackathons/eu-space-consumer-experience/projects/cmhdphi9c068v5yva13s9w92t/idea

• TAIKAI Garden — NAVIGUIDE for Berry-Mappemonde:
  https://garden.taikai.network/fr/projects/cmjxywgp201gxmmhqeyt7qm9o/about

REPOSITORY
----------
• GitHub: https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence


================================================================================
6. TEAM
================================================================================

CLÉMENT FILISETTI (Leader)
--------------------------
• President, Association Berry-Mappemonde
• Maritime Expedition Leader | Public Health Physician
• EUSPA UCP profile: https://www.euspa-ucp.eu/speakers/clement-filisetti
• System design, institutional relations, NAVIGUIDE vision

HAMZA ALI
---------
• Front-end, database, data architecture, UI/UX, machine learning,
  data engineering

DILEEP CHOUDHARY
----------------
• Back-end, front-end, database, full-stack, UI/UX, DevOps

RABIA NAZ
---------
• Front-end, data architecture, game, UI/UX, machine learning, cloud


================================================================================
7. CREDITS
================================================================================

• TinyFish API (autonomous web agent)
• Anthropic Claude (extraction, gatekeeper, scoring)
• NOAA GSHHG (land/sea mask, crude embedded)
• Leaflet, MapLibre, React
• Mozilla Readability, Mdream, Firecrawl, Turndown
• better-sqlite3, Express, Vite
• Foundations and organizations listed in MasterSeeds.json


================================================================================
8. MANUAL AND DOCUMENTATION
================================================================================

The application provides:
  • User manual (EN/FR): ETL log sequence, tooltip texts
  • README (EN/FR): description, installation, links
  • Download from right sidebar (Settings)

INSTALLATION
------------
1. Clone the repository
2. npm install
3. Copy .env.example to .env and configure:
   - TINYFISH_API_KEY (required for ETL)
   - CLAUDE_API_KEY or ANTHROPIC_API_KEY (required for extraction)
   - FIRECRAWL_API_KEY, SCRAPE_DO_API_KEY, JINA_READER_API_KEY (optional)
4. npm run dev (launch server on http://localhost:3000)

Note: GSHHG crude data is embedded; no download required. For low/intermediate/
high/full resolution, run: npm run download-gshhg -- --resolution=low

USAGE
-----
• Map: zoom, pan, click marker for popup
• Left sidebar: filter by funder, view project list
• "Deploy ETL Swarm" button: launch extraction on MasterSeeds + cache
• Right sidebar: GSHHG parameters, gatekeeper, light/dark theme
• Export: /api/projects (GeoJSON), /api/projects/ndjson

SCREENSHOTS AND VIDEO
---------------------
Visual documentation (screenshots of each feature, demo video) can be produced
manually or automated.

QUESTION: Could TinyFish surf on Blue Intelligence and NAVIGUIDE, take
screenshots of each feature, and record its navigation video?

ANSWER: In theory, yes. TinyFish is a web agent capable of navigating any site.
Given Blue Intelligence or naviguide.fr as target URL and an objective like
"Browse each section of the interface, capture screenshots and record your
session," it could potentially:
  • Navigate the application
  • Click on various elements (sidebar, settings, filters)
  • Follow the ETL flow

Screenshot and screen recording capability depends on features exposed by the
TinyFish API. The TinyFish 2026 hackathon required a 2-3 minute demo video
of the agent executing workflows live. For automated documentation of the
Blue Intelligence interface, it would be necessary to verify whether TinyFish
offers screenshot/screen recording hooks or if an external solution (Playwright,
Puppeteer) would be better suited for this specific use case.


================================================================================
9. TECHNICAL TAGS
================================================================================

TinyFish API | Google AI Studio | complete.dev | React | TypeScript | Node.js |
Express | Tailwind CSS | Vite | AI Agents | LLM | Web Scraping | OSINT |
Geospatial | GIS | Automation | Marine Conservation | Blue Economy |
NAVIGUIDE | Berry-Mappemonde


================================================================================
                              END OF README
================================================================================
