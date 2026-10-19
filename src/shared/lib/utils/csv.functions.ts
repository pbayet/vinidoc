import { isDate, isObjectLike } from "lodash";
import { parsePrimitive, pathMatchesPattern } from "./data.functions";
import type { Path, Primitive } from "../types/diff-types";

/* ---------------------------------------------
 * Shared domain types
 * ------------------------------------------- */

export type CsvLeaf = Primitive;
export type CsvValue =
  | CsvLeaf
  | readonly CsvValue[]
  | { readonly [k: string]: CsvValue };

export type Constructor<TInstance extends object> = new () => TInstance;

/* ---------------------------------------------
 * Options
 * ------------------------------------------- */

type CsvBaseOptions<T> = Readonly<{
  readonly delimiter?: string; // default ','
  readonly arrayMode?: "join" | "json"; // default 'join'
  readonly objectMode?: "flatten" | "json"; // default 'flatten'
  readonly joinArrayWith?: string; // default '|'
  readonly maxDepth?: number; // default 5
  readonly includePaths?: readonly Path<T>[]; // whitelist
  readonly excludePaths?: readonly Path<T>[]; // blacklist
  /**
   * Writer semantics: path -> label in CSV.
   * Reader will invert label -> path.
   */
  readonly headerMap?: Readonly<Record<string, string>>;
}>;

export type CsvWriteOptions<T> = CsvBaseOptions<T> &
  Readonly<{
    readonly lineBreak?: string; // default '\n'
    readonly formatLeaf?: (value: CsvLeaf) => string; // Date handling etc
  }>;

export type CsvReadOptions<T, TInstance extends object> = CsvBaseOptions<T> &
  Readonly<{
    readonly class?: Constructor<TInstance>; // default true
    readonly hasHeader?: boolean; // default true
    readonly trim?: boolean; // default true
    readonly skipEmptyLines?: boolean; // default true

    /**
     * Leaf parser. Default: empty => null, else parsePrimitive(trimmed).
     * NOTE: If you want Date revival, provide a custom parseLeaf.
     */
    readonly parseLeaf?: (raw: string) => CsvLeaf;

    /**
     * If hasHeader=false:
     * - if provided, these are the column "headers" (paths/labels) in order
     * - else: if includePaths provided, use includePaths order
     * - else: col0, col1...
     */
    readonly columns?: readonly string[];
  }>;

/* ---------------------------------------------
 * Internals: path filter (same behavior as writer)
 * ------------------------------------------- */

type PathFilter = Readonly<{
  readonly shouldIncludeLeaf: (path: string) => boolean;
  readonly shouldDescend: (prefix: string) => boolean;
}>;

const splitPath = (p: string): readonly string[] =>
  p.split(".").filter((s) => s.length > 0);

const isPrefixOfPattern = (prefix: string, pattern: string): boolean => {
  const prefixParts = splitPath(prefix);
  const patternParts = splitPath(pattern);

  if (prefixParts.length > patternParts.length) return false;
  for (let i = 0; i < prefixParts.length; i += 1) {
    if (prefixParts[i] !== patternParts[i]) return false;
  }
  return true;
};

const createPathFilter = <T>(
  options: Pick<CsvBaseOptions<T>, "includePaths" | "excludePaths">
): PathFilter => {
  const include = options.includePaths?.map(String) ?? [];
  const exclude = options.excludePaths?.map(String) ?? [];

  const shouldExclude = (path: string): boolean => {
    const segs = splitPath(path);
    return exclude.some((p) => pathMatchesPattern(p, segs));
  };

  const shouldIncludeLeaf = (path: string): boolean => {
    if (shouldExclude(path)) return false;
    if (include.length === 0) return true;
    const segs = splitPath(path);
    return include.some((p) => pathMatchesPattern(p, segs));
  };

  const shouldDescend = (prefix: string): boolean => {
    if (shouldExclude(prefix)) return false;
    if (include.length === 0) return true;
    return include.some(
      (p) => isPrefixOfPattern(prefix, p) || isPrefixOfPattern(p, prefix)
    );
  };

  return { shouldIncludeLeaf, shouldDescend };
};

/* ---------------------------------------------
 * Writer (unchanged logic, but typed on CsvWriteOptions)
 * ------------------------------------------- */

const escapeCell = (raw: string, delimiter: string): string => {
  const mustEscape =
    raw.includes('"') ||
    raw.includes(delimiter) ||
    raw.includes("\n") ||
    raw.includes("\r");
  return mustEscape ? `"${raw.replace(/"/g, '""')}"` : raw;
};

const defaultFormatLeaf = (v: CsvLeaf): string => {
  if (v === null || v === undefined) return "";
  if (isDate(v)) return v.toISOString();
  return String(v);
};

const toFlatEntries = <T>(
  value: CsvValue,
  options: Required<
    Pick<
      CsvWriteOptions<T>,
      "arrayMode" | "objectMode" | "joinArrayWith" | "maxDepth"
    >
  >,
  pathFilter: PathFilter,
  path: string,
  depth: number
): Array<readonly [string, CsvLeaf | string]> => {
  if (depth > options.maxDepth) {
    return pathFilter.shouldIncludeLeaf(path) ? [[path, "[MaxDepth]"]] : [];
  }

  // leaf
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    isDate(value)
  ) {
    const includeValue = parsePrimitive(value) as Primitive;
    return pathFilter.shouldIncludeLeaf(path) ? [[path, includeValue]] : [];
  }

  // array (always a single cell at "path")
  if (Array.isArray(value)) {
    if (!pathFilter.shouldIncludeLeaf(path)) return [];

    if (options.arrayMode === "json") {
      return [[path, JSON.stringify(value)]];
    }

    const joined = value
      .map((item) => {
        if (
          item === null ||
          item === undefined ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          isDate(item)
        ) {
          return isDate(item) ? item.toISOString() : String(item);
        }
        return JSON.stringify(item);
      })
      .join(options.joinArrayWith);

    return [[path, joined]];
  }

  // object
  if (isObjectLike(value)) {
    if (!pathFilter.shouldDescend(path)) {
      if (options.objectMode === "json" && pathFilter.shouldIncludeLeaf(path)) {
        return [[path, JSON.stringify(value)]];
      }
      return [];
    }

    if (options.objectMode === "json") {
      return pathFilter.shouldIncludeLeaf(path)
        ? [[path, JSON.stringify(value)]]
        : [];
    }

    const entries: Array<readonly [string, CsvLeaf | string]> = [];
    for (const [k, v] of Object.entries(value)) {
      const nextPath = path ? `${path}.${k}` : k;
      entries.push(
        ...toFlatEntries(
          v as CsvValue,
          options,
          pathFilter,
          nextPath,
          depth + 1
        )
      );
    }
    return entries;
  }

  return pathFilter.shouldIncludeLeaf(path) ? [[path, String(value)]] : [];
};

export function objectsToCsvDeep<T>(
  rows: readonly Record<string, CsvValue>[],
  options: CsvWriteOptions<T> = {}
): string {
  if (rows.length === 0) return "";

  const delimiter = options.delimiter ?? ",";
  const lineBreak = options.lineBreak ?? "\n";

  const normalize = {
    arrayMode: options.arrayMode ?? "join",
    objectMode: options.objectMode ?? "flatten",
    joinArrayWith: options.joinArrayWith ?? "|",
    maxDepth: options.maxDepth ?? 5,
  } as const;

  const formatLeaf = options.formatLeaf ?? defaultFormatLeaf;
  const pathFilter = createPathFilter(options);

  const flattenedRows = rows.map((row) => {
    const acc: Record<string, CsvLeaf | string> = {};
    for (const [k, v] of Object.entries(row)) {
      for (const [flatKey, flatVal] of toFlatEntries(
        v,
        normalize,
        pathFilter,
        k,
        0
      )) {
        acc[flatKey] = flatVal;
      }
    }
    return acc;
  });

  const headerMap = options.headerMap;

  const headers: readonly string[] =
    options.includePaths && options.includePaths.length > 0
      ? options.includePaths.map(String)
      : Array.from(
          flattenedRows.reduce((set, r) => {
            for (const k of Object.keys(r)) set.add(k);
            return set;
          }, new Set<string>())
        );

  const headerLine = headers
    .map((h) => (headerMap ? headerMap[h] ?? h : h))
    .join(delimiter);

  const dataLines = flattenedRows.map((r) =>
    headers
      .map((h) => {
        const v = r[h];
        const cellRaw =
          v === null || v === undefined
            ? ""
            : typeof v === "string"
            ? v
            : formatLeaf(v);
        return escapeCell(cellRaw, delimiter);
      })
      .join(delimiter)
  );

  return [headerLine, ...dataLines].join(lineBreak);
}

/* ---------------------------------------------
 * Reader (the actual inverse)
 * ------------------------------------------- */

type ParseMode = Readonly<{
  readonly arrayMode: "join" | "json";
  readonly objectMode: "flatten" | "json";
  readonly joinArrayWith: string;
  readonly parseLeaf: (raw: string) => CsvLeaf;
}>;

const defaultParseLeaf = (raw: string): CsvLeaf => {
  const t = raw.trim();
  if (t.length === 0) return null;
  return parsePrimitive(t) as Primitive;
};

export function csvToObjectsDeep<T, TInstance extends object>(
  csvText: string,
  options: CsvReadOptions<T, TInstance> = {}
): readonly Record<string, CsvValue>[] {
  const delimiter = options.delimiter ?? ",";
  const arrayMode = options.arrayMode ?? "join";
  const objectMode = options.objectMode ?? "flatten";
  const joinArrayWith = options.joinArrayWith ?? "|";
  const maxDepth = options.maxDepth ?? 5;

  const hasHeader = options.hasHeader ?? true;
  const trim = options.trim ?? true;
  const skipEmptyLines = options.skipEmptyLines ?? true;

  const parseLeaf = options.parseLeaf ?? defaultParseLeaf;

  const pathFilter = createPathFilter(options);

  const table = parseCsvTable(csvText, delimiter, { trim, skipEmptyLines });
  if (table.length === 0) return [];

  const { rawHeaders, dataRows } = resolveHeaders(table, options, hasHeader);

  // Input headers may be labels (CSV) -> map to internal paths
  const headers = unmapHeaders(rawHeaders, options.headerMap);

  const mode: ParseMode = { arrayMode, objectMode, joinArrayWith, parseLeaf };

  return dataRows.map((row) => {
    const out: Record<string, CsvValue> = {};

    for (let col = 0; col < headers.length; col += 1) {
      const header = headers[col];
      if (!header) continue;

      const raw = row[col] ?? "";
      const value = parseCellValue(raw, mode);

      // Symmetry with writer:
      // - objectMode=json => do NOT explode into nested keys (single cell at "header")
      if (!pathFilter.shouldIncludeLeaf(header)) continue;

      if (objectMode === "json") {
        out[header] = value;
      } else {
        assignAtPath(out, header, value, maxDepth, pathFilter);
      }
    }

    return out;
  });
}

export function csvToInstancesDeep<T, TInstance extends object>(
  csvText: string,
  options: CsvReadOptions<T, TInstance> &
    Readonly<{
      readonly hydrate?:
        | "assign"
        | ((instance: TInstance, shape: Record<string, CsvValue>) => void);
    }> = {}
): readonly TInstance[] | readonly object[] {
  const Class = options.class;
  const shapes = csvToObjectsDeep<T, TInstance>(csvText, options);
  const hydrate = options.hydrate ?? "assign";

  if (!Class) return shapes;

  return shapes.map((shape) => {
    const instance = new Class();
    if (hydrate === "assign") Object.assign(instance, shape);
    else hydrate(instance, shape);
    return instance;
  });
}

/* ---------------------------------------------
 * Reader helpers
 * ------------------------------------------- */

function parseCellValue(raw: string, mode: ParseMode): CsvValue {
  const t = raw.trim();
  if (t.length === 0) return mode.parseLeaf(t);

  // JSON modes: try JSON first (symmetry with writer who writes JSON string)
  if (mode.objectMode === "json" || mode.arrayMode === "json") {
    const maybe = tryParseJson(t);
    if (maybe.ok) {
      const v = maybe.value;

      if (mode.arrayMode === "json" && Array.isArray(v)) {
        return v.map((x) => coerceJsonToCsvValue(x));
      }
      if (mode.objectMode === "json") {
        return coerceJsonToCsvValue(v);
      }
      // If arrayMode=json but parsed non-array JSON, fall through to leaf parsing
    }
  }

  if (mode.arrayMode === "join" && t.includes(mode.joinArrayWith)) {
    return t.split(mode.joinArrayWith).map((p) => mode.parseLeaf(p));
  }

  return mode.parseLeaf(t);
}

function coerceJsonToCsvValue(input: unknown): CsvValue {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(coerceJsonToCsvValue);
  }
  if (isObjectLike(input)) {
    const rec = input as Record<string, unknown>;
    const out: Record<string, CsvValue> = {};
    for (const [k, v] of Object.entries(rec)) out[k] = coerceJsonToCsvValue(v);
    return out;
  }
  return String(input);
}

function tryParseJson(
  raw: string
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  const first = raw[0];
  const looksJson =
    first === "{" ||
    first === "[" ||
    first === '"' ||
    first === "t" ||
    first === "f" ||
    first === "n" ||
    first === "-" ||
    (first >= "0" && first <= "9");

  if (!looksJson) return { ok: false };

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

function unmapHeaders(
  headers: readonly string[],
  headerMap?: Readonly<Record<string, string>>
): readonly string[] {
  if (!headerMap) return headers;

  // headerMap is path -> label, so invert label -> path
  const inverse = new Map<string, string>();
  for (const [path, label] of Object.entries(headerMap)) {
    // If collision, keep first (predictable). You can change strategy if needed.
    if (!inverse.has(label)) inverse.set(label, path);
  }
  return headers.map((h) => inverse.get(h) ?? h);
}

function resolveHeaders<T, TInstance extends object>(
  table: readonly (readonly string[])[],
  options: CsvReadOptions<T, TInstance>,
  hasHeader: boolean
): {
  readonly rawHeaders: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
} {
  if (hasHeader) {
    const header = table[0] ?? [];
    return { rawHeaders: header, dataRows: table.slice(1) };
  }

  const width = table.reduce((m, r) => Math.max(m, r.length), 0);

  const inferred =
    options.columns ??
    (options.includePaths && options.includePaths.length > 0
      ? options.includePaths.map(String)
      : null);

  const rawHeaders =
    inferred ?? Array.from({ length: width }, (_, i) => `col${i}`);

  return { rawHeaders, dataRows: table };
}

function assignAtPath(
  target: Record<string, CsvValue>,
  path: string,
  value: CsvValue,
  maxDepth: number,
  filter: PathFilter
): void {
  const parts = splitPath(path);
  if (parts.length === 0) return;

  if (parts.length > maxDepth) {
    target[path] = "[MaxDepth]";
    return;
  }

  let cur: Record<string, CsvValue> = target;

  for (let i = 0; i < parts.length; i += 1) {
    const key = parts[i]!;
    const isLeaf = i === parts.length - 1;

    const prefix = parts.slice(0, i + 1).join(".");
    if (!isLeaf && !filter.shouldDescend(prefix)) return;

    if (isLeaf) {
      cur[key] = value;
      return;
    }

    const existing = cur[key];
    if (isObjectLike(existing)) {
      cur = existing as Record<string, CsvValue>;
      continue;
    }

    const next: Record<string, CsvValue> = {};
    cur[key] = next;
    cur = next;
  }
}

/* ---------------------------------------------
 * Robust CSV parser (quotes + embedded newlines)
 * ------------------------------------------- */

type CsvParseOptions = Readonly<{
  readonly trim: boolean;
  readonly skipEmptyLines: boolean;
}>;

export function parseCsvTable(
  text: string,
  delimiter: string,
  opt: CsvParseOptions
): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = (): void => {
    const v = opt.trim ? cell.trim() : cell;
    row.push(v);
    cell = "";
  };

  const pushRow = (): void => {
    if (opt.skipEmptyLines && row.every((c) => c.length === 0)) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? "";

    if (ch === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushCell();
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      pushCell();
      pushRow();
      const next = text[i + 1];
      if (ch === "\r" && next === "\n") i += 1;
      continue;
    }

    cell += ch;
  }

  pushCell();
  pushRow();

  return rows;
}

export async function fileToText(
  file: File,
  encoding: "utf-8" | "windows-1252" | "iso-8859-1" = "utf-8"
): Promise<string> {
  const buffer = await file.arrayBuffer();

  const decoder = new TextDecoder(encoding, {
    fatal: false,
  });

  return decoder.decode(buffer);
}
