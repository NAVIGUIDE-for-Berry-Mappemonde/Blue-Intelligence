# Blue Intelligence — README (English)

**Maritime OSINT Swarm for NAVIGUIDE and Berry-Mappemonde**

Blue Intelligence is an autonomous, AI-driven geospatial mapping engine and data extraction platform. It transforms the living, chaotic web of maritime data into an executable, up-to-date geospatial database.

---

## Mission & Problem

Despite the ocean covering 71% of our planet and being our greatest buffer against climate change, global marine conservation efforts are highly fragmented. Thousands of NGOs, researchers, and foundations work on critical initiatives—coral reef restoration, combating illegal fishing (IUU), establishing Marine Protected Areas (MPAs)—but their data is siloed across countless websites and reports.

**The Problem:** There is no centralized, real-time, and comprehensive map of global marine action. This lack of visibility leads to duplicated efforts, inefficient funding allocation, and missed opportunities for collaboration.

**The Solution:** Blue Intelligence exists to solve this data fragmentation. By autonomously mapping the global "blue economy" and conservation landscape, it provides decision-makers with the clarity needed to protect and restore our oceans effectively.

---

## The Mechanism

Blue Intelligence is not a static database, but a **living, self-updating intelligence swarm**. The application operates using a sophisticated, multi-agent AI architecture:

- **Parallel Swarm Intelligence:** A pool of concurrent TinyFish agents continuously spiders and scrapes the project directories of major global foundations (Oceana, Packard, The Ocean Foundation, etc.).

- **Recursive "Follow the Money" Discovery:** When an agent reads a page, it identifies partners and grantees. If it finds a new NGO, it automatically adds their website to the queue, creating a recursive web of discovery.

- **The "Gatekeeper" Protocol:** Semantic filters reject purely terrestrial (forests) or freshwater (lakes) projects, ensuring only true "Blue" initiatives (pelagic zones, mangroves, reefs, estuaries) enter the system.

- **Geospatial Precision:** If extracted coordinates land inland (e.g., an NGO's headquarters), the system "snaps" them to the nearest coastal zone or EEZ.

- **Entity Resolution & Deduplication:** Before mapping, the system checks for duplicates using URL matching, spatial proximity (< 500 m), and semantic similarity scoring.

---

## Ecosystem: NAVIGUIDE & Berry-Mappemonde

- **NAVIGUIDE** (naviguide.fr): Intelligent navigation platform for the Berry-Mappemonde expedition
- **Berry-Mappemonde** (berrymappemonde.org): 36-month maritime expedition linking Berry to 13 French overseas territories
- **Blue Intelligence:** "Impact" module of the NAVIGUIDE ecosystem; exports discoveries as GeoJSON for routing integration

For the Berry-Mappemonde sailing expedition, Blue Intelligence solves a critical logistical hurdle: precisely identifying local conservation initiatives along the vessel's route from thousands of fragmented sources. The crew replaces weeks of manual research with automated, intelligent planning.

---

## ETL Pipeline Architecture

### I. Multi-Level Parallelization

- **I/O Level:** Asynchronous Worker Pool—while one TinyFish agent waits for a DOM to load, another extracts data from ready pages.
- **API Level:** Claude AI requests sent in bursts (batching) within rate limits.
- **Compute Level:** Geospatial distance and semantic similarity checks on separate threads.

### II. Structural Memory

- **MasterSeeds.json:** Homepages for 65+ tracked foundations.
- **DeepLinkCacheProjectsLists.json:** Strategic sub-pages (catalogs, project maps) identified in previous sessions.
- **DeepLinkCacheProjectsPages.json:** Specific project pages for scraping.

### III. Transformation (Claude AI)

- **Gatekeeper (Haiku):** Semantic filtering to reject terrestrial/freshwater projects.
- **Extraction & Geocoding (Sonnet):** Title, description, coordinates, funder; coastal snapping if inland.
- **S_ocean Scoring (Sonnet):** Relevance score based on technicality, source reliability, oceanic localization.

### IV. Consolidation

- **Follow the Money Deduplication:** Merge projects sharing URL, or < 500 m proximity, or near-identical description.
- **Enrichment:** Merged entries list all funders (Claude Opus verification).
- **Output:** GeoJSON stream for near-instant map updates.

---

## Features

- **Interactive world map:** Marine conservation projects in GeoJSON, clusters, popups with image
- **Left sidebar:** Funder filter, project list, Deploy TinyFish Swarm, process logs, Export GeoJSON, Clear All Projects
- **Right sidebar:** Settings (GSHHG, Claude models, concurrency), Help mode (?), FR/EN toggle, Manual/README download links
- **Audit dashboard:** Telemetry, success rate, failed extractions with force-retry
- **i18n:** French and English (default: English)

---

## Target Audience

- **Philanthropic Foundations & Climate Investors:** Discover funding gaps, track grantee impact, find grassroots initiatives.
- **Marine NGOs & Conservationists:** Identify partners in same regions or ecological niches.
- **Policymakers & Governments:** Visualize conservation efforts within EEZs, measure progress toward 30x30.
- **Marine Researchers & Scientists:** Access centralized, structured dataset for meta-analysis.

---

## Installation

1. `npm install`
2. Copy `.env.example` to `.env` and set `TINYFISH_API_KEY`, `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`)
3. `npm run download-gshhg`
4. `npm run dev` → http://localhost:3000

---

## Team

- **Clément Filisetti** (Leader) — system-design
- **Hamza Ali** — front-end, database-development, data-architecture, ui-ux, machine-learning, data-engineer
- **Dileep Choudhary** — back-end, front-end, database-development, full-stack-development, ui-ux, devops
- **Rabia Naz** — front-end, data-architecture, game, ui-ux, machine-learning, cloud-computing

---

## Links

- NAVIGUIDE: https://naviguide.fr
- Berry-Mappemonde: https://berrymappemonde.org
- GitHub: https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence
