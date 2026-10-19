import {
  TRANSLATION_FIELDS,
  type Sheet,
  type SheetCommon,
  type Translation,
  type TranslationValues,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Brouillons d'édition d'une fiche
// -----------------------------------------
// L'éditeur travaille sur des copies "formulaire" (chaînes vides plutôt que
// null) des données serveur, comparées à l'original pour savoir ce qui a
// changé (bouton Enregistrer, garde-fou avant soumission, onglets marqués).

export type TextDraft = Record<keyof TranslationValues, string>;

export function commonFromSheet(sheet: Sheet): SheetCommon {
  return {
    CODVRAC: sheet.CODVRAC,
    MILLESIME: sheet.MILLESIME,
    APPELL: sheet.APPELL,
    COLCOD: sheet.COLCOD,
    DESCVRAC: sheet.DESCVRAC,
    INTARO: sheet.INTARO,
    INTBOU: sheet.INTBOU,
    ECHFRU: sheet.ECHFRU,
    TEMPMIN: sheet.TEMPMIN,
    TEMPMAX: sheet.TEMPMAX,
  };
}

export function emptyText(): TextDraft {
  return Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, ""])) as TextDraft;
}

export function textFromTranslation(t?: Translation): TextDraft {
  const draft = emptyText();
  if (!t) return draft;
  for (const f of TRANSLATION_FIELDS) draft[f] = t[f] ?? "";
  return draft;
}

export function textsFromSheet(sheet: Sheet): Record<string, TextDraft> {
  return Object.fromEntries(
    Object.entries(sheet.TRANSLATIONS).map(([lng, t]) => [lng, textFromTranslation(t)]),
  );
}

export function isTextDirty(draft: TextDraft | undefined, original: TextDraft | undefined): boolean {
  const a = draft ?? emptyText();
  const b = original ?? emptyText();
  return TRANSLATION_FIELDS.some((f) => a[f].trim() !== b[f].trim());
}

export const hasAnyText = (t: TextDraft | undefined): boolean =>
  !!t && TRANSLATION_FIELDS.some((f) => t[f].trim() !== "");
