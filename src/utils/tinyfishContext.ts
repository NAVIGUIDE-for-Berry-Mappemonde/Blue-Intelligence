/**
 * Détecte si l'app tourne dans le flux TinyFish (iframe ou parent tinyfish.io).
 * Permet de désactiver StrictMode ou animations problématiques pour éviter
 * les conflits DOM (insertBefore) quand le viewer TinyFish injecte des éléments.
 */
export function isTinyFishStream(): boolean {
  if (typeof window === "undefined") return false;
  // iframe : l'app est embedée
  if (window.self !== window.top) return true;
  // parent ou referrer depuis tinyfish
  if (document.referrer?.includes("tinyfish.io")) return true;
  return false;
}
