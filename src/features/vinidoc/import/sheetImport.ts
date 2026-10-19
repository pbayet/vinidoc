import { parseCsvTable } from "../../../shared/lib/utils/csv.functions";
import type { VinidocApi } from "../api/useVinidocApi";
import {
  TRANSLATION_FIELDS,
  type Color,
  type Language,
  type Sheet,
  type SheetCommon,
  type SheetListItem,
  type SheetState,
  type TranslationField,
  type TranslationValues,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Import de fiches œnologiques depuis un CSV
// -----------------------------------------
// Format attendu (cf. FICHES_TECHNIQUES_import.csv) : une ligne par fiche et
// par langue, en-têtes = noms de champs de l'API :
//   CODVRAC;MILLESIME;APPELL;COLCOD;DESCVRAC;INTARO;INTBOU;ECHFRU;TEMPMIN;
//   TEMPMAX;LNGCOD;LIBELLE;CEPAGES;TERROIR;VINIF;DEGUST;GARDE;ACCORDS;ACCEXPL
// Les lignes d'une même fiche (CODVRAC + MILLESIME) sont regroupées : champs
// communs pris sur la ligne de la langue par défaut (sinon la première), une
// traduction par ligne. L'import passe par les routes existantes de l'API
// (création, mise à jour, traductions) : mêmes contrôles, mêmes évènements.

const COMMON_FIELDS = [
  "CODVRAC",
  "MILLESIME",
  "APPELL",
  "COLCOD",
  "DESCVRAC",
  "INTARO",
  "INTBOU",
  "ECHFRU",
  "TEMPMIN",
  "TEMPMAX",
] as const satisfies readonly (keyof SheetCommon)[];

export const REQUIRED_COLUMNS = ["CODVRAC", "APPELL", "COLCOD"] as const;
export const KNOWN_COLUMNS: readonly string[] = [
  ...COMMON_FIELDS,
  "LNGCOD",
  ...TRANSLATION_FIELDS,
];

/** Longueurs max (cf. validators.js du module backend). */
const TRANSLATION_MAXLEN: Record<TranslationField, number> = {
  LIBELLE: 200,
  GARDE: 100,
  CEPAGES: 1000,
  TERROIR: 4000,
  VINIF: 4000,
  DEGUST: 4000,
  ACCORDS: 1000,
  ACCEXPL: 4000,
};

export interface ImportRow {
  /** Numéro de ligne dans le fichier (en-tête = 1) */
  LINE: number;
  LNGCOD: string;
  /** Valeurs communes ; null = cellule vide */
  COMMON: SheetCommon;
  TRANSLATION: TranslationValues;
  ERRORS: string[];
}

export interface ImportGroup {
  KEY: string;
  CODVRAC: string;
  MILLESIME: number | null;
  /** Ligne portant les champs communs */
  COMMON: SheetCommon;
  ROWS: ImportRow[];
  ERRORS: string[];
  /** Fiche existante (même code vrac et millésime), résolue par `findExisting` */
  EXISTING?: SheetListItem | null;
}

export interface ParsedImport {
  DELIMITER: string;
  COLUMNS: string[];
  /** Colonnes du fichier ignorées (inconnues) */
  IGNORED: string[];
  /** Erreur bloquante sur le fichier (colonnes obligatoires absentes, vide…) */
  FATAL: string | null;
  GROUPS: ImportGroup[];
}

/* ───────────────────────────── Lecture ───────────────────────────── */

/**
 * Décode le fichier : UTF-8 (avec ou sans BOM), repli en Windows-1252 si le
 * contenu n'est pas de l'UTF-8 valide (export Excel « CSV (séparateur : ;) »).
 */
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("windows-1252").decode(buffer);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Séparateur le plus fréquent de la ligne d'en-tête. */
function detectDelimiter(text: string): string {
  const header = text.slice(0, text.search(/\r?\n|$/));
  const candidates = [";", ",", "\t"];
  return candidates.reduce((best, d) =>
    header.split(d).length > header.split(best).length ? d : best,
  );
}

const emptyToNull = (v: string | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** Nombre (virgule décimale acceptée) ; NaN si non numérique. */
const toNumber = (v: string | null): number | null =>
  v == null ? null : Number(v.replace(",", "."));

/* ───────────────────────────── Analyse ───────────────────────────── */

export function parseSheetCsv(
  text: string,
  { languages, colors, defaultLng }: { languages: Language[]; colors: Color[]; defaultLng: string },
): ParsedImport {
  const DELIMITER = detectDelimiter(text);
  const table = parseCsvTable(text, DELIMITER, { trim: false, skipEmptyLines: true });
  const COLUMNS = (table[0] ?? []).map((h) => h.trim().toUpperCase());
  const IGNORED = COLUMNS.filter((c) => c && !KNOWN_COLUMNS.includes(c));
  const result: ParsedImport = { DELIMITER, COLUMNS, IGNORED, FATAL: null, GROUPS: [] };

  const missing = REQUIRED_COLUMNS.filter((c) => !COLUMNS.includes(c));
  if (missing.length) {
    result.FATAL = `Colonne(s) obligatoire(s) absente(s) : ${missing.join(", ")}.`;
    return result;
  }
  if (table.length < 2) {
    result.FATAL = "Le fichier ne contient aucune ligne de données.";
    return result;
  }

  const activeLngs = new Set(languages.filter((l) => l.ACTIVE).map((l) => l.LNGCOD));
  const colorCodes = new Set(colors.map((c) => c.COLCOD));
  const groups = new Map<string, ImportGroup>();

  // Numéro de ligne réel : une cellule entre guillemets peut contenir des retours à la ligne.
  let line = 1 + newlines(table[0]);
  table.slice(1).forEach((cells) => {
    const LINE = line + 1;
    line = LINE + newlines(cells);
    const cell = (col: string) => emptyToNull(cells[COLUMNS.indexOf(col)]);
    const row = parseRow(LINE, cell, { activeLngs, colorCodes, defaultLng });

    const key = `${row.COMMON.CODVRAC}|${row.COMMON.MILLESIME ?? ""}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        KEY: key,
        CODVRAC: row.COMMON.CODVRAC,
        MILLESIME: row.COMMON.MILLESIME,
        COMMON: row.COMMON,
        ROWS: [],
        ERRORS: [],
      };
      groups.set(key, group);
    }
    if (group.ROWS.some((r) => r.LNGCOD === row.LNGCOD)) {
      row.ERRORS.push(`Langue « ${row.LNGCOD} » déjà présente pour cette fiche dans le fichier.`);
    }
    // Les champs communs viennent de la langue par défaut quand elle est présente.
    if (row.LNGCOD === defaultLng && !row.ERRORS.length) group.COMMON = row.COMMON;
    group.ROWS.push(row);
  });

  for (const group of groups.values()) {
    for (const r of group.ROWS) {
      group.ERRORS.push(...r.ERRORS.map((e) => `Ligne ${r.LINE} : ${e}`));
    }
  }
  result.GROUPS = [...groups.values()];
  return result;
}

function newlines(cells: readonly string[] | undefined): number {
  return (cells ?? []).reduce((n, c) => n + (c.match(/\r\n|\r|\n/g)?.length ?? 0), 0);
}

function parseRow(
  LINE: number,
  cell: (col: string) => string | null,
  ctx: { activeLngs: Set<string>; colorCodes: Set<string>; defaultLng: string },
): ImportRow {
  const ERRORS: string[] = [];

  const CODVRAC = (cell("CODVRAC") ?? "").toUpperCase();
  if (!CODVRAC) ERRORS.push("Code vrac obligatoire.");
  else if (CODVRAC.length > 30 || !/^[A-Z0-9_.-]+$/.test(CODVRAC)) {
    ERRORS.push(`Code vrac « ${CODVRAC} » invalide (lettres, chiffres, '-', '_' ou '.', 30 max).`);
  }

  const millesimeRaw = cell("MILLESIME");
  const MILLESIME = toNumber(millesimeRaw);
  if (MILLESIME != null && (!Number.isInteger(MILLESIME) || MILLESIME < 1900 || MILLESIME > 2200)) {
    ERRORS.push(`Millésime « ${millesimeRaw} » invalide.`);
  }

  const APPELL = cell("APPELL") ?? "";
  if (!APPELL) ERRORS.push("Appellation obligatoire.");
  else if (APPELL.length > 100) ERRORS.push("Appellation : 100 caractères maximum.");

  const COLCOD = (cell("COLCOD") ?? "").toUpperCase();
  if (!COLCOD) ERRORS.push("Couleur obligatoire.");
  else if (ctx.colorCodes.size && !ctx.colorCodes.has(COLCOD)) {
    ERRORS.push(`Couleur « ${COLCOD} » inconnue (${[...ctx.colorCodes].join(", ")}).`);
  }

  const DESCVRAC = cell("DESCVRAC");
  if (DESCVRAC && DESCVRAC.length > 100) ERRORS.push("Descriptif vrac : 100 caractères maximum.");

  const scale = (col: string, label: string): number | null => {
    const raw = cell(col);
    const n = toNumber(raw);
    if (n != null && (!Number.isInteger(n) || n < 1 || n > 5)) {
      ERRORS.push(`${label} « ${raw} » : valeur entière entre 1 et 5 attendue.`);
    }
    return n;
  };
  const temperature = (col: string, label: string): number | null => {
    const raw = cell(col);
    const n = toNumber(raw);
    if (n != null && (Number.isNaN(n) || n < -5 || n > 30 || !Number.isInteger(n * 2))) {
      ERRORS.push(`${label} « ${raw} » : entre -5 et 30 °C, par pas de 0,5.`);
    }
    return n;
  };

  const COMMON: SheetCommon = {
    CODVRAC,
    MILLESIME,
    APPELL,
    COLCOD,
    DESCVRAC,
    INTARO: scale("INTARO", "Intensité aromatique"),
    INTBOU: scale("INTBOU", "Intensité en bouche"),
    ECHFRU: scale("ECHFRU", "Échelle fruit"),
    TEMPMIN: temperature("TEMPMIN", "Température min"),
    TEMPMAX: temperature("TEMPMAX", "Température max"),
  };
  if (COMMON.TEMPMIN != null && COMMON.TEMPMAX != null && COMMON.TEMPMIN > COMMON.TEMPMAX) {
    ERRORS.push("La température max doit être supérieure ou égale à la température min.");
  }

  const LNGCOD = (cell("LNGCOD") ?? ctx.defaultLng).toLowerCase();
  if (!ctx.activeLngs.has(LNGCOD)) ERRORS.push(`Langue « ${LNGCOD} » inconnue ou inactive.`);

  const TRANSLATION = {} as TranslationValues;
  for (const field of TRANSLATION_FIELDS) {
    const value = cell(field);
    if (value && value.length > TRANSLATION_MAXLEN[field]) {
      ERRORS.push(`${field} : ${TRANSLATION_MAXLEN[field]} caractères maximum (${value.length}).`);
    }
    TRANSLATION[field] = value;
  }

  return { LINE, LNGCOD, COMMON, TRANSLATION, ERRORS };
}

/* ───────────────────────────── Fiches existantes ───────────────────────────── */

/** Renseigne `EXISTING` sur chaque groupe (une recherche par code vrac). */
export async function findExisting(api: VinidocApi, groups: ImportGroup[]): Promise<void> {
  const codes = [...new Set(groups.map((g) => g.CODVRAC).filter(Boolean))];
  const found = new Map<string, SheetListItem[]>();
  await runPool(codes, 4, async (code) => {
    const list = await api.listSheets({ SEARCH: code, PAGESIZE: 200 }, { silentError: true });
    found.set(code, list.ITEMS.filter((s) => s.CODVRAC.toUpperCase() === code));
  });
  for (const g of groups) {
    g.EXISTING = found.get(g.CODVRAC)?.find((s) => s.MILLESIME === g.MILLESIME) ?? null;
  }
}

/* ───────────────────────────── Import ───────────────────────────── */

export type ImportOutcome = "CREATED" | "UPDATED" | "SKIPPED" | "FAILED";

export interface ImportResult {
  KEY: string;
  OUTCOME: ImportOutcome;
  SHTID?: number;
  MESSAGE?: string;
}

/** Valeur du fichier, ou valeur actuelle de la fiche si la cellule est vide. */
function keepIfEmpty<T extends object>(current: T, incoming: Partial<T>): T {
  const out = { ...current };
  for (const [k, v] of Object.entries(incoming)) {
    if (v != null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function pickCommon(s: SheetCommon): SheetCommon {
  return Object.fromEntries(COMMON_FIELDS.map((f) => [f, s[f]])) as unknown as SheetCommon;
}

function pickTranslation(t: Partial<TranslationValues> | undefined): TranslationValues {
  return Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, t?.[f] ?? null])) as TranslationValues;
}

const errorMessage = (e: unknown): string =>
  (e as { message?: string })?.message ?? "Erreur inconnue.";

/**
 * Importe une fiche (groupe de lignes) :
 * - nouvelle fiche → création (+ traduction de la langue par défaut), puis
 *   une traduction par langue supplémentaire ;
 * - fiche existante → ignorée, ou mise à jour si `updateExisting` : les
 *   cellules vides conservent la valeur actuelle de la fiche.
 */
export async function importGroup(
  api: VinidocApi,
  group: ImportGroup,
  { defaultLng, updateExisting }: { defaultLng: string; updateExisting: boolean },
): Promise<ImportResult> {
  const { KEY } = group;
  if (group.ERRORS.length) return { KEY, OUTCOME: "SKIPPED", MESSAGE: "Lignes en erreur." };
  if (group.EXISTING && !updateExisting) {
    return { KEY, OUTCOME: "SKIPPED", SHTID: group.EXISTING.SHTID, MESSAGE: "Fiche déjà existante." };
  }

  const x = { silentError: true };
  let state: SheetState | null = null;
  try {
    let current: Sheet | null = null;
    let rows = group.ROWS;

    if (group.EXISTING) {
      current = await api.getSheet(group.EXISTING.SHTID, x);
      state = await api.updateSheet(
        current.SHTID,
        { ...keepIfEmpty(pickCommon(current), group.COMMON), ROWVER: current.ROWVER },
        x,
      );
    } else {
      const main = rows.find((r) => r.LNGCOD === defaultLng);
      state = await api.createSheet(
        { ...group.COMMON, ...(main && { TRANSLATION: main.TRANSLATION }) },
        x,
      );
      rows = rows.filter((r) => r !== main);
    }

    for (const row of rows) {
      const translation = current
        ? keepIfEmpty(pickTranslation(current.TRANSLATIONS[row.LNGCOD]), row.TRANSLATION)
        : row.TRANSLATION;
      state = await api.saveTranslation(
        state.SHTID,
        row.LNGCOD,
        { ...translation, ROWVER: state.ROWVER },
        x,
      );
    }
    return { KEY, OUTCOME: current ? "UPDATED" : "CREATED", SHTID: state.SHTID };
  } catch (e) {
    // Fiche créée mais une traduction a échoué : on le signale avec son id.
    return { KEY, OUTCOME: "FAILED", SHTID: state?.SHTID, MESSAGE: errorMessage(e) };
  }
}

/** Exécute `task` sur `items` avec au plus `size` appels simultanés. */
export async function runPool<T>(
  items: readonly T[],
  size: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}
