import { diff, Diff } from "deep-diff";
import {
  ComparatorContext,
  CompareOptions,
  LoosePath,
  NormalizedDiffItem,
  NormalizedDiffKind,
  ValueKind,
} from "../types/diff-types";
import { isValidIsoDateString } from "./date.functions";
import { advancedSearch, normalizeStr } from "./string.functions";
import { Paths, Primitive } from "../types/types";

export const isDate = (value: unknown): value is Date => value instanceof Date;

export const isPrimitive = (value: unknown): value is Primitive => {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    isDate(value)
  );
};

export const isSamePrimitive = (
  currentValue: Primitive,
  defaultValue: Primitive,
): boolean => {
  return currentValue === defaultValue;
};

/**
 * Convertit une valeur "stringifiée" vers son type logique d'origine.
 * Les valeurs déjà typées sont retournées telles quelles.
 */
export function parsePrimitive(value: unknown): unknown {
  if (typeof value === "object") return JSON.stringify(value);

  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  // null / undefined
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;

  // boolean
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // number (int ou float)
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // fallback: string originale
  return value;
}

// ------------------ Typage / classification des valeurs ------------------

export const isEmpty = (
  value: unknown,
  parseToPrimitive: boolean = true,
): boolean => {
  const checkedValue = parseToPrimitive ? parsePrimitive(value) : value;

  return (
    checkedValue === null ||
    checkedValue === undefined ||
    String(value).trim() === ""
  );
};

/**
 * Détermine le "type logique" d'une valeur pour les comparaisons
 * (null, undefined, array, date, string, number, etc.).
 */
const getValueKind = (value: unknown): ValueKind => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (isValidIsoDateString(value as string)) return "date.str";

  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "bigint") return "bigint";
  if (t === "symbol") return "symbol";
  return "object";
};

// ------------------ Comparaison de chaînes et de valeurs ------------------

/**
 * Compare deux chaînes avec options sur les accents et la casse.
 */
const areStringsEqual = (
  a: string,
  b: string,
  respectAccents?: boolean,
  respectCase?: boolean,
): boolean => {
  return (
    normalizeStr(a, respectAccents, respectCase) ===
    normalizeStr(b, respectAccents, respectCase)
  );
};

/**
 * Compare deux valeurs avec options :
 *  - respectAccents / respectCase pour les strings
 *  - respectType pour autoriser ou non une comparaison "large" string/number/boolean
 */
const areValuesEqualWithOptions = (
  lhs: unknown,
  rhs: unknown,
  respectAccents: boolean,
  respectCase: boolean,
  respectType: boolean,
): boolean => {
  // Même référence → égal
  if (lhs === rhs) return true;

  // Deux strings → comparaison textuelle avec normalisation
  if (typeof lhs === "string" && typeof rhs === "string") {
    return areStringsEqual(lhs, rhs, respectAccents, respectCase);
  }

  // Si on respecte strictement le type, on ne va pas plus loin
  if (respectType) {
    return false;
  }

  // Sinon, on autorise une comparaison "large" des primitives via String()
  const lhsPrimitive =
    typeof lhs === "string" ||
    typeof lhs === "number" ||
    typeof lhs === "boolean"
      ? String(lhs)
      : null;

  const rhsPrimitive =
    typeof rhs === "string" ||
    typeof rhs === "number" ||
    typeof rhs === "boolean"
      ? String(rhs)
      : null;

  if (lhsPrimitive !== null && rhsPrimitive !== null) {
    return areStringsEqual(
      lhsPrimitive,
      rhsPrimitive,
      respectAccents,
      respectCase,
    );
  }

  return false;
};

// ------------------ Navigation dans les objets ------------------

/**
 * Récupère une valeur dans une structure imbriquée via un tableau de segments.
 * - supporte les arrays (index numériques)
 * - supporte les objets (clé string)
 */
const getValueAtPath = (
  root: unknown,
  path: ReadonlyArray<string | number>,
): unknown => {
  return path.reduce<unknown>((acc, segment) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }

    if (Array.isArray(acc) && typeof segment === "number") {
      return acc[segment];
    }

    if (typeof acc === "object") {
      return (acc as Record<string, unknown>)[String(segment)];
    }

    return undefined;
  }, root);
};

// ------------------ Comparaison d'arrays ------------------

/**
 * Compare deux arrays sans tenir compte de l'ordre des éléments.
 *
 * Implémentation pragmatique :
 *  - JSON.stringify() de chaque élément
 *  - tri des résultats
 *  - comparaison des listes sérialisées
 *
 * Attention : dépend de la stabilité de JSON.stringify pour les objets.
 */
const arraysEqualIgnoringOrder = (
  a: readonly unknown[],
  b: readonly unknown[],
): boolean => {
  if (a.length !== b.length) return false;

  const aSerialized = [...a].map((item) => JSON.stringify(item)).sort();
  const bSerialized = [...b].map((item) => JSON.stringify(item)).sort();

  for (let i = 0; i < aSerialized.length; i += 1) {
    if (aSerialized[i] !== bSerialized[i]) return false;
  }
  return true;
};

// ------------------ Gestion des paths / patterns ------------------

/**
 * Vérifie si un pattern de path "plat" (ex: "DATA.LIST.TESTID")
 * matche une suite de segments réelle (ex: ["DATA","LIST",0,"TESTID"]).
 *
 * Les segments numériques (indices de tableau) sont ignorés côté "actual".
 */
export const pathMatchesPattern = (
  pattern: string,
  actualSegments: ReadonlyArray<string | number>,
): boolean => {
  const patternParts = pattern.split(".");

  // On supprime les segments numériques (index d'array)
  const filteredActual = actualSegments
    .map((seg) => String(seg))
    .filter((seg) => Number.isNaN(Number(seg)));

  if (patternParts.length > filteredActual.length) {
    return false;
  }

  // Le pattern doit être un préfixe exact de filteredActual
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i] !== filteredActual[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Remonte un path jusqu'au conteneur d'array en supprimant
 * les indices numériques en fin de path.
 *
 * Exemple : ["DATA","LIST",0,"ITEM"] → ["DATA","LIST",0,"ITEM"]
 * Exemple : ["DATA","LIST",0] → ["DATA","LIST"]
 */
const getArrayContainerPath = (
  segments: ReadonlyArray<string | number>,
): (string | number)[] => {
  const result = [...segments];
  // On supprime uniquement les segments finaux numériques
  while (result.length > 0 && typeof result[result.length - 1] === "number") {
    result.pop();
  }
  return result;
};

// ------------------ diffCompare : normalisation de deep-diff ------------------

/**
 * Compare deux objets (lhs, rhs) en s'appuyant sur deep-diff,
 * puis applique une série de règles pour filtrer/normaliser les différences :
 *
 *  - ignorePaths : ignorer certains chemins (avec support des arrays)
 *  - ignoreTypes : ignorer certains types logiques (date, string, etc.)
 *  - respectArrayOrder : si false, ignore les différences d'ordre dans les arrays
 *  - respectAccents / respectCase / respectType : options de comparaison de valeur
 *  - customComparators : logique métier pour ignorer certaines différences
 *
 * @returns Tableau de diffs normalisés ou undefined s'il n'y a aucune différence significative.
 */
export const diffCompare = <T, K>(
  lhs: T,
  rhs: K,
  options: CompareOptions<T | K> = {},
): NormalizedDiffItem<T | K>[] | undefined => {
  const {
    respectAccents = true,
    respectCase = true,
    respectType = true,
    respectArrayOrder = true,
    ignoreTypes = [],
    ignorePaths = [],
    customComparators = [],
  } = options;

  // deep-diff renvoie un tableau de diffs bruts (ou undefined s'il n'y a rien)
  const rawDiffs = diff(lhs, rhs) ?? [];
  const result: NormalizedDiffItem<T>[] = [];

  for (const d of rawDiffs as Diff<unknown>[]) {
    // Normalisation du "kind" et construction du path complet
    let kind: NormalizedDiffKind;
    const basePathSegments = d.path ?? [];

    let fullPathSegments: (string | number)[];
    let previousValue: unknown;
    let nextValue: unknown;

    if (d.kind === "E") {
      // E = Edit → valeur modifiée
      kind = "changed";
      fullPathSegments = basePathSegments;
      previousValue = d.lhs;
      nextValue = d.rhs;
    } else if (d.kind === "N") {
      // N = New → propriété ajoutée
      kind = "added";
      fullPathSegments = basePathSegments;
      previousValue = undefined;
      nextValue = d.rhs;
    } else if (d.kind === "D") {
      // D = Deleted → propriété supprimée
      kind = "deleted";
      fullPathSegments = basePathSegments;
      previousValue = d.lhs;
      nextValue = undefined;
    } else {
      // A = Array → modification d'un élément de tableau
      kind = "array";
      fullPathSegments = [...basePathSegments, d.index];
      previousValue = getValueAtPath(lhs, fullPathSegments);
      nextValue = getValueAtPath(rhs, fullPathSegments);
    }

    const pathString = fullPathSegments.map((seg) => String(seg)).join(".");
    const loosePath = pathString as LoosePath<T>;

    // 1. Filtre par ignorePaths (avec support des arrays via pathMatchesPattern)
    const shouldIgnoreByPath = ignorePaths.some((p) =>
      pathMatchesPattern(String(p), fullPathSegments),
    );
    if (shouldIgnoreByPath) {
      continue;
    }

    // 2. Filtre par ignoreTypes (en fonction des ValueKind des deux côtés)
    const kindsToCheck: ValueKind[] = [];
    if (previousValue !== undefined) {
      kindsToCheck.push(getValueKind(previousValue));
    }
    if (nextValue !== undefined) {
      kindsToCheck.push(getValueKind(nextValue));
    }

    if (kindsToCheck.some((k) => ignoreTypes.includes(k))) {
      continue;
    }

    // 3. Gestion de respectArrayOrder :
    //    si false, on ignore les diffs si les arrays sont égaux modulo l'ordre
    if (!respectArrayOrder) {
      const arrayPathSegments = getArrayContainerPath(basePathSegments);

      if (arrayPathSegments.length > 0) {
        const lhsArray = getValueAtPath(lhs, arrayPathSegments);
        const rhsArray = getValueAtPath(rhs, arrayPathSegments);

        if (Array.isArray(lhsArray) && Array.isArray(rhsArray)) {
          if (arraysEqualIgnoringOrder(lhsArray, rhsArray)) {
            // L'array est identique (hors ordre) → on ignore ce diff
            continue;
          }
        }
      }
    }

    // 4. Comparaison fine des valeurs "changed" selon les options
    if (kind === "changed") {
      const equalByOptions = areValuesEqualWithOptions(
        previousValue,
        nextValue,
        respectAccents,
        respectCase,
        respectType,
      );
      if (equalByOptions) {
        // Valeurs considérées "égales" selon les règles → on ignore
        continue;
      }
    }

    // 5. Custom comparators : logique métier pour filtrer des diffs
    const ctx: ComparatorContext<T> = {
      path: loosePath,
      pathSegments: fullPathSegments,
      kind,
      previousValue,
      nextValue,
      error: "",
    };

    const shouldIgnoreByComparator = customComparators.some((cmp) => cmp(ctx));
    if (shouldIgnoreByComparator) {
      continue;
    }

    // Si on arrive ici, on conserve ce diff dans le résultat
    result.push({
      path: loosePath,
      pathSegments: fullPathSegments,
      kind,
      previousValue,
      nextValue,
    });
  }

  // On renvoie undefined si aucun diff significatif n'a survécu aux filtres
  return result && result.length > 0 ? result : undefined;
};

// ------------------ Utilitaires génériques ------------------

/**
 * Clone profond JSON-based.
 *
 * Attention :
 *  - perd les fonctions, Dates, Maps, Sets, etc.
 *  - à utiliser uniquement sur des structures "JSON-compatibles".
 */
export const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Coercition simple vers boolean :
 *  - true / 1 / "1" → true
 *  - tout le reste → false
 */
export const toBoolean = (v: unknown): boolean =>
  v === true || v === 1 || v === "1";

// ------------------ findConflicts : détection d'incohérences ------------------

/**
 * Détecte les doublons de "value" ayant plusieurs "code" distincts.
 *
 * Exemple :
 *   findConflicts(products, "CODGAM", "LGAM")
 * renvoie les LGAM associés à plusieurs CODGAM différents.
 *
 * @param items    - Liste d'objets à analyser.
 * @param codeKey  - Clé du "code" (ex: "CODGAM").
 * @param valueKey - Clé de la "valeur" visible (ex: "LGAM").
 *
 * @returns Tableau d'objets { value, codes[] } pour chaque value associée
 *          à plus d'un code distinct.
 */
export function findConflicts<T>(
  items: T[],
  codeKey: keyof T,
  valueKey: keyof T,
): { value: string; codes: string[] }[] {
  const grouped = new Map<string, Set<string>>();

  for (const item of items) {
    const value = item[valueKey];
    const code = item[codeKey];

    // On ne garde que les couples (value, code) string non vides
    if (
      typeof value !== "string" ||
      !value.trim() ||
      typeof code !== "string" ||
      !code.trim()
    )
      continue;

    if (!grouped.has(value)) grouped.set(value, new Set());
    grouped.get(value)!.add(code);
  }

  // On ne conserve que les valeurs associées à plusieurs codes
  return Array.from(grouped.entries())
    .filter(([, codes]) => codes.size > 1)
    .map(([value, codes]) => ({
      value,
      codes: Array.from(codes),
    }));
}

const isObjectLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const searchInObject = <T extends object>(
  obj: T,
  query: unknown,
  options: {
    threshold?: number;
    respectAccents?: boolean;
    respectCase?: boolean;
    unilateralIncludes?: boolean;
    pathsToSearch?: (Paths<T> | string)[];
    excludePaths?: (Paths<T> | string)[];
  } = {
    threshold: 1,
    respectAccents: false,
    respectCase: false,
    unilateralIncludes: false,
    pathsToSearch: [],
    excludePaths: [],
  },
): boolean => {
  const q = String(query ?? "");
  const seen = new WeakSet<object>();

  const walk = (value: unknown): boolean => {
    // Test "basique" sur la valeur courante
    const primitiveValue = parsePrimitive(value);

    if (primitiveValue) {
      if (!isObjectLike(primitiveValue) && !isEmpty(primitiveValue, false)) {
        const isEqual = advancedSearch(
          String(primitiveValue),
          q,
          options?.threshold ?? 1,
          {
            respectAccents: options?.respectAccents,
            respectCase: options?.respectCase,
            unilateralIncludes: options?.unilateralIncludes,
          },
        );
        if (isEqual) {
          return true;
        }
      }
    }

    // Si c'est un objet (incl. tableaux), on protège contre les cycles
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return false;
      seen.add(value);
    }

    // Descente récursive
    if (Array.isArray(value)) {
      for (const item of value) {
        if (walk(item)) return true;
      }
      return false;
    }

    if (isObjectLike(value)) {
      for (const key of Object.keys(value)) {
        // 1. Exclusion prioritaire
        if (options?.excludePaths?.includes(key)) {
          continue;
        }

        // 2. Inclusion si définie
        if (
          options?.pathsToSearch !== undefined &&
          !options.pathsToSearch.includes(key)
        ) {
          continue;
        }

        const child = value[key];
        if (walk(child)) return true;
      }
      return false;
    }

    return false;
  };

  return walk(obj);
};
