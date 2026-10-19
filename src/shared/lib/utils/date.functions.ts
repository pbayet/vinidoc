// ------------------ IMPORTS ------------------

import {
  DateFormat,
  PreparedDateFormat,
  TimestampDateToken,
} from "../types/types";
import { toNumber } from "./number.functions";
import { capitalizeFirstLetter } from "./string.functions";

// ------------------ VALIDATION & PARSING ISO ------------------

// Regex pour détecter les dates "ISO-like" (YYYY-MM-DD, YYYY-MM-DDTHH:MM, etc.)
// avec éventuellement Z ou offset +/-HH:MM
const isoLikeDateRegex =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

// Vérifie qu'une string est une ISO date valide (y compris overflow type 2024-02-31)
export const isValidIsoDateString = (value: string): boolean => {
  if (!isoLikeDateRegex.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const date = new Date(timestamp);

  // Cas simple YYYY-MM-DD : on vérifie qu'il n'y a pas d'overflow
  if (value.length === 10) {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  return true;
};

// ------------------ HELPERS INTERNES ------------------

/**
 * Convertit une valeur en Date valide, ou undefined si invalide.
 * - Accepte Date
 * - Accepte string ISO-like (YYYY-MM-DD, YYYY-MM-DDTHH:MM, etc.)
 * - Accepte timestamp numérique (avec format optionnel)
 */
const toValidDate = (
  value: Date | string | number,
  defaultTimestampFormat: string | undefined = undefined,
): Date | undefined => {
  // 1. Cas Date déjà construite
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  // 2. Tentative : formats timestamp (number ou string numérique)
  const asString = typeof value === "string" ? value.trim() : String(value);

  if (asString && /^-?\d+(\.\d+)?$/.test(asString)) {
    const numericValue = Number(asString);

    if (Number.isFinite(numericValue) && Number.isInteger(numericValue)) {
      const parsed = parseTimestamp(asString, defaultTimestampFormat);
      if (parsed) {
        return parsed;
      }
    }
  }

  // 3. À ce stade, on veut travailler avec une string
  if (typeof value !== "string") {
    // Ni Date, ni string utilisable, ni timestamp valide → on abandonne
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!isValidIsoDateString(trimmed)) {
    return undefined;
  }

  // Cas 'YYYY-MM-DD' → construction en local pour éviter les surprises de timezone
  if (trimmed.length === 10) {
    const [yearStr, monthStr, dayStr] = trimmed.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  // Cas ISO complet (avec heure) → on laisse le moteur JS parser
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Padding numérique à gauche
const padLeft = (value: number, length: number): string => {
  const str = value.toString();
  if (str.length >= length) {
    return str;
  }
  return str.padStart(length, "0");
};

// Formattage de l'année sur une longueur donnée
// - si length <= longueur réelle → on prend les N derniers chiffres
// - sinon → on pad à gauche
const formatYear = (year: number, length: number): string => {
  const str = year.toString();
  if (length <= str.length) {
    return str.slice(str.length - length);
  }
  return str.padStart(length, "0");
};

// Nom du jour (localisé)
const getWeekdayName = (date: Date, locale: Intl.LocalesArgument): string => {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
};

// Nom du mois (localisé)
const getMonthName = (date: Date, locale: Intl.LocalesArgument): string => {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
};

// ------------------ HELPERS POUR PRESETS ------------------

// Retourne une ISO string locale (sans timezone explicite)
const getLocalISOString = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d
    .getMilliseconds()
    .toString()
    .padStart(3, "0")}`;
};

export function toUtcDate(
  dateInput: string | Date | null | undefined,
): Date | undefined {
  if (!dateInput) return undefined;

  const date = new Date(dateInput);

  if (String(date) === "Invalid Date") {
    return undefined;
  }

  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
}

// Normalise une valeur en Date locale (ou undefined si invalide)
const localDate = (
  date: string | number | Date | null | undefined = undefined,
): Date | undefined => {
  if (!date) return undefined;

  try {
    if (date instanceof Date) {
      // On repasse par toISOString + re-conversion pour forcer le local
      return new Date(getLocalISOString(date.toISOString() || ""));
    } else {
      const newDate = toNumber(date)
        ? new Date(toNumber(date) || 0)
        : new Date(date);
      return String(newDate) !== "Invalid Date" ? newDate : undefined;
    }
  } catch {
    return undefined;
  }
};

// Formattage ISO local, avec options seconds/ms
const formatIsoLocal = (
  date: Date,
  options?: { withSeconds?: boolean; withMilliseconds?: boolean },
): string => {
  const withSeconds = options?.withSeconds ?? true;
  const withMilliseconds = options?.withMilliseconds ?? true;

  const year = date.getFullYear();
  const month = padLeft(date.getMonth() + 1, 2);
  const day = padLeft(date.getDate(), 2);
  const hours = padLeft(date.getHours(), 2);
  const minutes = padLeft(date.getMinutes(), 2);
  const seconds = padLeft(date.getSeconds(), 2);
  const millis = padLeft(date.getMilliseconds(), 3);

  let time = `${hours}:${minutes}`;

  if (withSeconds) {
    time = `${time}:${seconds}`;
  }

  if (withMilliseconds) {
    time = `${time}.${millis}`;
  }

  return `${year}-${month}-${day}T${time}`;
};

// Formattage en "long date" localisée, ex: "Mercredi 12 novembre 2025"
const formatLocalLongDate = (
  date: Date,
  locale: Intl.LocalesArgument,
): string => {
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  // Exemple fr-FR: "mercredi 12 novembre 2025" → "Mercredi 12 novembre 2025"
  return capitalizeFirstLetter(formatted);
};

// Date locale (court), ex: "12/11/2025" en fr-FR
const formatLocalDate = (date: Date, locale: Intl.LocalesArgument): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Heure locale, ex: "14:23" (configurable 12/24h via hourAuto)
const formatLocalTime = (
  date: Date,
  locale: Intl.LocalesArgument,
  hourAuto: boolean = false,
): string => {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: hourAuto ? undefined : false,
  }).format(date);
};

// Applique un preset de formatage (PreparedDateFormat)
const formatPreparedDate = (
  date: Date,
  preset: PreparedDateFormat,
  locale: Intl.LocalesArgument,
): string | Date => {
  switch (preset) {
    case "obj-date":
      return date;

    case "iso":
      return formatIsoLocal(date, {
        withSeconds: true,
        withMilliseconds: true,
      });

    case "iso-date-time":
      return formatIsoLocal(date, {
        withSeconds: false,
        withMilliseconds: false,
      });

    case "iso-date": {
      const year = date.getFullYear();
      const month = padLeft(date.getMonth() + 1, 2);
      const day = padLeft(date.getDate(), 2);
      return `${year}-${month}-${day}`;
    }

    case "date-time": {
      const datePart = formatLocalDate(date, locale);
      const timePart = formatLocalTime(date, locale);
      return `${datePart} ${timePart}`;
    }

    case "date":
      return formatLocalDate(date, locale);

    case "time":
      return formatLocalTime(date, locale);

    case "str-date-time": {
      // Exemple fr-FR: "Mercredi 12 novembre 2025, 14:23"
      const datePart = formatLocalLongDate(date, locale);
      const timePart = formatLocalTime(date, locale, true);
      return `${datePart}, ${timePart}`;
    }

    case "str-date":
      return formatLocalLongDate(date, locale);

    case "str-time":
      return formatLocalTime(date, locale, true);
  }
};

// ------------------ PARSING DES TIMESTAMPS COMPACTS ------------------

interface TimestampFormatPart {
  token: TimestampDateToken;
  length: number;
}

// Liste des tokens autorisés pour le format
const allowedTokens: readonly TimestampDateToken[] = [
  "Y",
  "M",
  "D",
  "h",
  "m",
  "s",
  "l",
] as const;

/**
 * Parse un timestamp numérique (string ou number) en Date selon un format custom.
 * Exemple:
 *   parseTimestamp("20251203142345", "YYYYMMDDhhmmss")
 */
function parseTimestamp(
  value: string | number,
  format?: string,
): Date | undefined {
  const date = localDate(value);

  // Si aucun format fourni et que localDate a réussi → on considère que c'est un timestamp standard JS
  if (date && !format) {
    return date;
  }

  if (!format) return undefined;

  const valueStr = typeof value === "number" ? String(value) : value;

  // Le timestamp doit être purement numérique
  if (!/^\d+$/.test(valueStr)) {
    return undefined;
  }

  const parts = tokenizeFormat(format);

  // Optionnel : on pourrait vérifier la longueur attendue vs réelle
  // const expectedLength = parts.reduce((sum, part) => sum + part.length, 0);
  // if (valueStr.length !== expectedLength) {
  //   return undefined;
  // }

  let cursor = 0;

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let millisecond = 0;

  for (const part of parts) {
    const slice = valueStr.slice(cursor, cursor + part.length);
    cursor += part.length;

    const numeric = Number(slice);
    if (Number.isNaN(numeric)) {
      return undefined;
    }

    switch (part.token) {
      case "Y": {
        if (part.length === 2) {
          // Interprétation des années sur 2 chiffres : ici 2000–2099
          year = 2000 + numeric;
        } else {
          year = numeric;
        }
        break;
      }
      case "M": {
        month = numeric; // 1–12 (validation plus bas)
        break;
      }
      case "D": {
        day = numeric;
        break;
      }
      case "h": {
        hour = numeric;
        break;
      }
      case "m": {
        minute = numeric;
        break;
      }
      case "s": {
        second = numeric;
        break;
      }
      case "l": {
        // ms, longueur 1–3 → normalisation en millisecondes
        if (part.length === 1) {
          millisecond = numeric * 100; // "1" → 100 ms
        } else if (part.length === 2) {
          millisecond = numeric * 10; // "12" → 120 ms
        } else {
          millisecond = numeric; // "123" → 123 ms
        }
        break;
      }
      default: {
        // Type safety, ne devrait jamais arriver
        const exhaustiveCheck: never = part.token;
        throw new Error(`Token non géré : ${exhaustiveCheck}`);
      }
    }
  }

  // Année / mois / jour obligatoires
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(
      `Le format doit au minimum contenir année (Y), mois (M) et jour (D). Format : "${format}"`,
    );
  }

  // Validations simples
  if (month < 1 || month > 12) {
    throw new Error(`Mois invalide : ${month} (doit être entre 01 et 12)`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Jour invalide : ${day} (doit être entre 01 et 31)`);
  }

  if (hour < 0 || hour > 23) {
    throw new Error(`Heure invalide : ${hour} (doit être entre 00 et 23)`);
  }

  if (minute < 0 || minute > 59) {
    throw new Error(`Minute invalide : ${minute} (doit être entre 00 et 59)`);
  }

  if (second < 0 || second > 59) {
    throw new Error(`Seconde invalide : ${second} (doit être entre 00 et 59)`);
  }

  if (millisecond < 0 || millisecond > 999) {
    throw new Error(
      `Millisecondes invalides : ${millisecond} (doit être entre 0 et 999)`,
    );
  }

  // Date JS : mois 0-based
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
}

/**
 * Découpe le format en groupes de tokens consécutifs :
 * ex: "YYYYMMDDhhmmsslll"
 * → [{Y,4}, {M,2}, {D,2}, {h,2}, {m,2}, {s,2}, {l,3}]
 */
function tokenizeFormat(format: string): TimestampFormatPart[] {
  if (format.length === 0) {
    throw new Error("Le format ne peut pas être vide.");
  }

  const parts: TimestampFormatPart[] = [];

  let i = 0;
  while (i < format.length) {
    const char = format[i] as TimestampDateToken;

    if (!allowedTokens.includes(char)) {
      throw new Error(
        `Token de format invalide : "${char}". Tokens autorisés : Y M D h m s l.`,
      );
    }

    let length = 1;
    let j = i + 1;

    // Compte la longueur de la séquence de mêmes caractères
    while (j < format.length && format[j] === char) {
      length += 1;
      j += 1;
    }

    validatePart(char, length);
    parts.push({ token: char, length });

    i = j;
  }

  return parts;
}

// Valide chaque segment (token + longueur) du format
function validatePart(token: TimestampDateToken, length: number): void {
  switch (token) {
    case "Y": {
      if (length !== 2 && length !== 4) {
        throw new Error(
          `"Y" doit être "YY" ou "YYYY" (longueur ${length} non supportée).`,
        );
      }
      break;
    }
    case "M":
    case "D":
    case "h":
    case "m":
    case "s": {
      if (length !== 2) {
        throw new Error(
          `"${token}" doit être sur 2 caractères (ex: "${token}${token}").`,
        );
      }
      break;
    }
    case "l": {
      if (length < 1 || length > 3) {
        throw new Error(
          `"l" (millisecondes) doit être sur 1 à 3 caractères (ex: "l", "ll", "lll").`,
        );
      }
      break;
    }
  }
}

// ------------------ FONCTION PRINCIPALE : formatDate ------------------

/**
 * Formatte une date.
 *
 * Deux modes :
 *  - via un tableau de segments custom (tokens) :
 *      ["DD", "/", "MM", "/", "YYYY"]
 *      ["DAY", " ", "DD", " ", "MONTH", " ", "YYYY"]
 *      ["hh", ":", "mm"]
 *
 *  - via un preset :
 *      "iso" | "iso-date-time" | "iso-date" | "date-time" | "date" | "time" |
 *      "str-date-time" | "str-date" | "str-time"
 *
 * Tokens supportés :
 *  - Y, YY, YYY, YYYY... → année (N derniers chiffres)
 *  - M, MM, MMM...      → mois numérique (1..12, padding à partir de 2)
 *  - D, DD, DDD...      → jour numérique (1..31, padding à partir de 2)
 *  - h, hh, hhh...      → heure (0..23)
 *  - m, mm, mmm...      → minute
 *  - s, ss, sss...      → seconde
 *  - "DAY"              → jour en lettres (localisé)
 *  - "MONTH"            → mois en lettres (localisé)
 *
 * Les autres segments sont utilisés tels quels (littéraux).
 */
// Surcharges
export function formatDate(
  value: Date | string | number | null | undefined,
  format: undefined,
  defaultTimestampFormat?: string,
  locale?: Intl.LocalesArgument,
): Date | undefined;

export function formatDate(
  value: Date | string | number | null | undefined,
  format: "obj-date",
  defaultTimestampFormat?: string,
  locale?: Intl.LocalesArgument,
): Date | undefined;

export function formatDate(
  value: Date | string | number | null | undefined,
  format: Exclude<DateFormat, undefined | "obj-date">,
  defaultTimestampFormat?: string,
  locale?: Intl.LocalesArgument,
): string | undefined;

// Implémentation réelle
export function formatDate(
  value: Date | string | number | null | undefined,
  format: DateFormat = undefined,
  defaultTimestampFormat?: string,
  locale: Intl.LocalesArgument = "fr-FR",
): string | Date | undefined {
  if (!value) return undefined;

  // Normalisation de la valeur en Date (gestion ISO, timestamp, etc.)
  const date = toUtcDate(
    toValidDate(
      typeof value === "number" ? String(value) : value,
      defaultTimestampFormat,
    ),
  );

  if (!date) return undefined;

  // format non défini → on renvoie la Date locale normalisée
  if (!format) return localDate(date);

  // --- Cas preset : "iso", "date-time", ... ---
  if (!Array.isArray(format)) {
    return formatPreparedDate(date, format as PreparedDateFormat, locale);
  }

  // --- Cas tokens custom ---
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1..12
  const day = date.getDate(); // 1..31
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const resultParts: string[] = [];

  for (const part of format) {
    if (part.length === 0) {
      // Segment vide → on ne met rien
      continue;
    }

    // Gestion DAY / day / Day
    if (part === "DAY" || part === "Day" || part === "day") {
      const weekday = getWeekdayName(date, locale);
      switch (part) {
        case "DAY":
          resultParts.push(weekday.toLocaleUpperCase());
          break;
        case "Day":
          resultParts.push(capitalizeFirstLetter(weekday.toLocaleLowerCase()));
          break;
        case "day":
          resultParts.push(weekday.toLocaleLowerCase());
          break;
      }
      continue;
    }

    // Gestion MONTH / Month / month
    if (part === "MONTH" || part === "Month" || part === "month") {
      const monthName = getMonthName(date, locale);
      switch (part) {
        case "MONTH":
          resultParts.push(monthName.toLocaleUpperCase());
          break;
        case "Month":
          resultParts.push(
            capitalizeFirstLetter(monthName.toLocaleLowerCase()),
          );
          break;
        case "month":
          resultParts.push(monthName.toLocaleLowerCase());
          break;
      }
      continue;
    }

    // À partir d'ici, on considère que le segment est un token numérique (Y, M, D, h, m, s) ou un littéral
    const char = part[0];
    const length = part.length;

    switch (char) {
      case "Y": {
        resultParts.push(formatYear(year, length));
        break;
      }

      case "M": {
        const valueStr =
          length === 1 ? month.toString() : padLeft(month, length);
        resultParts.push(valueStr);
        break;
      }

      case "D": {
        const valueStr = length === 1 ? day.toString() : padLeft(day, length);
        resultParts.push(valueStr);
        break;
      }

      case "h": {
        const valueStr =
          length === 1 ? hours.toString() : padLeft(hours, length);
        resultParts.push(valueStr);
        break;
      }

      case "m": {
        const valueStr =
          length === 1 ? minutes.toString() : padLeft(minutes, length);
        resultParts.push(valueStr);
        break;
      }

      case "s": {
        const valueStr =
          length === 1 ? seconds.toString() : padLeft(seconds, length);
        resultParts.push(valueStr);
        break;
      }

      default: {
        // Segment inconnu → traité comme littéral
        resultParts.push(part);
      }
    }
  }

  return resultParts.join("");
}

// ------------------ UTILITAIRE : getTimeSince ------------------

/**
 * Retourne le temps écoulé depuis une date donnée, en format humain
 * ("À l'instant", "Il y a X minutes", "Il y a X heures", "Il y a X jours").
 */
export const getTimeSince = (transformDate: Date): string => {
  const now = new Date();

  const diffMs = now.getTime() - transformDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "À l'instant";
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  } else {
    return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  }
};
