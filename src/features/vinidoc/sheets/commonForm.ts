import {
  validators,
  type FieldChange,
  type FormErrors,
  type FormHelpers,
} from "@uvcdr/custom-form-system";
import type { ColorCode, SheetCommon } from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Caractéristiques communes d'une fiche — logique du formulaire CustomForm
// -----------------------------------------
// Partagée par la création (SheetCreateForm) et l'édition (CommonFieldsCard) :
// valeurs "formulaire" (chaînes vides plutôt que null), conversions vers /
// depuis SheetCommon, validations. Rendu des champs : ./CommonFormFields.tsx

type NumberInput = number | "";

export type CommonFormValues = {
  CODVRAC: string;
  MILLESIME: NumberInput;
  APPELL: string;
  COLCOD: string;
  DESCVRAC: string;
  TEMPMIN: NumberInput;
  TEMPMAX: NumberInput;
  INTARO: number | null;
  INTBOU: number | null;
  ECHFRU: number | null;
};

export const EMPTY_COMMON_VALUES: CommonFormValues = {
  CODVRAC: "",
  MILLESIME: "",
  APPELL: "",
  COLCOD: "",
  DESCVRAC: "",
  TEMPMIN: "",
  TEMPMAX: "",
  INTARO: null,
  INTBOU: null,
  ECHFRU: null,
};

const toNull = (v: NumberInput): number | null => (v === "" ? null : v);
const toInput = (v: number | null): NumberInput => v ?? "";

/** Fiche (serveur) → valeurs du formulaire. */
export function commonToForm(c: SheetCommon): CommonFormValues {
  return {
    CODVRAC: c.CODVRAC,
    MILLESIME: toInput(c.MILLESIME),
    APPELL: c.APPELL,
    COLCOD: c.COLCOD,
    DESCVRAC: c.DESCVRAC ?? "",
    TEMPMIN: toInput(c.TEMPMIN),
    TEMPMAX: toInput(c.TEMPMAX),
    INTARO: c.INTARO,
    INTBOU: c.INTBOU,
    ECHFRU: c.ECHFRU,
  };
}

/** Valeurs du formulaire → corps attendu par l'API. */
export function formToCommon(v: CommonFormValues): SheetCommon {
  return {
    CODVRAC: v.CODVRAC.trim().toUpperCase(),
    MILLESIME: toNull(v.MILLESIME),
    APPELL: v.APPELL.trim(),
    COLCOD: v.COLCOD as ColorCode,
    DESCVRAC: v.DESCVRAC.trim() || null,
    INTARO: v.INTARO,
    INTBOU: v.INTBOU,
    ECHFRU: v.ECHFRU,
    TEMPMIN: toNull(v.TEMPMIN),
    TEMPMAX: toNull(v.TEMPMAX),
  };
}

/* ───────────────────────────── Validations ───────────────────────────── */

export const codvracValidator = validators.compose(
  validators.required("Le code vrac est obligatoire."),
  validators.pattern(/^[A-Za-z0-9_.-]+$/, "Lettres, chiffres, « - », « _ » ou « . » uniquement."),
);

/** Règles croisées (l'API revalide tout de toute façon). */
export function validateCommonForm<V extends CommonFormValues>(values: V): FormErrors<V> {
  const errors: FormErrors<CommonFormValues> = {};
  if (values.TEMPMIN !== "" && values.TEMPMAX !== "" && values.TEMPMIN > values.TEMPMAX) {
    errors.TEMPMAX = "Doit être supérieure ou égale à la température min.";
  }
  return errors as FormErrors<V>;
}

/** À brancher sur `onChange` du CustomForm : code vrac toujours en majuscules. */
export function uppercaseCodvrac<V extends CommonFormValues>(change: FieldChange<V>, helpers: FormHelpers<V>) {
  if (change.name === "CODVRAC" && typeof change.value === "string" && change.value !== change.value.toUpperCase()) {
    helpers.setFieldValue("CODVRAC", change.value.toUpperCase());
  }
}
