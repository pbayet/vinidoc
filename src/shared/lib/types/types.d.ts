// ------------------ TYPES & CONTRATS ------------------

export type SortOrder = "asc" | "desc";

// Types primitifs TS que l'on considère comme "atomiques" dans Paths<T>
export type Primitive =
  | string
  | number
  | boolean
  | symbol
  | Date
  | null
  | undefined
  | bigint;

// Construit tous les chemins possibles d'un objet T sous forme de "a.b.c"
// - Si T[K] est un Primitive → on retourne le chemin complet `${Prefix}${K}`
// - Sinon (objet) → on concatène récursivement les chemins descendants
export type Paths<T, Prefix extends string = ""> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? `${Prefix}${K}`
        : `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>;
    }[keyof T & string];

// Type d'input pour un chemin : soit un chemin calculé par Paths<T>, soit un string libre
export type PathInput<T> = Paths<T> | (string & {});

// Permet de décrire une répétition d'un token string jusqu'à un nombre max de fois.
// Exemple : Repeated<"Y", 4> → "Y" | "YY" | "YYY" | "YYYY"
type Repeated<T extends string, Max extends number> = Max extends 1
  ? T
  : Max extends 2
    ? T | `${T}${T}`
    : Max extends 3
      ? T | `${T}${T}` | `${T}${T}${T}`
      : Max extends 4
        ? T | `${T}${T}` | `${T}${T}${T}` | `${T}${T}${T}${T}`
        : Max extends 5
          ?
              | T
              | `${T}${T}`
              | `${T}${T}${T}`
              | `${T}${T}${T}${T}`
              | `${T}${T}${T}${T}${T}`
          : Max extends 6
            ?
                | T
                | `${T}${T}`
                | `${T}${T}${T}`
                | `${T}${T}${T}${T}`
                | `${T}${T}${T}${T}${T}`
                | `${T}${T}${T}${T}${T}${T}`
            : never;

// Tokens pour les différents segments de date
type YearToken = Repeated<"Y", 4>;
type MonthNumToken = Repeated<"M", 2>;
type DayNumToken = Repeated<"D", 2>;
type HourToken = Repeated<"h", 2>;
type MinuteToken = Repeated<"m", 2>;
type SecondToken = Repeated<"s", 2>;

// Tokens textuels pour jour/mois en toutes lettres
type TextToken = "DAY" | "Day" | "day" | "MONTH" | "Month" | "month";

// Trick pour garder l'auto-complétion sur les tokens connus
// tout en autorisant n'importe quel littéral
type LiteralToken = string & { readonly __literalToken?: never };

// Formats "prêts à l'emploi" (presets) pour formatDate
export type PreparedDateFormat =
  | "obj-date" // Retourne l'objet Date JS
  | "iso-date-time" // 2025-12-03T14:23
  | "iso-date" // 2025-12-03
  | "iso" // 2025-12-03T14:23:45.123
  | "date-time" // 03/12/2025 14:23 (local)
  | "date" // 03/12/2025 (local)
  | "time" // 14:23 (local)
  | "str-date-time" // Mercredi 12 novembre 2025, 14:23
  | "str-date" // Mercredi 12 novembre 2025
  | "str-time"; // 14:23 (texte, format localisé)

// Token d'un format timestamp (pour parseTimestamp)
export type DateFormatToken =
  | YearToken
  | MonthNumToken
  | DayNumToken
  | HourToken
  | MinuteToken
  | SecondToken
  | TextToken
  | LiteralToken;

// Tokens autorisés pour décrire un format de timestamp compact (YYYYMMDDhhmmsslll)
export type TimestampDateToken = "Y" | "M" | "D" | "h" | "m" | "s" | "l";

// Type global qui décrit soit :
// - un tableau de tokens custom
// - un preset
// - null / undefined
export type DateFormat =
  | readonly DateFormatToken[]
  | readonly PreparedDateFormat
  | null
  | undefined;

export type APIFilesResult = {
  originalName: string;
  savedName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
};
