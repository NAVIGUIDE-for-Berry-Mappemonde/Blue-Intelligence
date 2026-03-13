/**
 * GSHHG Land Mask - Distinction stricte terre/mer
 *
 * Utilise GSHHS (Global Self-consistent, Hierarchical, High-resolution Shorelines)
 * maintenu par NOAA. Niveau L1 (frontière terre/océan).
 *
 * Résolutions: crude (~25km, ~300KB), low (~5km, ~1MB), high (~200m, ~25MB)
 * Par défaut: "crude" pour permettre l'embarquement dans l'app (pas de téléchargement).
 *
 * Format binaire: https://www.ngdc.noaa.gov/mgg/shorelines/data/gshhg/readme.txt
 * Fichier: gshhs_{c,l,i,h,f}_l1.b (c=crude, l=low, i=intermediate, h=high, f=full)
 */

import fs from "fs";
import path from "path";

const MICRO = 1e-6; // micro-degrees to degrees

/** Ray-casting point-in-polygon (Jordan curve theorem) */
function pointInPolygon(lat: number, lng: number, ring: [number, number][]): boolean {
  const n = ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Bounding box quick reject */
function inBbox(lat: number, lng: number, west: number, east: number, south: number, north: number): boolean {
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** Haversine distance in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface GSHHGPolygon {
  west: number;
  east: number;
  south: number;
  north: number;
  ring: [number, number][];
}

let cachedPolygons: GSHHGPolygon[] | null = null;

const GSHHG_RESOLUTION = (process.env.GSHHG_RESOLUTION || "crude").toLowerCase();
const RESOLUTION_MAP: Record<string, string> = {
  crude: "c",
  low: "l",
  intermediate: "i",
  high: "h",
  full: "f",
};
const RESOLUTION_LETTER = RESOLUTION_MAP[GSHHG_RESOLUTION] ?? "c";

/**
 * Charge les polygones L1 (terre) depuis le fichier binaire GSHHG.
 * Supporte format 1.2 (36 bytes header, crude direct) et 2.x (44 bytes header).
 */
function loadGSHHGL1Polygons(filePath: string): GSHHGPolygon[] {
  if (cachedPolygons) return cachedPolygons;

  if (!fs.existsSync(filePath)) {
    console.warn(`[GSHHG] Fichier non trouvé: ${filePath}. Exécutez: npm run download-gshhg`);
    cachedPolygons = [];
    return [];
  }

  const buf = fs.readFileSync(filePath);
  const polygons: GSHHGPolygon[] = [];
  let offset = 0;

  // Format 1.2 (crude direct download): header 36 bytes
  // Format 2.x (zip): header 44 bytes
  const isV12 = path.basename(filePath) === "gshhs_c_l1.b";
  const HEADER_SIZE = isV12 ? 36 : 44;

  while (offset + HEADER_SIZE <= buf.length) {
    const n = buf.readInt32BE(offset + 4);
    const level = isV12 ? buf.readInt32BE(offset + 8) : buf.readInt32BE(offset + 8) & 255;

    if (level !== 1) {
      offset += HEADER_SIZE + n * 8;
      continue;
    }

    const west = buf.readInt32BE(offset + 12) * MICRO;
    const east = buf.readInt32BE(offset + 16) * MICRO;
    const south = buf.readInt32BE(offset + 20) * MICRO;
    const north = buf.readInt32BE(offset + 24) * MICRO;

    offset += HEADER_SIZE;

    const ring: [number, number][] = [];
    for (let i = 0; i < n && offset + 8 <= buf.length; i++) {
      const x = buf.readInt32BE(offset) * MICRO;
      const y = buf.readInt32BE(offset + 4) * MICRO;
      ring.push([x, y]);
      offset += 8;
    }

    if (ring.length >= 3) {
      polygons.push({ west, east, south, north, ring });
    }
  }

  console.log(`[GSHHG] Chargé ${polygons.length} polygones L1 (terre) depuis ${path.basename(filePath)}`);
  cachedPolygons = polygons;
  return polygons;
}

/**
 * Détermine si le point (lat, lng) est sur la TERRE (true) ou en MER (false).
 * Basé sur GSHHS L1 (résolution configurée via GSHHG_RESOLUTION, défaut: crude).
 */
export function isPointOnLand(lat: number, lng: number): boolean {
  const dataDir = path.join(process.cwd(), "data", "gshhg");
  const filePath = path.join(dataDir, `gshhs_${RESOLUTION_LETTER}_l1.b`);

  const polygons = loadGSHHGL1Polygons(filePath);
  if (polygons.length === 0) return false; // Fallback: considérer comme mer si pas de données

  for (const p of polygons) {
    if (!inBbox(lat, lng, p.west, p.east, p.south, p.north)) continue;
    if (pointInPolygon(lat, lng, p.ring)) return true;
  }
  return false;
}

/**
 * Alias sémantique: le point est-il en terres (inland) ?
 * Utilisé pour appliquer le seuil gatekeeper plus strict.
 */
export function isInland(lat: number, lng: number): boolean {
  return isPointOnLand(lat, lng);
}

/**
 * Distance en km du point (lat, lng) à la côte la plus proche (bord des polygones L1).
 * Utilisé pour la distance paramétrable : « projet marin toléré jusqu'à X km de la mer ».
 */
export function distanceToCoastKm(lat: number, lng: number): number {
  const dataDir = path.join(process.cwd(), "data", "gshhg");
  const filePath = path.join(dataDir, `gshhs_${RESOLUTION_LETTER}_l1.b`);
  const polygons = loadGSHHGL1Polygons(filePath);
  if (polygons.length === 0) return 0;

  let minDist = Infinity;
  for (const p of polygons) {
    if (!inBbox(lat, lng, p.west, p.east, p.south, p.north)) {
      const distToBbox = Math.min(
        haversineKm(lat, lng, p.south, p.west),
        haversineKm(lat, lng, p.south, p.east),
        haversineKm(lat, lng, p.north, p.west),
        haversineKm(lat, lng, p.north, p.east)
      );
      if (distToBbox > minDist + 100) continue;
    }
    const ring = p.ring;
    const n = ring.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [lngA, latA] = ring[j];
      const [lngB, latB] = ring[i];
      for (let t = 0; t <= 4; t++) {
        const f = t / 4;
        const latS = latA + f * (latB - latA);
        const lngS = lngA + f * (lngB - lngA);
        const d = haversineKm(lat, lng, latS, lngS);
        if (d < minDist) minDist = d;
      }
    }
  }
  return minDist === Infinity ? 0 : minDist;
}
