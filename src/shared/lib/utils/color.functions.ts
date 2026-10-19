// ------------------ IMPORTS ------------------

// ------------------ PARSING ------------------

/**
 * Convertit une couleur hex (#RGB ou #RRGGBB) en composantes RGB.
 * Retourne `null` si la valeur n'est pas une couleur hex exploitable
 * (couleur projet absente, mal formée, etc.).
 */
export const hexToRgb = (
  hex: string | undefined | null,
): { r: number; g: number; b: number } | null => {
  if (!hex) return null;

  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
};

// ------------------ CONTRASTE & LISIBILITÉ ------------------

/**
 * Luminance relative (WCAG) d'une couleur, entre 0 (noir) et 1 (blanc).
 */
export const relativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Assombrit une couleur hex d'un certain ratio (0 = inchangée, 1 = noir).
 */
export const darkenColor = (hex: string, ratio: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const mix = (channel: number) => clamp(channel * (1 - ratio));

  const toHex = (v: number) => v.toString(16).padStart(2, "0");

  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
};

/**
 * Garantit qu'une couleur de badge/pastille reste visible sur un fond clair :
 * les teintes trop pâles (luminance élevée — jaune pastel, gris très clair…)
 * sont automatiquement assombries pour rester perceptibles, y compris quand
 * deux projets ont des couleurs proches.
 */
export const ensureVisibleAccentColor = (
  hex: string | undefined | null,
  fallback = "#3B82F6",
): string => {
  const rgb = hexToRgb(hex ?? undefined);
  if (!rgb) return fallback;

  const color = hex as string;
  const luminance = relativeLuminance(color);

  if (luminance > 0.75) return darkenColor(color, 0.35);
  if (luminance > 0.6) return darkenColor(color, 0.15);

  return color;
};

/**
 * Convertit une couleur hex en `rgba(...)` avec l'opacité donnée, pour les
 * fonds/bordures teintés (ex. badge projet).
 */
export const hexToRgba = (
  hex: string | undefined | null,
  alpha: number,
  fallback = "#3B82F6",
): string => {
  const rgb = hexToRgb(hex ?? undefined) ?? hexToRgb(fallback);
  if (!rgb) return `rgba(59, 130, 246, ${alpha})`;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
