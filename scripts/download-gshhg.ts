#!/usr/bin/env npx tsx
/**
 * Télécharge GSHHG (NOAA) - niveau L1 (frontière terre/océan).
 *
 * Résolution crude: téléchargement direct 125 KB (version 1.2, rapide).
 * Autres résolutions: zip complet 113 MB (version 2.3.7).
 *
 * Usage: npm run download-gshhg          # crude, ~125 KB, rapide
 *        npm run download-gshhg -- --resolution=low   # zip 113 MB
 */

import fs from "fs";
import path from "path";
import https from "https";
import zlib from "zlib";

const DATA_DIR = path.join(process.cwd(), "data", "gshhg");

// Téléchargement direct pour crude (version 1.2, 125 KB) — rapide
const GSHHG_CRUDE_DIRECT =
  "https://www.ngdc.noaa.gov/mgg/shorelines/data/gshhg/oldversions/version1.2/gshhs_c.b.gz";

// Zip complet pour low/intermediate/high/full (version 2.3.7)
const GSHHG_ZIP = "https://www.ngdc.noaa.gov/mgg/shorelines/data/gshhg/latest/gshhg-bin-2.3.7.zip";
const ZIP_PATH = path.join(DATA_DIR, "gshhg-bin.zip");

const RESOLUTIONS: Record<string, string> = {
  crude: "c",
  low: "l",
  intermediate: "i",
  high: "h",
  full: "f",
};

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Blue-Intelligence/1.0" } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const redirect = res.headers.location;
          if (redirect) {
            file.close();
            fs.unlinkSync(dest);
            return download(redirect.startsWith("http") ? redirect : new URL(redirect, url).href, dest).then(resolve).catch(reject);
          }
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--resolution="));
  const resArg = arg ? arg.split("=")[1]?.toLowerCase() : "crude";
  const letter = RESOLUTIONS[resArg] ?? "c";
  const fileName = `gshhs_${letter}_l1.b`;

  if (resArg === "crude") {
    // Téléchargement direct 125 KB (version 1.2) — rapide
    console.log("[GSHHG] Résolution crude: téléchargement direct (~125 KB)...");
    const gzPath = path.join(DATA_DIR, "gshhs_c.b.gz");
    await download(GSHHG_CRUDE_DIRECT, gzPath);
    const gz = fs.readFileSync(gzPath);
    const raw = zlib.gunzipSync(gz);
    const outPath = path.join(DATA_DIR, "gshhs_c_l1.b");
    fs.writeFileSync(outPath, raw);
    fs.unlinkSync(gzPath);
    console.log(`[GSHHG] Terminé: ${outPath} (${(raw.length / 1024).toFixed(0)} KB)`);
    return;
  }

  // Autres résolutions: zip complet 113 MB
  console.log(`[GSHHG] Résolution ${resArg}: téléchargement zip 113 MB...`);
  await download(GSHHG_ZIP, ZIP_PATH);
  console.log("[GSHHG] Extraction...");

  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip(ZIP_PATH);
  const entries = zip.getEntries();

  let found = false;
  for (const e of entries) {
    const name = e.entryName.replace(/\\/g, "/");
    if (name.endsWith(fileName) && !e.isDirectory) {
      const content = e.getData();
      const outPath = path.join(DATA_DIR, fileName);
      fs.writeFileSync(outPath, content);
      const sizeKB = (content.length / 1024).toFixed(0);
      console.log(`[GSHHG] Extrait: ${outPath} (${sizeKB} KB)`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.error(`[GSHHG] Fichier ${fileName} non trouvé. Entrées:`, entries.map((e) => e.entryName).slice(0, 30));
    process.exit(1);
  }

  fs.unlinkSync(ZIP_PATH);
  console.log(`[GSHHG] Terminé: data/gshhg/${fileName}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
