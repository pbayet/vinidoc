import type {
  Color,
  Language,
  SheetEvent,
  SheetStatus,
  TranslationField,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Libellés et mises en forme VINIDOC
// -----------------------------------------

export const STATUS_LABELS: Record<SheetStatus, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "À valider",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

export const STATUS_ICONS: Record<SheetStatus, string> = {
  DRAFT: "pen",
  SUBMITTED: "hourglass-half",
  VALIDATED: "circle-check",
  REJECTED: "circle-xmark",
};

export const EVENT_LABELS: Record<SheetEvent["EVTTYP"], string> = {
  CREATED: "Création",
  UPDATED: "Modification des caractéristiques",
  TRANSLATION_SAVED: "Textes enregistrés",
  TRANSLATION_DELETED: "Traduction supprimée",
  SUBMITTED: "Soumise à validation",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
  DELETED: "Supprimée",
};

/** Libellés des textes traduisibles, dans l'ordre d'affichage. */
export const TRANSLATION_LABELS: Record<
  TranslationField,
  { label: string; rows: number; max: number; hint?: string }
> = {
  LIBELLE: {
    label: "Intitulé commercial",
    rows: 1,
    max: 200,
    hint: "Optionnel — nom affiché sur la fiche.",
  },
  CEPAGES: {
    label: "Cépages",
    rows: 2,
    max: 1000,
    hint: "Ex. « Grenache 60 %, Syrah 40 % ».",
  },
  TERROIR: { label: "Terroir et sol", rows: 5, max: 4000 },
  VINIF: { label: "Vendanges et vinification", rows: 5, max: 4000 },
  DEGUST: { label: "Dégustation (œil, nez, bouche)", rows: 5, max: 4000 },
  GARDE: {
    label: "Potentiel de garde",
    rows: 1,
    max: 100,
    hint: "Ex. « 2 ans ».",
  },
  ACCORDS: { label: "Accords mets et vins", rows: 2, max: 1000 },
  ACCEXPL: { label: "Explication des accords", rows: 4, max: 4000 },
};

/**
 * Échelles de la fiche. `steps` : valeurs proposées, dans l'ordre d'affichage.
 * ⚠ L'API n'accepte que 1 à 5 (validators.js) et les badges du modèle
 *   PowerPoint sont générés pour 1..5 : à faire évoluer ensemble.
 */
export const SCALES = [
  {
    key: "INTARO",
    label: "Intensité aromatique",
    min: "Peu intense",
    max: "Très intense",
    steps: [1, 2, 3, 4, 5],
  },
  {
    key: "INTBOU",
    label: "Intensité bouche",
    min: "",
    max: "",
    steps: [1, 2, 3, 4, 5],
  },
  {
    key: "ECHFRU",
    label: "Échelle fruit",
    min: "Floral",
    max: "Très fruité",
    steps: [1, 2, 3, 4, 5],
  },
] as const;

export type ScaleKey = (typeof SCALES)[number]["key"];

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Dates SQL (UTC) → "08/10/2026 14:05". */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : DATE_TIME.format(d);
}

/** "VHL09393 — 2025" (ou "non millésimé"). */
export function sheetTitle(s: {
  CODVRAC: string;
  MILLESIME: number | null;
}): string {
  return `${s.CODVRAC} — ${s.MILLESIME ?? "non millésimé"}`;
}

export function colorLabel(colors: Color[], code: string, lng = "fr"): string {
  const c = colors.find((x) => x.COLCOD === code);
  return c?.LABELS[lng]?.LABEL ?? c?.LABELS.fr?.LABEL ?? code;
}

/** Libellés min/max de l'échelle bouche selon la couleur (léger↔puissant, sec↔doux...). */
export function mouthScaleLabels(
  colors: Color[],
  code: string,
  lng = "fr",
): { min: string; max: string } {
  const c = colors.find((x) => x.COLCOD === code)?.LABELS[lng];
  return { min: c?.BOUMIN ?? "1", max: c?.BOUMAX ?? "5" };
}

export function languageName(languages: Language[], code: string): string {
  return languages.find((l) => l.LNGCOD === code)?.LNGNAM ?? code.toUpperCase();
}

/** Longueur telle que comptée par l'API (points de code, \r\n = 1). */
export function textLength(value?: string | null): number {
  return [
    ...String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .trim(),
  ].length;
}

export function formatTemperature(
  min: number | null,
  max: number | null,
): string {
  if (min == null && max == null) return "—";
  if (min == null || max == null || min === max) return `${min ?? max}°C`;
  return `${min}-${max}°C`;
}

export function formatBytes(size?: number | null): string {
  if (!size) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} Ko`;
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

/** Valeur numérique d'un champ texte ("" → null). */
export function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
