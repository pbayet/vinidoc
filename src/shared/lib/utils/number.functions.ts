// utils/number.functions.ts

/**
 * Indique si un nombre est décimal (non entier).
 */
export const isDecimal = (n: number): boolean => {
  return n % 1 !== 0;
};

/**
 * Arrondit un nombre à un certain nombre de décimales.
 *
 * @param value   Nombre à arrondir
 * @param decimals Nombre de décimales (par défaut 2)
 *
 * Exemple :
 *   roundTo(3.14159, 2) → 3.14
 */
export const roundTo = (value: number, decimals: number = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Contraint un nombre dans un intervalle [min, max].
 *
 * Exemple :
 *   clamp(10, 0, 5) → 5
 *   clamp(-3, 0, 5) → 0
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * Convertit une string en nombre avec gestion du format FR (virgule).
 * - Renvoie undefined si la conversion échoue.
 *
 * Exemple :
 *   toNumber("12,5") → 12.5
 *   toNumber("abc") → undefined
 */
export const toNumber = (
  input: string | number | null | undefined
): number | undefined => {
  if (input === null || input === undefined) return undefined;
  if (typeof input === "number") return input;

  const value = parseFloat(input.replace(",", "."));
  return isNaN(value) ? undefined : value;
};

/**
 * Vérifie si une valeur est un nombre valide.
 * - Exclut NaN, Infinity, -Infinity, null, et les non-nombres.
 *
 * Exemple :
 *   isValidNumber(12) → true
 *   isValidNumber("abc") → false
 */
export const isValidNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

/**
 * Compare deux nombres avec une tolérance (utile en floating-point).
 *
 * @param a        Premier nombre
 * @param b        Second nombre
 * @param epsilon  Tolérance (par défaut 1e-6)
 *
 * Exemple :
 *   nearlyEqual(0.1 + 0.2, 0.3) → true
 */
export const nearlyEqual = (
  a: number,
  b: number,
  epsilon: number = 1e-6
): boolean => {
  return Math.abs(a - b) <= epsilon;
};

/**
 * Calcule un pourcentage : (part / total) * 100
 * - Renvoie 0 si total = 0.
 *
 * Exemple :
 *   percent(25, 200) → 12.5
 */
export const percent = (part: number, total: number): number => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

/**
 * Formatte un nombre en chaîne lisible :
 * - N décimales
 * - Gestion optionnelle de la virgule / point
 *
 * Exemple :
 *   formatNumber(1234.567, 2) → "1 234.57"
 */
export const formatNumber = (
  value: number,
  decimals: number = 2,
  locale: string = "fr-FR"
): string => {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
