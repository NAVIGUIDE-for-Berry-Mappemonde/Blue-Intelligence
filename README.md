<div align="center">

# Blue Intelligence

**Maritime OSINT Swarm** — Cartographie autonome des projets de conservation marine

<br />

<table>
  <tr>
    <td align="center" width="33%">
      <a href="https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence" target="_blank" rel="noreferrer">
        <img src="public/logo-blue-intelligence.svg" alt="Blue Intelligence" width="80" height="80" />
      </a>
      <br />
      <strong>Blue Intelligence</strong>
      <br />
      <sub>Maritime OSINT</sub>
    </td>
    <td align="center" width="33%">
      <a href="https://naviguide.fr" target="_blank" rel="noreferrer">
        <img src="public/logo-naviguide.png" alt="NAVIGUIDE" width="80" height="80" />
      </a>
      <br />
      <strong>NAVIGUIDE</strong>
      <br />
      <sub>Navigation intelligente</sub>
    </td>
    <td align="center" width="33%">
      <a href="https://berrymappemonde.org" target="_blank" rel="noreferrer">
        <img src="public/logo-berry-mappemonde.png" alt="Berry-Mappemonde" width="80" height="80" />
      </a>
      <br />
      <strong>Berry-Mappemonde</strong>
      <br />
      <sub>Expédition maritime</sub>
    </td>
  </tr>
</table>

<br />

*Module Impact de l'écosystème NAVIGUIDE — 45 000 milles nautiques, 13 territoires d'outre-mer*

</div>

---

## À propos

**Blue Intelligence** transforme le web vivant des données maritimes en une base géospatiale exécutable. L'application déploie des agents IA (TinyFish + Claude) pour découvrir, extraire et cartographier les projets de conservation marine à travers le monde.

- 🗺️ **Carte interactive** — Projets en GeoJSON, clusters, filtres par financeur
- 🤖 **Swarm ETL** — Découverte autonome via MasterSeeds + DeepLinkCache
- 🌊 **Pipeline 3 étapes** — Haiku gatekeeper → Sonnet extract → S_ocean scoring
- 📍 **Coastal snapping** — Coordonnées recalculées vers les zones maritimes
- 🔄 **100 % local** — SQLite, tourne entièrement sur votre machine

---

## Démarrage rapide

**Prérequis :** Node.js 18+

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les clés API (copier .env.example vers .env)
# - TINYFISH_API_KEY (obligatoire pour l'extraction)
# - CLAUDE_API_KEY ou ANTHROPIC_API_KEY (obligatoire pour l'analyse)

# 3. Optionnel : télécharger les données GSHHG (masque terre/mer)
npm run download-gshhg

# 4. Lancer l'application
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Liens

| | |
|---|---|
| **NAVIGUIDE** | [naviguide.fr](https://naviguide.fr) |
| **Berry-Mappemonde** | [berrymappemonde.org](https://berrymappemonde.org) |
| **GitHub** | [NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence](https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence) |

---

<div align="center">

*Blue Intelligence — Maritime OSINT Swarm pour NAVIGUIDE et Berry-Mappemonde*

</div>
