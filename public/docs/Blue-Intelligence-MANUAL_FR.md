# Blue Intelligence — Manuel utilisateur (Français)

**Maritime OSINT Swarm pour NAVIGUIDE et Berry-Mappemonde**

---

## 1. Vue d'ensemble

Blue Intelligence est un agent autonome d'intelligence géospatiale maritime. Il déploie des agents TinyFish pour découvrir et extraire des projets de conservation marine depuis les sites de fondations, puis les affiche sur une carte mondiale interactive. Utilisez le **mode aide** (?) dans la barre latérale droite pour afficher des infobulles détaillées sur chaque élément de l'interface.

---

## 2. Séquence des logs (Pipeline ETL)

L'application affiche des logs en temps réel reflétant le pipeline ETL et le processus swarm :

### Phase de déploiement
```
[ETL] Swarm deploy starting...
[ETL] Database cleared                    (si « Vider la base avant de démarrer » est coché)
[ETL] MasterSeeds: X foundations
[ETL] DeepLinkCache: Y lists, Z pages
[ETL] Queue: X discover + Y extract = N tasks
[ETL] N tasks enqueued → Swarm
```

### Dispatch des agents
```
[Swarm] TinyFish 1 dispatched → [URL]
[TinyFish 1] Discovery browsing → [URL]   (ou Extract browsing en mode extract)
```

### Phase de découverte
```
[TinyFish 1] Discovery complete
[ETL] DeepLinkCache updated (+M pages)
[ETL] Extraction pipeline: M URLs (concurrency=X)
```

### Pipeline d'extraction
```
[ETL] Fetch 1/M: [hostname]
[ETL] Claude extract → [titre]
[ETL] Saved → [titre]
[ETL] Extraction complete: K projects saved
```

### Mode extract-only
```
[ETL] Extract-only → [URL]
[ETL] Fetch → [hostname]
[ETL] Gatekeeper rejected → [host]        (si rejeté)
[ETL] Claude extract → [titre]
[ETL] Saved → [titre]
[ETL] Extract complete: 1 project saved
```

### Arrêt / Clear
```
[Swarm] Stop requested
[ETL] Database cleared
```

---

## 3. Infobulles (Mode aide)

Cliquez sur l'icône **?** dans la barre latérale droite pour activer le mode aide. Quand il est activé, chaque bouton, champ et section affiche une infobulle détaillée au survol.

| Élément | Infobulle |
|---------|-----------|
| **Blue Intelligence** | Moteur de cartographie géospatiale autonome propulsé par l'IA. Transforme les données web non structurées en carte GeoJSON vivante de la conservation marine mondiale. |
| **Maritime OSINT Swarm** | Module Impact de l'écosystème NAVIGUIDE pour l'expédition maritime Berry-Mappemonde. |
| **Mode cible** | Test (2) : déploie seulement 2 fondations pour validation rapide. Complet : déploie tous les MasterSeeds (65+) plus les pages DeepLinkCache. |
| **Proxy** | Proxy optionnel pour les agents TinyFish. Utile quand les sites cibles restreignent l'accès par région. |
| **AI Swarm** | Lance le swarm ETL. Les agents TinyFish découvrent les URLs de projets depuis MasterSeeds et DeepLinkCache, puis extraient via Readability + Claude. Découverte récursive « Follow the Money ». |
| **Vider la base avant de démarrer** | Si coché, supprime tous les projets avant le déploiement. Pour repartir de zéro. |
| **Arrêter le Swarm** | Arrête tous les agents TinyFish actifs, vide la file et interrompt les extractions en cours. |
| **Logs du processus** | Logs en temps réel du pipeline ETL : déploiement, découverte, extraction, flux de données. |
| **Actifs / En file** | Actifs : nombre d'agents TinyFish en cours (max 2). En file : tâches en attente (discover ou extract). |
| **Console Swarm en direct** | Affiche les agents TinyFish actifs avec URL cible, statut, mode et logs en direct. |
| **Voir l'agent** | Ouvre l'URL du flux TinyFish dans un nouvel onglet pour suivre la navigation de l'agent en temps réel. |
| **Filtre par organisation** | Filtrer les projets par organisation financeuse. Chaque option affiche le nombre de projets. |
| **Projets filtrés** | Nombre de projets correspondant au filtre financeur. Affichés sur la carte comme marqueurs. |
| **Exporter GeoJSON** | Télécharge les projets filtrés en FeatureCollection GeoJSON. Utilisable dans QGIS, MapLibre ou tout outil SIG. |
| **Effacer tous les projets** | Supprime tous les projets de la base. Désactivé pendant l'exécution du swarm. |
| **Paramètres** | Filtrage marin GSHHG, modèles Claude (Gatekeeper, Extraction, Scoring), nombre d'agents, téléchargements. Stockés en localStorage ; envoyés au serveur lors du déploiement du swarm. |
| **Aide (?)** | Active le mode aide. Quand ON, chaque élément affiche une infobulle détaillée au survol. |
| **Distance à la côte (km)** | 0 = strict (point sur terre = inland). 100 = tolérer jusqu'à 100 km de la mer. |
| **Seuils marin / inland** | Gatekeeper : marine_relevance minimum (0–1) pour projets côtiers vs inland. |
| **Nombre d'agents TinyFish** | 1–10. Max agents TinyFish en parallèle pour la découverte. |
| **Nombre d'agents Readability** | 1–20. Extractions Readability+Claude en parallèle. Plus = plus rapide, plus de charge API. |
| **Modèle Gatekeeper** | Modèle Claude pour le filtrage sémantique. Rejette projets terrestres/eau douce. Haiku recommandé (rapide). |
| **Modèle Extraction** | Modèle Claude pour l'extraction : titre, description, coords, financeur. Sonnet recommandé pour la qualité. |
| **Modèle Scoring** | Modèle Claude pour le scoring S_ocean : technicité, fiabilité des sources, localisation océanique. Sonnet recommandé. |
| **Carte** | Limites de zoom et échantillonnage des marqueurs. Moins de marqueurs quand dézoomé. |
| **Audit Swarm Intelligence** | Tableau de bord : extractions totales, taux de succès, projets cartographiés. Table télémétrie. Extractions échouées avec force-retry. |
| **Forcer l'extraction** | Re-met l'URL en file pour extraction avec TinyFish. |

---

## 4. Démarrage rapide

1. Configurer `TINYFISH_API_KEY` et `CLAUDE_API_KEY` dans `.env`
2. Exécuter `npm run download-gshhg` puis `npm run dev`
3. Ouvrir http://localhost:3000
4. (Optionnel) Activer le mode aide (?) pour explorer les infobulles
5. Cliquer sur **AI Swarm** pour lancer l'extraction
6. Utiliser **Exporter GeoJSON** pour télécharger les résultats

---

## 5. Résumé du pipeline ETL

- **Entrées :** MasterSeeds.json, DeepLinkCacheProjectsLists.json, DeepLinkCacheProjectsPages.json
- **Découverte :** Les agents TinyFish explorent les arborescences des sites, injectent des URLs dans les caches
- **Scraping :** Readability.js nettoie le HTML avant Claude
- **Transformation :** Claude Gatekeeper (Haiku) → Claude Extraction (Sonnet) → Claude Scoring (Sonnet) S_ocean
- **Coastal snapping :** Coordonnées inland « snap » vers la zone maritime la plus proche
- **Dédoublonnage :** Correspondance URL, proximité < 500 m, similarité sémantique
- **Sortie :** Flux GeoJSON vers la carte

---

## 6. Référence des paramètres

### GSHHG (Filtrage marin)

- **Distance à la côte (km) :** Distance max à la mer pour considérer un projet « côtier ». 0 = strict (point sur terre = inland). 100 = tolérer jusqu'à 100 km de la mer. Utilisé avec NOAA GSHHG pour classifier côtier vs inland.
- **Score marin min (côtier) :** Seuil gatekeeper 0–1. Projets en dessous = rejetés. Plus bas = plus permissif.
- **Score marin min (inland) :** Seuil plus strict pour projets loin de la côte. Ex. 0,9 pour rejeter initiatives terrestres/eau douce.

### Modèles Claude (pipeline 3 étapes)

- **Modèle Gatekeeper :** Filtre sémantique. Rejette projets purement terrestres (forêts) ou eau douce (lacs). Garantit que seules les vraies initiatives « Bleues » entrent. Haiku recommandé (rapide).
- **Modèle Extraction :** Extrait titre, description, coordonnées, financeur du HTML nettoyé. Coastal snapping si coordonnées inland. Sonnet recommandé pour la qualité.
- **Modèle Scoring :** Calcule le score S_ocean (0–1) : technicité, fiabilité des sources, localisation océanique. Sonnet recommandé.

### Agents et concurrence

- **Nombre d'agents TinyFish :** 1–10. Max agents TinyFish en parallèle pour la découverte (navigation des sites fondations).
- **Nombre d'agents Readability :** 1–20. Extractions Readability+Claude en parallèle. Plus = plus rapide mais plus de charge API.

### Carte

- **Zoom min :** Niveau de zoom minimum de la carte.
- **Marqueurs max :** Échantillonnage spatial par zoom. Zoom < 5 : 200 marqueurs ; < 8 : 500 ; sinon : 2000. Moins quand dézoomé pour les perfs.

---

## Liens

- **Discord Blue Intelligence :** https://discord.gg/zQcPgxpH
- **Discord NAVIGUIDE :** https://discord.gg/UPTWWGtE
- **Discord Berry-Mappemonde :** https://discord.gg/NsWrxXUQ
- NAVIGUIDE : https://naviguide.fr
- Berry-Mappemonde : https://berrymappemonde.org
- GitHub : https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence

---

*Blue Intelligence — Maritime OSINT Swarm pour NAVIGUIDE et Berry-Mappemonde*
