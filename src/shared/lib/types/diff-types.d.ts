// Primitive de base
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

// Détection des arrays
// type IsArray<T> = T extends readonly (infer U)[] ? U : never;

// Construction récursive des chemins possibles
type PathInternal<T, Prev extends string = ""> = T extends Primitive
  ? never
  : {
      [K in keyof T & (string | number)]: T[K] extends readonly (infer U)[]
        ? // chemin vers le tableau lui-même
          | `${Prev}${K}`
            // chemin vers un élément du tableau
            | `${Prev}${K}.${number}`
            // chemin vers une propriété de l'élément du tableau
            | (U extends Primitive
                ? `${Prev}${K}.${number}`
                : `${Prev}${K}.${number}.${PathInternal<U>}`)
        : // chemin vers la propriété
          | `${Prev}${K}`
            // chemin vers une propriété imbriquée
            | (T[K] extends Primitive
                ? never
                : `${Prev}${K}.${PathInternal<T[K]>}`);
    }[keyof T & (string | number)];

// Chemins "fortement typés"
export type Path<T> = PathInternal<T>;

// Chemins "souples" : auto-completion sur Path<T> mais on peut taper n'importe quoi
export type LoosePath<T> = Path<T> | (string & {});

// Types de valeurs reconnus pour filtre "ignoreTypes"
export type ValueKind =
  | "string"
  | "number"
  | "boolean"
  | "bigint"
  | "symbol"
  | "null"
  | "undefined"
  | "date"
  | "date.str"
  | "array"
  | "object";

export type NormalizedDiffKind = "added" | "deleted" | "changed" | "array";

// Résultat lisible
export interface NormalizedDiffItem<T> {
  path: LoosePath<T>;
  pathSegments: ReadonlyArray<string | number>;
  kind: NormalizedDiffKind;
  previousValue: unknown;
  nextValue: unknown;
}

// Contexte pour comparateurs custom
export interface ComparatorContext<T> extends NormalizedDiffItem<T> {
  error: string;
}

export type CustomComparator<T> = (ctx: ComparatorContext<T>) => boolean;

// Options de comparaison
export interface CompareOptions<T> {
  respectAccents?: boolean; // true par défaut
  respectCase?: boolean; // true par défaut
  respectType?: boolean; // true par défaut
  respectArrayOrder?: boolean; // true par défaut

  ignoreTypes?: readonly ValueKind[];
  ignorePaths?: readonly LoosePath<T>[];

  customComparators?: readonly CustomComparator<T>[];
}
