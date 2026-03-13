#!/usr/bin/env node
/**
 * Génère lib/gshhg-data.ts avec les données GSHHG crude embarquées.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "data", "gshhg", "gshhs_c_l1.b");
const outPath = path.join(root, "lib", "gshhg-data.ts");

if (!fs.existsSync(srcPath)) {
  console.error("[embed-gshhg] Fichier non trouvé:", srcPath);
  console.error("Exécutez d'abord: npm run download-gshhg");
  process.exit(1);
}

const buf = fs.readFileSync(srcPath);
const b64 = buf.toString("base64");

const content = `/**
 * GSHHG crude L1 (terre/ocean) - embarque, pas de telechargement requis.
 * Genere depuis gshhs_c_l1.b. NOAA GSHHG.
 */
export const GSHHG_CRUDE_B64 = "${b64}";
`;

fs.writeFileSync(outPath, content);
console.log(`[embed-gshhg] Ecrit ${outPath} (${(content.length / 1024).toFixed(0)} KB)`);
