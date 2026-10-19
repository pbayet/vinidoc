/**
 * Copie une chaîne dans le presse-papier (API moderne Clipboard).
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

/**
 * Met en majuscule la première lettre d’une chaîne.
 * - Gère les chaînes vides.
 * - Convertit le reste en minuscules.
 */
export const capitalizeFirstLetter = (name: string): string => {
  if (!name) return "";
  return name.charAt(0).toLocaleUpperCase() + name.slice(1).toLocaleLowerCase();
};

/**
 * Supprime tous les accents d’une chaîne via normalisation Unicode.
 */
const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Normalise une chaîne selon deux options :
 *  - respectCase : si false → conversion en minuscules
 *  - respectAccents : si false → suppression des accents
 *
 * Utilisée pour comparer deux strings de manière plus flexible.
 */
export const normalizeStr = (
  str: string,
  respectAccents?: boolean,
  respectCase?: boolean
): string => {
  let result = str;

  if (!respectCase) {
    result = result.toLocaleLowerCase();
  }

  if (!respectAccents) {
    result = removeAccents(result);
  }

  return result;
};

// ---------------------------------------------------------------------------
// Similarité Levenshtein
// ---------------------------------------------------------------------------

/**
 * Calcule la similarité entre deux mots sur la base de la distance de Levenshtein.
 * Renvoie un ratio compris entre 0 et 1.
 *  - 1 : identiques
 *  - 0 : totalement différents
 *
 * Implémentation dynamique classique O(n*m).
 */
const levenshteinSimilarity = (s: string, t: string): number => {
  const dp = Array.from({ length: s.length + 1 }, () =>
    Array(t.length + 1).fill(0)
  );

  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // suppression
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1) // substitution
      );
    }
  }

  const distance = dp[s.length][t.length];
  const maxLen = Math.max(s.length, t.length);

  return 1 - distance / maxLen;
};

// ---------------------------------------------------------------------------
// Recherche avancée (similarité + correspondances partielles)
// ---------------------------------------------------------------------------

/**
 * Recherche textuelle "intelligente".
 *
 * Règles de correspondance :
 *  - recherche vide → false
 *  - égalité stricte (normalisée) → true
 *  - inclusion (l’un contient l’autre) → true
 *  - similarité Levenshtein au-dessus d’un seuil → true
 *
 * @param search        Texte saisi par l’utilisateur
 * @param comparedValue Valeur sur laquelle effectuer la recherche
 * @param threshold     Seuil de similarité (0.3 par défaut)
 */
export const advancedSearch = (
  search: string | undefined,
  comparedValue: string | undefined,
  threshold: number = 0.3,
  options?: {
    respectAccents?: boolean;
    respectCase?: boolean;
    unilateralIncludes?: boolean;
  }
): boolean => {
  if (!search?.trim() || !comparedValue?.trim()) return false;

  const a = normalizeStr(search);
  const b = normalizeStr(comparedValue);

  // Cas simples : identiques ou inclusion directe
  if (options?.unilateralIncludes) {
    if (a === b || a.includes(b)) {
      return true;
    }
  } else {
    if (a === b || b.includes(a) || a.includes(b)) {
      return true;
    }
  }

  // Comparaison mot à mot (utile pour les noms composés)
  const searchWords = a.split(" ");
  const compareWords = b.split(" ");

  for (const sWord of searchWords) {
    for (const cWord of compareWords) {
      const similarityRatio = levenshteinSimilarity(sWord, cWord);

      if (similarityRatio >= threshold) {
        return true;
      }
    }
  }

  return false;
};
