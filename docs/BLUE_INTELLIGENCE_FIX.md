# Fix : Erreur React insertBefore dans le flux TinyFish

L'erreur `NotFoundError: Failed to execute 'insertBefore' on 'Node'` apparaît quand Blue Intelligence tourne dans le flux TinyFish. Le viewer TinyFish injecte des éléments (curseur poisson, overlay) dans le DOM, ce qui désynchronise React.

**Références** : [React #13278](https://github.com/facebook/react/issues/13278), [React #24865](https://github.com/facebook/react/issues/24865), [Stack Overflow](https://stackoverflow.com/questions/52546409/react-notfounderror-failed-to-execute-insertbefore-on-node-the-node-before)

---

## 0. Solution principale : Shadow DOM ✅

Quand l'app détecte le contexte TinyFish (`isTinyFishStream()`), React est rendu **à l'intérieur d'un Shadow DOM** attaché à `#root`. Le Shadow DOM crée une frontière d'encapsulation : les scripts externes (curseur TinyFish, overlay) ne peuvent pas injecter de nœuds dans l'arbre React. L'erreur insertBefore est ainsi évitée à la source.

**Implémentation** (`src/main.tsx`) :
- Détection via `isTinyFishStream()` (iframe ou referrer tinyfish.io)
- `host.attachShadow({ mode: 'open' })` sur `#root`
- Injection du CSS compilé via `import('./index.css?inline')` dans une balise `<style>`
- `createRoot(container)` sur un div à l'intérieur du shadow root
- En mode normal, rendu classique sans Shadow DOM

---

## 1. Bloquer Google Translate et les mutations DOM (index.html) ✅

**Google Translate** ouvre une popup et modifie le DOM (injecte des spans), ce qui provoque l'erreur insertBefore. Implémenté dans `index.html` :

```html
<!DOCTYPE html>
<html lang="en" translate="no" class="notranslate">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google" content="notranslate" />
  <meta name="googlebot" content="notranslate" />
  <!-- ... -->
</head>
<body translate="no" class="notranslate">
  <div id="root" style="isolation: isolate;"></div>
</body>
</html>
```

- `translate="no"` et `class="notranslate"` sur `<html>` et `<body>` : empêchent la traduction
- `<meta name="google" content="notranslate">` : bloque explicitement Google Translate
- Script dans `<head>` pour renforcer les attributs au chargement

---

## 2. Error Boundary ✅

Composant `ErrorBoundary` qui attrape l'erreur et propose « Recharger la page » (pour insertBefore, le DOM est corrompu — un simple réessai ne suffit pas).

- Détection des erreurs contenant `insertBefore`
- Message explicatif sur TinyFish
- Bouton « Recharger la page »
- Isolation de la Live Swarm Console dans un ErrorBoundary dédié (fallback si crash)

---

## 3. Isoler le root React ✅

Dans `index.html` :

```html
<div id="root" style="isolation: isolate;"></div>
```

`isolation: isolate` crée un nouveau contexte d'empilement et peut limiter l'impact des modifications DOM externes.

---

## 4. Détecter le contexte TinyFish ✅

Fichier `src/utils/tinyfishContext.ts` avec `isTinyFishStream()` :

```ts
const isTinyFishStream = 
  window.self !== window.top || 
  document.referrer?.includes('tinyfish.io');
```

Utilisé dans `main.tsx` pour **désactiver StrictMode** quand l'app tourne dans le flux TinyFish (réduit les conflits DOM).

---

## 5. TinyFish : pas d'option traduction dans l'API

Après recherche dans la [documentation TinyFish](https://docs.tinyfish.ai/), l'API ne propose **aucune option** pour désactiver la traduction ou configurer la langue du navigateur cloud.

**Paramètres disponibles** ([run-sse](https://tinyfish.mintlify.app/api-reference/automation/run-browser-automation-with-sse-streaming)) :
- `browser_profile` : `lite` (défaut) ou `stealth`
- `proxy_config` : `enabled`, `country_code` (US, GB, FR, etc.)
- `feature_flags`, `use_vault`, etc.

**Recommandation** : contacter le support TinyFish (Discord, email) pour demander une option `disable_translate` ou `browser_locale: "en-US"` dans les prochaines versions.

---

## 6. Erreurs 400 — deux sources

### A. Tuiles CartoDB (basemaps.cartocdn.com) ✅

Les URLs `a.basemaps.cartocdn.com`, `b.basemaps.cartocdn.com`, etc. renvoyaient 400 (coordonnées invalides comme `x=-1`, ou changement d'API).

**Solution appliquée** : remplacement par **OpenStreetMap** (`tile.openstreetmap.org`). Filtre CSS pour le mode sombre (invert + hue-rotate).

### B. Images 0.png, 1.png, 2.png, 3.png ✅

Ces fichiers proviendraient de Leaflet.markercluster. **Note** : Blue Intelligence n'utilise pas MarkerCluster (GeoJSON + CircleMarker). Le package `leaflet.markercluster` ne fournit pas ces images (il utilise des DivIcon).

**Solution appliquée** : fichiers PNG transparents 1x1 dans `public/` (0.png, 1.png, 2.png, 3.png) pour servir les requêtes relatives qui ciblaient le serveur.

---

## 7. Autres correctifs

- **CORS + frame-ancestors** : autoriser l'affichage dans le flux TinyFish (`tetra-streaming.tinyfish.io`)
- **safeStorage** : wrapper localStorage pour éviter les plantages en contexte restreint (iframe, mode privé)
- **Favicon** : `logo-blue-intelligence.svg` comme favicon ; route `/favicon.ico` qui sert le SVG

---

## Ordre de déploiement

1. `git pull` sur le VPS
2. `npm run build`
3. `pm2 restart blue-intelligence` (ou `pm2 delete blue-intelligence` puis `pm2 start npm --name "blue-intelligence" -- start` si besoin)

**Si Google Translate s'ouvre encore** : vérifier que la meta et les attributs sont bien présents. Le navigateur TinyFish peut avoir la traduction activée côté viewer — désactiver dans les paramètres Chrome du flux.
