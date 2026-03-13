================================================================================
                    BLUE INTELLIGENCE — README
         Autonomous Maritime Spatial Intelligence Agent
================================================================================

================================================================================
1. DESCRIPTION DU PROJET
================================================================================

Blue Intelligence est un agent autonome d'intelligence géospatiale maritime,
propulsé par l'API TinyFish. Il transforme le web vivant et chaotique des
données maritimes en une base de données géospatiale exécutable et à jour.

PROBLÈME RÉSOLU
----------------
L'océan mondial subit une industrialisation rapide (« Blue Acceleration ») :
éolien offshore, exploitation minière en haute mer, aquaculture, efforts de
conservation. Les données spatiales décrivant qui construit quoi et où sont
enfermées dans le « Deep Web » de l'industrie maritime. Ces données ne
résident pas dans des API propres. Elles sont enfouies dans des portails
gouvernementaux de permis, des registres d'entreprises, des bases de données
d'autorités portuaires et des études d'impact environnemental. Ces sites
sont conçus pour des yeux humains : navigation dans des interfaces
complexes, formulaires multi-étapes, pagination infinie, rendu dynamique
(JavaScript).

Actuellement, des analystes et professionnels GIS passent des heures à
cliquer manuellement dans ces portails fragmentés pour compiler une
situation opérationnelle commune (COP). Ce travail manuel est lent, coûteux
et produit une COP obsolète dès sa publication.

OBJECTIF
--------
Remplacer le travail manuel des analystes OSINT par un système agentique
autonome. Blue Intelligence navigue, extrait, structure et cartographie
les projets de conservation marine, restauration et protection (AMP, récifs,
mangroves, herbiers, lutte anti-IUU) dans le monde entier.


================================================================================
2. ÉCOSYSTÈME NAVIGUIDE / BERRY-MAPPEMONDE / BLUE INTELLIGENCE
================================================================================

Blue Intelligence s'intègre dans un écosystème plus large :

  • NAVIGUIDE (naviguide.fr)
    Plateforme de navigation intelligente pour l'expédition Berry-Mappemonde.
    Combine données Copernicus, Galileo, EGNOS, KINÉIS, IRIS² pour le routage
    optimal, l'analyse climatologique et le suivi en temps réel.

  • BERRY-MAPPEMONDE (berrymappemonde.org)
    Expédition maritime de 36 mois reliant le Berry aux 13 territoires
    français d'outre-mer, 45 000 milles nautiques. Blue Intelligence identifie
    les initiatives locales de conservation le long de la route pour organiser
    des visites sur site et documenter les efforts de restauration marine.

  • BLUE INTELLIGENCE
    Module « Impact » de l'écosystème NAVIGUIDE. Exporte ses découvertes en
    GeoJSON standardisé, permettant au moteur de routage du yacht d'intégrer
    une couche de navigation à finalité environnementale. L'itinéraire devient
    un pont littéral entre sanctuaires marins et projets de protection
    détectés automatiquement par l'IA.

  • SITES WEB
    • https://www.naviguide.fr
    • https://www.berrymappemonde.org


================================================================================
3. DESCRIPTION COMPLÈTE DE L'APPLICATION
================================================================================

ARCHITECTURE
------------
- Frontend : React 19 + TypeScript + Vite + Tailwind CSS + Leaflet + MapLibre
- Backend : Node.js + Express + better-sqlite3
- Base de données : SQLite (blue_intelligence.db)
- APIs : TinyFish (agent web), Anthropic Claude (extraction, gatekeeper)

FONCTIONNALITÉS PRINCIPALES
---------------------------

  A. Carte interactive mondiale
     • Affichage des projets de conservation marine en GeoJSON
     • Clusters de marqueurs selon le niveau de zoom
     • Échantillonnage spatial pour éviter la surcharge visuelle
     • Popups avec titre, financeur, description, statut, dates, image
     • Filtrage par financeur (fondations/organisations)

  B. Sidebar gauche
     • Sélecteur : « All X Organizations (Y) » — X = nombre d'organisations
       (MasterSeeds), Y = nombre de projets trouvés
     • Liste des projets filtrés avec coordonnées
     • Bouton « Deploy ETL Swarm » pour lancer l'extraction automatique

  C. Sidebar droite (Paramètres)
     • Icône « ? » : active le mode aide (infobulles sur tous les boutons et éléments)
     • Toggle FR/EN : langue de l'interface (anglais par défaut)
     • Liens de téléchargement : Manuel et README en EN et FR
     • Mode clair / sombre
     • Filtrage GSHHG (terre/mer) :
       - Distance max à la côte pour projet « côtier » (km)
       - Seuils gatekeeper : marine_threshold, inland_threshold
     • Persistance des paramètres en localStorage

  D. Filtrage GSHHG
     • Masque terre/mer basé sur NOAA GSHHG (Global Self-consistent Hierarchical
       High-resolution Geography)
     • Résolution « crude » par défaut
     • Distance à la côte paramétrable pour inclure les projets côtiers

  E. Base de données
     • Table projects : id, title, url, description, funder, lat, lng,
       relevance_score, s_ocean_score, category, status, image_url,
       start_date, end_date
     • Table telemetry : suivi des runs TinyFish
     • Table failed_extractions : échecs d'extraction

  F. Flux temps réel
     • API /api/projects/stream : SSE pour les nouveaux projets
     • API /api/projects/ndjson : export NDJSON

  G. MasterSeeds
     • 78 organisations (fondations, ONG, portails gouvernementaux) dans
       data/MasterSeeds.json
     • Liste extensible : Blue Intelligence découvre de nouveaux portails
       au fil de l'exploration


================================================================================
4. PIPELINE ETL COMPLET
================================================================================

MÉMOIRE STRUCTURELLE
--------------------
• MasterSeeds.json : liste des portails cibles (fondations, ONG, CORDIS, etc.)
• DeepLinkCacheProjectsLists.json : URLs des pages de listes déjà visitées
• DeepLinkCacheProjectsPages.json : URLs des pages projets individuelles

PHASE 1 : DÉCOUVERTE (mode discover)
------------------------------------
• TinyFish Agent reçoit une URL de portail (MasterSeeds ou cache)
• Objectif : naviguer, gérer la pagination, identifier les liens vers les
  fiches individuelles
• SORTIE : tableau JSON d'URLs de projets
• Injection dans DeepLinkCache

PHASE 2 : EXTRACTION (mode extract)
-----------------------------------
• Pour chaque URL de projet :
  a) Récupération du contenu : Readability → Mdream → Firecrawl → Scrape.do
     → Jina Reader (cascade)
  b) Pipeline 3 étapes : Haiku gatekeeper → Sonnet extract+coastal snapping
     → Sonnet S_ocean
  c) Gatekeeper : rejet si marine_relevance < seuil (coastal ou inland)
  d) Extraction : title, description, funder, lat, lng, category, status,
     image_url, start_date, end_date
  e) Coastal snapping : si coordonnées en terres → recalcul vers zone maritime
  f) Score S_ocean : fiabilité technique, source, localisation océanique
  g) Dédoublonnage : similarité titre/description > 85 %, proximité < 500 m
  h) Upsert en base (insert ou update)

PHASE 3 : DÉDOUBLONNAGE
-----------------------
• Critères : haversine < 500 m, textSimilarity titre ≥ 0.85,
  textSimilarity description ≥ 0.85
• Fusion des financeurs en cas de doublon

PHASE 4 : SORTIE
----------------
• GeoJSON FeatureCollection via /api/projects
• Broadcast SSE pour les nouveaux projets
• Export NDJSON via /api/projects/ndjson

API ETL
-------
• GET  /api/etl/seeds        : liste MasterSeeds
• GET  /api/etl/caches       : listes et pages en cache
• POST /api/etl/swarm-deploy : déploie le swarm (discover + extract)
• POST /api/agent/start       : lance un agent sur une URL cible
• POST /api/agent/force-extract : extraction forcée sur URLs données


================================================================================
5. LIENS ET RESSOURCES
================================================================================

COMMUNAUTÉ
----------
• Serveur Discord NAVIGUIDE / Berry-Mappemonde :
  https://discord.gg/UPTWWGtE

• X (Twitter) Berry-Mappemonde :
  https://x.com/BerryMappemonde

SITES OFFICIELS
---------------
• NAVIGUIDE : https://www.naviguide.fr
• Berry-Mappemonde : https://www.berrymappemonde.org

HACKATHONS & PLATEFORMES
-------------------------
• LabLab.ai — Profil Berry-Mappemonde :
  https://lablab.ai/u/@Berry-Mappemonde

• LabLab.ai — Complete AI Agent Hackathon (NAVIGUIDE) :
  https://lablab.ai/ai-hackathons/complete-ai-agent-hackathon/naviguide/naviguide-for-berry-mappemonde

• LabLab.ai — AI Agents AI Week Hackathon :
  https://lablab.ai/ai-hackathons/ai-agents-ai-week-hackathon/naviguide-for-berry-mappemonde

• TAIKAI — CASSINI Hackathons EU Space Consumer Experience (idée) :
  https://taikai.network/cassinihackathons/hackathons/eu-space-consumer-experience/projects/cmhdphi9c068v5yva13s9w92t/idea

• TAIKAI Garden — NAVIGUIDE for Berry-Mappemonde :
  https://garden.taikai.network/fr/projects/cmjxywgp201gxmmhqeyt7qm9o/about

DÉPÔT
------
• GitHub : https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence


================================================================================
6. ÉQUIPE
================================================================================

CLÉMENT FILISETTI (Leader)
--------------------------
• Président, Association Berry-Mappemonde
• Maritime Expedition Leader | Public Health Physician
• Profil EUSPA UCP : https://www.euspa-ucp.eu/speakers/clement-filisetti
• Conception système, relations institutionnelles, vision NAVIGUIDE

HAMZA ALI
---------
• Front-end, base de données, architecture données, UI/UX, machine learning,
  data engineering

DILEEP CHOUDHARY
----------------
• Back-end, front-end, base de données, full-stack, UI/UX, DevOps

RABIA NAZ
---------
• Front-end, architecture données, jeu, UI/UX, machine learning, cloud


================================================================================
7. CREDITS
================================================================================

• TinyFish API (agent web autonome)
• Anthropic Claude (extraction, gatekeeper, scoring)
• NOAA GSHHG (masque terre/mer)
• Leaflet, MapLibre, React
• Mozilla Readability, Mdream, Firecrawl, Turndown
• better-sqlite3, Express, Vite
• Fondations et organisations listées dans MasterSeeds.json


================================================================================
8. MANUEL ET DOCUMENTATION
================================================================================

L'application propose :
  • Manuel utilisateur (EN/FR) : séquence des logs ETL, textes des infobulles
  • README (EN/FR) : description, installation, liens
  • Téléchargement depuis la sidebar droite (Paramètres)

INSTALLATION
------------
1. Cloner le dépôt
2. npm install
3. Copier .env.example vers .env et configurer :
   - TINYFISH_API_KEY (obligatoire pour ETL)
   - CLAUDE_API_KEY ou ANTHROPIC_API_KEY (obligatoire pour extraction)
   - FIRECRAWL_API_KEY, SCRAPE_DO_API_KEY, JINA_READER_API_KEY (optionnels)
4. npm run download-gshhg (télécharge les données GSHHG)
5. npm run dev (lance le serveur sur http://localhost:3000)

UTILISATION
-----------
• Carte : zoom, pan, clic sur marqueur pour popup
• Sidebar gauche : filtrer par financeur, voir la liste des projets
• Bouton « Deploy ETL Swarm » : lance l'extraction sur MasterSeeds + cache
• Sidebar droite : paramètres GSHHG, gatekeeper, thème clair/sombre
• Export : /api/projects (GeoJSON), /api/projects/ndjson

CAPTURES D'ÉCRAN ET VIDÉO
-------------------------
La documentation visuelle (captures d'écran de chaque fonctionnalité, vidéo
de démonstration) peut être produite manuellement ou automatisée.

QUESTION : TinyFish pourrait-il surfer sur Blue Intelligence et NAVIGUIDE,
faire des captures d'écran de chaque fonctionnalité et enregistrer la vidéo
de sa navigation ?

RÉPONSE : En théorie, oui. TinyFish est un agent web capable de naviguer
sur n'importe quel site. En lui donnant Blue Intelligence ou naviguide.fr
comme URL cible et un objectif du type « Parcours chaque section de
l'interface, capture des screenshots et enregistre ta session », il pourrait
potentiellement :
  • Naviguer dans l'application
  • Cliquer sur les différents éléments (sidebar, paramètres, filtres)
  • Suivre le flux ETL

La capacité de capture d'écran et d'enregistrement vidéo dépend des
fonctionnalités exposées par l'API TinyFish. Le hackathon TinyFish 2026
exigeait une démo vidéo de 2-3 minutes de l'agent exécutant les workflows
en direct. Pour une documentation automatisée de l'interface Blue
Intelligence, il faudrait vérifier si TinyFish propose des hooks de
screenshot/screen recording ou si une solution externe (Playwright, Puppeteer)
serait plus adaptée pour ce cas d'usage spécifique.


================================================================================
9. TAGS TECHNIQUES
================================================================================

TinyFish API | Google AI Studio | complete.dev | React | TypeScript | Node.js |
Express | Tailwind CSS | Vite | AI Agents | LLM | Web Scraping | OSINT |
Geospatial | GIS | Automation | Marine Conservation | Blue Economy |
NAVIGUIDE | Berry-Mappemonde


================================================================================
                              FIN DU README
================================================================================
