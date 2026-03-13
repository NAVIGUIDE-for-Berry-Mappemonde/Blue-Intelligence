# GSHHG - Masque terre/mer

Données **GSHHS** (NOAA) pour distinguer strictement la terre de la mer.

## Résolution par défaut : crude (embarquée)

Le fichier `gshhs_c_l1.b` (~300 KB) est **embarqué dans le dépôt** pour que l’application fonctionne sans téléchargement. Les visiteurs n’ont rien à télécharger.

| Résolution   | Fichier         | Taille  | Précision |
|-------------|------------------|---------|-----------|
| **crude**   | gshhs_c_l1.b     | ~300 KB | ~25 km    |
| low         | gshhs_l_l1.b     | ~1 MB   | ~5 km     |
| high        | gshhs_h_l1.b     | ~25 MB  | ~200 m    |

## Changer de résolution

1. Télécharger : `npm run download-gshhg -- --resolution=low`
2. Variable d’environnement : `GSHHG_RESOLUTION=low`

## Licence

GSHHG est distribué sous la GNU Lesser General Public License.
