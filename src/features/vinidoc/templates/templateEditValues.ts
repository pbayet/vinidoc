import type { FormErrors } from "@uvcdr/custom-form-system";
import type {
  TagType,
  Template,
  TemplateTag,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Édition d'un modèle — logique du formulaire CustomForm
// -----------------------------------------
// Valeurs "formulaire", détection des changements par bloc et conversion
// vers les corps attendus par l'API (métadonnées, balises, fichier).
// Rendu : ./TemplateEditModal.tsx

/** Réglage d'une balise texte (ligne de la liste `TAGS`). */
export type TagFormRow = {
  TAGTYP: TagType;
  TAGNAM: string;
  ISKNOWN: boolean;
  /** "" = illimité (CustomFormInput number vidé) */
  MAXLEN: number | "";
  REQUIRED: boolean;
};

export type TemplateEditFormValues = {
  TPLNAM: string;
  DESCR: string;
  /** "" = toutes les langues */
  LNGCOD: string;
  ACTIVE: boolean;
  /** Balises texte uniquement (les images / badges ne sont pas paramétrables) */
  TAGS: TagFormRow[];
  /** Nouveau fichier .pptx (remplacement à l'enregistrement) */
  FILE: File | null;
};

export const tagKey = (t: Pick<TemplateTag, "TAGTYP" | "TAGNAM">) =>
  `${t.TAGTYP}:${t.TAGNAM}`;

export function textTagsOf(t: Template): TemplateTag[] {
  return (t.TAGS ?? []).filter((g) => g.TAGTYP === "TEXT");
}

export function otherTagsOf(t: Template): TemplateTag[] {
  return (t.TAGS ?? []).filter((g) => g.TAGTYP !== "TEXT");
}

/** Modèle enregistré → valeurs du formulaire (initiales et cible du reset). */
export function templateToForm(t: Template): TemplateEditFormValues {
  return {
    TPLNAM: t.TPLNAM,
    DESCR: t.DESCR ?? "",
    LNGCOD: t.LNGCOD ?? "",
    ACTIVE: t.ACTIVE,
    TAGS: textTagsOf(t).map((g) => ({
      TAGTYP: g.TAGTYP,
      TAGNAM: g.TAGNAM,
      ISKNOWN: g.ISKNOWN,
      MAXLEN: g.MAXLEN ?? "",
      REQUIRED: g.REQUIRED,
    })),
    FILE: null,
  };
}

const maxLenOf = (v: number | "" | null | undefined): number | null =>
  v === "" || v == null ? null : Number(v);

/* ───────────────────────── Changements par bloc ───────────────────────── */

export function metaChanged(v: TemplateEditFormValues, t: Template): boolean {
  return (
    v.TPLNAM.trim() !== t.TPLNAM ||
    (v.DESCR.trim() || null) !== (t.DESCR ?? null) ||
    (v.LNGCOD || null) !== (t.LNGCOD ?? null) ||
    v.ACTIVE !== t.ACTIVE
  );
}

/** Clés des balises dont la longueur max ou le caractère obligatoire a changé. */
export function changedTagKeys(
  v: TemplateEditFormValues,
  t: Template,
): Set<string> {
  const saved = new Map(textTagsOf(t).map((g) => [tagKey(g), g]));
  const keys = new Set<string>();
  for (const row of v.TAGS) {
    const g = saved.get(tagKey(row));
    if (
      g &&
      (row.REQUIRED !== g.REQUIRED || maxLenOf(row.MAXLEN) !== g.MAXLEN)
    ) {
      keys.add(tagKey(row));
    }
  }
  return keys;
}

/* ───────────────────────── Corps des requêtes ───────────────────────── */

export function toUpdateRequest(v: TemplateEditFormValues, ROWVER: string) {
  return {
    TPLNAM: v.TPLNAM.trim(),
    DESCR: v.DESCR.trim() || null,
    LNGCOD: v.LNGCOD || null,
    ACTIVE: v.ACTIVE,
    ROWVER,
  };
}

export function toTagsRequest(v: TemplateEditFormValues) {
  return v.TAGS.map((row) => ({
    TAGTYP: row.TAGTYP,
    TAGNAM: row.TAGNAM,
    MAXLEN: maxLenOf(row.MAXLEN),
    REQUIRED: row.REQUIRED,
  }));
}

/* ───────────────────────── Validation ───────────────────────── */

/** Longueur max d'une balise : vide (illimité) ou entier ≥ 1. */
export function validateMaxLen(value: unknown): string | undefined {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? undefined : "Entier ≥ 1";
}

/** Validation globale : au moins une ligne de balise invalide → erreur de liste. */
export function validateTemplateForm(
  v: TemplateEditFormValues,
): FormErrors<TemplateEditFormValues> {
  const invalid = v.TAGS.some((row) => validateMaxLen(row.MAXLEN));
  return invalid
    ? {
        TAGS: "Les longueurs max doivent être des nombres entiers positifs.",
      }
    : {};
}
