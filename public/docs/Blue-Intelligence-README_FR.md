# Blue Intelligence — README (Français)

**Maritime OSINT Swarm pour NAVIGUIDE et Berry-Mappemonde**

Blue Intelligence est un moteur de cartographie géospatiale autonome propulsé par l'IA. Il transforme le web vivant et chaotique des données maritimes en une base de données géospatiale exécutable et à jour.

---

## Mission et problème

Malgré l'océan qui couvre 71 % de notre planète et constitue notre plus grand tampon contre le changement climatique, les efforts de conservation marine mondiale sont très fragmentés. Des milliers d'ONG, de chercheurs et de fondations travaillent sur des initiatives critiques—restauration des récifs coralliens, lutte contre la pêche illégale (IUU), création d'aires marines protégées (AMP)—mais leurs données sont cloisonnées dans d'innombrables sites et rapports.

**Le problème :** Il n'existe pas de carte centralisée, en temps réel et complète de l'action marine mondiale. Ce manque de visibilité entraîne des efforts dupliqués, une allocation inefficace des financements et des opportunités de collaboration manquées.

**La solution :** Blue Intelligence existe pour résoudre cette fragmentation des données. En cartographiant de manière autonome le paysage de la « blue economy » et de la conservation marine, il permet aux décideurs d'agir efficacement pour protéger et restaurer nos océans.

---

## Le mécanisme

Blue Intelligence n'est pas une base de données statique, mais un **swarm d'intelligence vivant et auto‑mis à jour**. L'application utilise une architecture multi‑agents IA sophistiquée :

- **Swarm parallèle :** Un pool d'agents TinyFish concurrents parcourt et explore en continu les répertoires de projets des grandes fondations mondiales (Oceana, Packard, The Ocean Foundation, etc.).

- **Découverte récursive « Follow the Money » :** Quand un agent lit une page, il identifie les partenaires et bénéficiaires. S'il trouve une nouvelle ONG, il ajoute automatiquement son site à la file, créant un réseau de découverte récursif.

- **Protocole « Gatekeeper » :** Des filtres sémantiques rejettent les projets purement terrestres (forêts) ou eau douce (lacs/rivières), garantissant que seules les vraies initiatives « Bleues » (zones pélagiques, mangroves, récifs, estuaires) entrent dans le système.

- **Précision géospatiale :** Si les coordonnées extraites tombent à l'intérieur des terres (ex. siège d'une ONG), le système les « snap » vers la zone côtière ou la ZEE la plus proche.

- **Résolution d'entités et dédoublonnage :** Avant la cartographie, le système vérifie les doublons via correspondance d'URL, proximité spatiale (< 500 m) et similarité sémantique.

---

## Écosystème : NAVIGUIDE & Berry-Mappemonde

- **NAVIGUIDE** (naviguide.fr) : Plateforme de navigation intelligente pour l'expédition Berry-Mappemonde
- **Berry-Mappemonde** (berrymappemonde.org) : Expédition maritime de 36 mois reliant le Berry aux 13 territoires français d'outre-mer
- **Blue Intelligence :** Module « Impact » de l'écosystème NAVIGUIDE ; exporte ses découvertes en GeoJSON pour l'intégration au routage

Pour l'expédition maritime Berry-Mappemonde, Blue Intelligence résout un défi logistique : identifier précisément les initiatives locales de conservation le long de la route du navire à partir de milliers de sources fragmentées. L'équipage remplace des semaines de recherche manuelle par une planification automatisée et intelligente.

---

## Architecture du pipeline ETL

### I. Parallélisation multi‑niveaux

- **Niveau I/O :** Pool de workers asynchrones—pendant qu'un agent TinyFish attend le chargement du DOM, un autre extrait les données déjà prêtes.
- **Niveau API :** Requêtes Claude AI en rafales (batching) dans les limites de débit.
- **Niveau calcul :** Vérifications de distance géospatiale et similarité sémantique sur des threads séparés.

### II. Mémoire structurelle

- **MasterSeeds.json :** Pages d'accueil de 65+ fondations suivies.
- **DeepLinkCacheProjectsLists.json :** Sous‑pages stratégiques (catalogues, cartes de projets) identifiées lors de sessions précédentes.
- **DeepLinkCacheProjectsPages.json :** Pages de projets spécifiques à scraper.

### III. Transformation (Claude AI)

- **Gatekeeper (Haiku) :** Filtrage sémantique pour rejeter les projets terrestres/eau douce.
- **Extraction et géocodage (Sonnet) :** Titre, description, coordonnées, financeur ; coastal snapping si inland.
- **Scoring S_ocean (Sonnet) :** Score de pertinence par technicité, fiabilité des sources, localisation océanique.

### IV. Consolidation

- **Dédoublonnage « Follow the Money » :** Fusion des projets partageant URL, ou proximité < 500 m, ou description quasi‑identique.
- **Enrichissement :** Les entrées fusionnées listent tous les financeurs (vérification Claude Opus).
- **Sortie :** Flux GeoJSON pour mises à jour quasi instantanées de la carte.

---

## Fonctionnalités

- **Carte mondiale interactive :** Projets de conservation marine en GeoJSON, clusters, popups avec image
- **Barre latérale gauche :** Filtre par financeur, liste des projets, Déployer TinyFish Swarm, logs du processus, Exporter GeoJSON, Effacer tous les projets
- **Barre latérale droite :** Paramètres (GSHHG, modèles Claude, concurrence), Mode aide (?), bascule FR/EN, liens Manuel/README
- **Tableau de bord Audit :** Télémétrie, taux de succès, extractions échouées avec force‑retry
- **i18n :** Français et anglais (par défaut : anglais)

---

## Public cible

- **Fondations philanthropiques et investisseurs climat :** Découvrir les lacunes de financement, suivre l'impact des fondations, trouver des initiatives de terrain.
- **ONG marines et conservationnistes :** Identifier des partenaires dans les mêmes régions ou niches écologiques.
- **Décideurs et gouvernements :** Visualiser les efforts de conservation dans les ZEE, mesurer les progrès vers 30x30.
- **Chercheurs et scientifiques marins :** Accéder à un jeu de données structuré et centralisé pour la méta‑analyse.

---

## Installation

1. `npm install`
2. Copier `.env.example` vers `.env` et configurer `TINYFISH_API_KEY`, `CLAUDE_API_KEY` (ou `ANTHROPIC_API_KEY`)
3. `npm run download-gshhg`
4. `npm run dev` → http://localhost:3000

---

## Équipe

- **Clément Filisetti** (Leader) — system-design
- **Hamza Ali** — front-end, database-development, data-architecture, ui-ux, machine-learning, data-engineer
- **Dileep Choudhary** — back-end, front-end, database-development, full-stack-development, ui-ux, devops
- **Rabia Naz** — front-end, data-architecture, game, ui-ux, machine-learning, cloud-computing

---

## Liens

- NAVIGUIDE : https://naviguide.fr
- Berry-Mappemonde : https://berrymappemonde.org
- GitHub : https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence
