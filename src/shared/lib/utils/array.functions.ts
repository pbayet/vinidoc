import { isEmpty, isNumber } from "lodash";
import { PathInput, Paths, Primitive, SortOrder } from "../types/types";
import { searchInObject } from "./data.functions";

export function comparePrimitive(
  a: Primitive,
  b: Primitive,
  order: SortOrder = "asc",
): number {
  // 1. null / undefined
  if (isEmpty(a) && isEmpty(b)) return 0;
  if (isEmpty(a)) return 1;
  if (isEmpty(b)) return -1;

  // 2. boolean
  if (typeof a === "boolean" && typeof b === "boolean") {
    return order === "asc" ? Number(a) - Number(b) : Number(b) - Number(a);
  }

  // 3. number / bigint
  if (isNumber(a) && isNumber(b)) {
    if (typeof a !== typeof b) {
      throw new TypeError("Impossible de comparer number et bigint");
    }

    if (a === b) return 0;
    const result = a < b ? -1 : 1;
    return order === "asc" ? result : -result;
  }

  // 4. string
  if (typeof a === "string" && typeof b === "string") {
    const result = a.localeCompare(b);
    return order === "asc" ? result : -result;
  }

  // 5. symbol
  if (typeof a === "symbol" && typeof b === "symbol") {
    const descA = a.description ?? "";
    const descB = b.description ?? "";

    const result = descA.localeCompare(descB);
    return order === "asc" ? result : -result;
  }

  // 6. types différents → ordre stable par type
  const typeOrder: readonly (typeof a)[] = [
    "boolean",
    "number",
    "bigint",
    "string",
    "symbol",
  ];

  const indexA = typeOrder.indexOf(typeof a);
  const indexB = typeOrder.indexOf(typeof b);

  const result = indexA - indexB;
  return order === "asc" ? result : -result;
}

export function sortArray<T>(
  array: readonly T[] | undefined,
  selector: (item: T) => Primitive,
  order: SortOrder = "asc",
): T[] {
  if (!array) return [];
  return [...array].sort((a, b) =>
    comparePrimitive(selector(a), selector(b), order),
  );
}

/**
 * Récupère une valeur dans un objet à partir d'un chemin en notation "dot".
 *
 * Exemple :
 *  getValueByPath({ a: { b: 2 } }, "a.b") → 2
 *
 * - Si à un moment donné on tombe sur une valeur non-objet, on renvoie undefined.
 * - Ne gère que les propriétés d'objet (pas d'index de tableau numériques).
 */
export const getValueByPath = <T>(item: T, path: string): unknown => {
  const segments = path.split(".");
  let current: unknown = item;

  for (const segment of segments) {
    if (current !== null && typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      // Si on ne peut plus descendre (current n'est plus un objet), on arrête
      current = undefined;
      break;
    }
  }

  return current;
};

// ------------------ unique : dédoublonnage générique ------------------

// Surcharge 1 : dédoublonnage direct (par valeur ou référence)
// - Pour les primitives : dédoublonnage par valeur
// - Pour les objets : dédoublonnage par référence
export function unique<T>(items: readonly T[]): T[];

// Surcharge 2 : dédoublonnage par chemin (clé calculée à partir d'une propriété)
// - path est type-safe via PathInput<T>, mais accepte aussi un string libre
export function unique<T, P extends PathInput<T>>(
  items: readonly T[],
  path: P,
): T[];

/**
 * Implémentation de unique :
 *
 * - Sans path : Set sur l'élément lui-même (primitif ou référence objet).
 * - Avec path : Set sur la valeur obtenue via getValueByPath(item, path).
 *
 * Le premier élément rencontré pour une clé donnée est conservé,
 * les suivants sont ignorés.
 */
export function unique<T>(items: readonly T[], path?: string): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const item of items) {
    // Clé de dédoublonnage : soit l'item lui-même, soit la valeur à path
    const key: unknown = path ? getValueByPath(item, path) : (item as unknown);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

// utils/duplicate.ts
export function duplicateArrayContent<T>(
  items: readonly T[],
  count: number,
): T[] {
  if (count <= 0) return [];

  // Pré-allocation pour optimiser la perf
  const result: T[] = [];
  result.length = items.length * count;

  for (let i = 0; i < count; i++) {
    const offset = i * items.length;
    for (let j = 0; j < items.length; j++) {
      result[offset + j] = items[j];
    }
  }

  return result;
}

export const searchInObjects = <T extends object>(
  objs: T[],
  searchText: string,
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
): T[] => {
  if (!searchText.trim()) return objs;
  return objs.filter((obj) => searchInObject(obj, searchText, options));
};
