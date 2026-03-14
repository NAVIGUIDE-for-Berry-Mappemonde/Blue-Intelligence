/**
 * Valeurs par défaut des paramètres Blue Intelligence.
 * Stockage actuel: localStorage. À terme: API admin + base de données.
 */

export const DEFAULT_CONFIG = {
  gatekeeper: {
    /** Score marin minimum pour accepter un projet côtier (0–1) */
    marine_threshold: 0.75,
    /** Score marin minimum pour un projet en terres (plus strict) */
    inland_threshold: 0.9,
    /** Distance max à la côte pour considérer un projet comme « côtier » (km). 0 = GSHHG point-in-polygon uniquement. */
    coast_distance_km: 100,
  },
  dedup: {
    /** Similarité minimale des titres pour considérer un doublon */
    title_similarity: 0.85,
    /** Similarité minimale des descriptions pour considérer un doublon */
    desc_similarity: 0.85,
    /** Rayon en km pour détecter des doublons géographiques */
    coord_km: 0.5,
  },
  scores: {
    /** Valeur par défaut relevance_score si non fournie */
    relevance_fallback: 0.95,
    /** Valeur par défaut s_ocean_score si non fournie */
    s_ocean_fallback: 0.75,
  },
  map: {
    /** Zoom minimum de la carte */
    minZoom: 2,
    /** Marqueurs max selon zoom: < 5 → 200, < 8 → 500, sinon 2000 */
    zoomLimits: [
      { maxZoom: 5, maxMarkers: 200 },
      { maxZoom: 8, maxMarkers: 500 },
      { maxZoom: 22, maxMarkers: 2000 },
    ],
    /** Zoom max après fitWorld */
    fitWorldMaxZoom: 3,
  },
  agent: {
    /** Nombre d'URLs discover en mode test */
    testModeDiscover: 2,
    /** Nombre d'URLs extract en mode test */
    testModeExtract: 3,
    /** Nombre max d'agents TinyFish en parallèle (1–10, défaut 2) */
    maxConcurrentAgents: 2,
  },
  extraction: {
    /** Nombre d'extractions Readability+Claude en parallèle (1–20). Démo: 2 */
    concurrency: 2,
    /** Modèle Claude pour le gatekeeper (filtrage marin rapide) */
    claudeGatekeeperModel: "claude-haiku-4-5-20251001",
    /** Modèle Claude pour l'extraction (titre, description, coords, funder) */
    claudeExtractModel: "claude-sonnet-4-5-20250929",
    /** Modèle Claude pour le scoring S_ocean */
    claudeScoringModel: "claude-sonnet-4-5-20250929",
  },
};

export type Config = typeof DEFAULT_CONFIG;
