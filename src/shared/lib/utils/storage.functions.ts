/**
 * Calcule la taille totale du localStorage.
 *
 * @param pretty - Si true (par défaut), retourne une string "XX.XX Ko/Mo".
 *                 Si false, retourne la taille brute en octets (number).
 */
export function getLocalStorageSize(pretty: boolean = true) {
  let total = 0;

  // On parcourt toutes les clés du localStorage
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key);
    if (value) {
      // Approximation : chaque caractère (clé + valeur) est stocké en UTF-16, soit 2 octets
      total += key.length + value.length;
    }
  }

  const bytes = total * 2; // chaque caractère UTF-16 = 2 octets

  // Mode brut : on renvoie directement le nombre d'octets
  if (!pretty) return bytes;

  // Mode "humain" : on formate en Ko ou Mo
  const kb = bytes / 1024;
  const mb = kb / 1024;

  return mb >= 1 ? `${mb.toFixed(2)} Mo` : `${kb.toFixed(2)} Ko`;
}

/**
 * Retourne le détail de la taille utilisée par chaque clé du localStorage.
 *
 * @returns Tableau d'objets { key, sizeKB } trié par taille décroissante.
 *          sizeKB est une string formatée avec 2 décimales.
 */
export function getLocalStorageBreakdown() {
  const entries: { key: string; sizeKB: string }[] = [];

  // On parcourt toutes les clés du localStorage
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key);
    if (value) {
      // Estimation de la taille en octets, puis conversion en Ko
      const bytes = (key.length + value.length) * 2;
      entries.push({ key, sizeKB: (bytes / 1024).toFixed(2) });
    }
  }

  // Tri décroissant par taille (les plus grosses entrées en premier)
  entries.sort((a, b) => Number(b.sizeKB) - Number(a.sizeKB));
  return entries;
}

/**
 * Estime la capacité maximale du localStorage pour ce navigateur.
 *
 * Principe :
 *  - on écrit une valeur de plus en plus grande (doublée à chaque itération)
 *  - on s'arrête au premier échec (exception quota dépassé)
 *
 * @returns String du type "Limite atteinte à : XX.XX Mo"
 */
export function getLocalStorageQuota() {
  let testData = "a";

  try {
    // On double la taille de la string à chaque tour jusqu'à déclencher une erreur de quota
    while (true) {
      localStorage.setItem("quota_test", testData);
      testData += testData;
    }
  } catch {
    // Quand le quota est atteint, on calcule la taille approximative testée
    return [
      "Limite atteinte à :",
      ((testData.length * 2) / 1024 / 1024).toFixed(2),
      "Mo",
    ].join(" ");
  } finally {
    // On nettoie la clé de test quoi qu'il arrive
    localStorage.removeItem("quota_test");
  }
}

// --- Gestion des cookies ---

/**
 * Récupère la valeur d'un cookie par son nom.
 *
 * @param name - Nom du cookie.
 * @returns La valeur du cookie, ou undefined s'il n'existe pas.
 */
export function getCookie(name: string): string | undefined {
  // On préfixe par "; " pour éviter les problèmes de matching partiel
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  // Si on trouve exactement 2 segments, le cookie existe
  if (parts.length === 2) {
    // On prend la dernière partie, puis on coupe au prochain ";"
    return parts.pop()?.split(";").shift();
  }

  return undefined;
}

/**
 * Définit (ou écrase) un cookie.
 *
 * @param name  - Nom du cookie.
 * @param value - Valeur du cookie (sera encodée en URI).
 * @param days  - Durée de vie en jours (par défaut 7).
 */
export function setCookie(name: string, value: string, days: number = 7) {
  // Date d'expiration calculée à partir de maintenant
  const expires = new Date(Date.now() + days * 864e5).toUTCString();

  // On encode la valeur pour éviter les problèmes de caractères spéciaux
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
}

/**
 * Supprime un cookie en le réécrivant avec une date d'expiration passée.
 *
 * @param name - Nom du cookie à supprimer.
 */
export function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
