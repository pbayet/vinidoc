import type { ExistingFile } from "@uvcdr/custom-form-system";
import type {
  CheckReport,
  CheckedTag,
  LocalSheetChanges,
  LogisticsField,
  OutputFormat,
  TagIssue,
  Packaging,
  SheetSnapshot,
  TemplateTag,
} from "../../../entities/vinidoc/vinidoc.types";
import { textLength } from "../lib/format";

// -----------------------------------------
// Génération d'une fiche technique — logique du formulaire CustomForm
// -----------------------------------------
// Valeurs "formulaire" (identifiants en chaînes pour les CustomFormSelect),
// constantes d'affichage et conversion vers le corps attendu par l'API.
// Rendu : ./GenerationForm.tsx

/** Section « Contrôle et aperçu » (cible du lien « voir le détail » du récapitulatif). */
export const CHECK_SECTION_ID = "vd-generation-check";

/** Fait défiler jusqu'à la section « Contrôle et aperçu » et la met brièvement en évidence. */
export function scrollToCheckSection() {
  const el = document.getElementById(CHECK_SECTION_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("vd-flash");
  void el.offsetWidth; // relance l'animation si on reclique
  el.classList.add("vd-flash");
}

export const PHOTO_MAX_SIZE = 15 * 1024 * 1024;
export const PHOTO_ACCEPT = ".png,.jpg,.jpeg,.webp";

export type GenerationFormValues = {
  /** Article PFI (obligatoire) : détermine le vin, alimente {{LOG.*}} */
  ARTICLE: string;
  /** Données logistiques corrigées : balise LOG.* → valeur (vide = Sage X3) */
  LOGISTICS: Record<string, string>;
  /** Fiche ajustée pour cette génération (non enregistrée), null = fiche telle quelle */
  LOCAL: LocalSheetChanges | null;
  SHTID: string;
  LNGCOD: string;
  TPLID: string;
  FORMAT: OutputFormat;
  PHOTO: File | null;
  PACKAGING: Packaging;
  HVE: boolean;
  BIO: boolean;
  /** Champs libres {{FREE.*}} du modèle : balise → texte saisi */
  FREE: Record<string, string>;
};

export function initialGenerationValues(
  sheetId: string,
  lng: string,
): GenerationFormValues {
  return {
    ARTICLE: "",
    LOGISTICS: {},
    LOCAL: null,
    SHTID: sheetId,
    LNGCOD: lng,
    TPLID: "",
    FORMAT: "pdf",
    PHOTO: null,
    PACKAGING: "BOUTEILLE",
    HVE: false,
    BIO: false,
    FREE: {},
  };
}

/* ───────────────────────── Champs libres ───────────────────────── */

/** Balise texte libre du modèle ({{FREE.PRIX}}, {{FREE.MENTION_PROMO-130}}…), cf. API utils.FREE_TAG_RE. */
const FREE_TAG_RE = /^FREE\.[A-Z0-9_.]+$/;

/** Champs libres d'un modèle, par ordre alphabétique (naturel : X_2 avant X_10). */
export function freeTagsOf(tags: TemplateTag[] = []): TemplateTag[] {
  return tags
    .filter((t) => t.TAGTYP === "TEXT" && FREE_TAG_RE.test(t.TAGNAM))
    .sort((a, b) =>
      a.TAGNAM.localeCompare(b.TAGNAM, undefined, { numeric: true }),
    );
}

/** « FREE.PRIX_PUBLIC » → « Prix public » (nom de la donnée attendue). */
export function freeTagLabel(TAGNAM: string): string {
  const name = TAGNAM.slice("FREE.".length).replace(/[_.]+/g, " ").trim();
  return name.charAt(0) + name.slice(1).toLowerCase();
}

/** Champs libres bloquants (obligatoire vide, texte trop long), en message. */
export function freeTagIssues(
  tags: TemplateTag[],
  FREE: Record<string, string>,
): string[] {
  return tags.flatMap((t) => {
    const length = textLength(FREE[t.TAGNAM]?.trim());
    if (t.REQUIRED && length === 0)
      return [`${freeTagLabel(t.TAGNAM)} : obligatoire`];
    if (t.MAXLEN != null && length > t.MAXLEN)
      return [`${freeTagLabel(t.TAGNAM)} : ${length}/${t.MAXLEN} caractères`];
    return [];
  });
}

/* ───────────────────────── Ajustements locaux ───────────────────────── */

/**
 * Contrôle des longueurs avec les données logistiques corrigées (saisies
 * dans le tableau, contrôlées sans aller-retour avec l'API) : mêmes règles
 * que l'API (utils.checkAgainstTemplate), appliquées aux seules balises
 * corrigées. Les valeurs sont rognées comme le fait l'API à la réception.
 * La fiche ajustée localement est, elle, contrôlée par l'API.
 */
export function checkWithOverrides(
  check: CheckReport | null,
  overrides: Record<string, string>,
): CheckReport | null {
  if (!check || !Object.keys(overrides).length) return check;
  const adjust = (t: CheckedTag): CheckedTag => {
    if (!(t.TAGNAM in overrides)) return t;
    const LENGTH = textLength(overrides[t.TAGNAM].trim());
    const ISSUE: TagIssue =
      t.ISSUE === "UNKNOWN_TAG"
        ? t.ISSUE
        : t.REQUIRED && LENGTH === 0
          ? "MISSING"
          : t.MAXLEN != null && LENGTH > t.MAXLEN
            ? "TOO_LONG"
            : null;
    return { ...t, LENGTH, ISSUE };
  };
  const TEMPLATES = check.TEMPLATES.map((tpl) => {
    const TAGS = tpl.TAGS.map(adjust);
    const ERRORS = TAGS.filter(
      (t) => t.ISSUE === "MISSING" || t.ISSUE === "TOO_LONG",
    );
    return { ...tpl, TAGS, ERRORS, OK: ERRORS.length === 0 };
  });
  return { ...check, TEMPLATES, OK: TEMPLATES.every((t) => t.OK) };
}

/** Ajustements locaux présents (caractéristiques et/ou textes). */
export const hasLocalChanges = (l: LocalSheetChanges | null) =>
  !!l && (!!l.SHEET || !!l.TRANSLATION);

/**
 * Contenu affiché dans l'aperçu avec les ajustements locaux : mêmes règles
 * que l'API (utils.applyLocalChanges) — caractéristiques remplacées sauf le
 * code vrac, textes de la langue fusionnés champ par champ.
 */
export function applyLocalChanges(
  content: SheetSnapshot,
  lng: string,
  local: LocalSheetChanges | null,
): SheetSnapshot {
  if (!hasLocalChanges(local)) return content;
  const { SHEET, TRANSLATION } = local!;
  return {
    ...content,
    ...(SHEET ? { ...SHEET, CODVRAC: content.CODVRAC } : {}),
    TRANSLATIONS: TRANSLATION
      ? {
          ...content.TRANSLATIONS,
          [lng]: { ...content.TRANSLATIONS[lng], ...TRANSLATION },
        }
      : content.TRANSLATIONS,
  };
}

/* ───────────────────────── Alertes de prévention ───────────────────────── */

/** Point d'attention ; `key` : étape du récapitulatif concernée. */
export interface GenerationWarning {
  key: "free" | "logistics" | "photo";
  message: string;
}

/** Contexte des alertes : balises du modèle choisi et article chargé. */
export interface WarningContext {
  freeTags: TemplateTag[];
  /** Le modèle a un cadre photo (img:BOTTLEPHOTO) */
  photoFrame: boolean;
  /** Balises {{LOG.*}} utilisées par le modèle */
  logisticsTags: string[];
  /** Données logistiques de l'article (null tant qu'il n'est pas chargé) */
  logistics: LogisticsField[] | null;
}

export const EMPTY_WARNING_CONTEXT: WarningContext = {
  freeTags: [],
  photoFrame: false,
  logisticsTags: [],
  logistics: null,
};

/**
 * Points d'attention non bloquants avant la génération : champs libres
 * facultatifs vides, données logistiques utilisées par le modèle mais vides
 * (après corrections), photo du modèle conservée. Affichés dans le
 * récapitulatif et confirmés au clic sur « Générer ».
 */
export function generationWarnings(
  v: GenerationFormValues,
  ctx: WarningContext,
): GenerationWarning[] {
  const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
  const out: GenerationWarning[] = [];

  const emptyFree = ctx.freeTags.filter(
    (t) => !t.REQUIRED && !v.FREE[t.TAGNAM]?.trim(),
  );
  if (emptyFree.length) {
    out.push({
      key: "free",
      message: `${plural(emptyFree.length, "Champ libre non renseigné", "Champs libres non renseignés")} : ${emptyFree
        .map((t) => freeTagLabel(t.TAGNAM))
        .join(", ")} — ${plural(emptyFree.length, "il sera vide", "ils seront vides")} sur la fiche.`,
    });
  }

  const used = new Set(ctx.logisticsTags);
  const missingLog = (ctx.logistics ?? []).filter(
    (f) => used.has(f.TAG) && !(v.LOGISTICS[f.TAG] ?? f.VALUE).trim(),
  );
  if (missingLog.length) {
    out.push({
      key: "logistics",
      message: `${plural(missingLog.length, "Donnée logistique manquante", "Données logistiques manquantes")} : ${missingLog
        .map((f) => f.LABEL.split(" (")[0])
        .join(", ")} — ${plural(missingLog.length, "elle sera vide", "elles seront vides")} sur la fiche (saisissable dans le tableau de l'article).`,
    });
  }

  if (ctx.photoFrame && !v.PHOTO) {
    out.push({
      key: "photo",
      message:
        "Aucune photo produit sélectionnée : l'image d'origine du modèle sera conservée.",
    });
  }
  return out;
}

/** Libellés / icônes par format de sortie. */
export const FORMAT_META: Record<OutputFormat, { label: string; icon: string }> =
  {
    pdf: { label: "PDF", icon: "file-pdf" },
    pptx: { label: "PowerPoint", icon: "file-powerpoint" },
  };

/** Type MIME par format (détection du type par la liseuse FileViewerModal). */
const FORMAT_MIME: Record<OutputFormat, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * Fichier généré → pièce jointe exploitable par `FileAttachmentCards` /
 * `FileViewerModal` (liseuse de custom-form-system).
 */
export function toViewerFile(g: {
  URL: string;
  ORIGINALNAME: string | null;
  FORMAT: OutputFormat;
  FILECODE: string;
  SIZEBYTES?: number | null;
}): ExistingFile {
  return {
    name: g.ORIGINALNAME ?? `${FORMAT_META[g.FORMAT].label}.${g.FORMAT}`,
    url: g.URL,
    type: FORMAT_MIME[g.FORMAT],
    size: g.SIZEBYTES ?? undefined,
    filecode: g.FILECODE,
  };
}

export const OUTPUT_FORMATS = Object.keys(FORMAT_META) as OutputFormat[];

/**
 * Libellés / icônes par conditionnement, avec le format d'image attendu
 * (ratio du cadre « img:BOTTLEPHOTO » du groupe correspondant).
 */
export const PACKAGING_META: Record<
  Packaging,
  { label: string; icon: string; ratio: string }
> = {
  BOUTEILLE: { label: "Bouteille", icon: "wine-bottle", ratio: "1:3 (ex. 1000 × 3000 px)" },
  BIB: { label: "BIB", icon: "box", ratio: "3:4 (ex. 1500 × 2000 px)" },
  CANETTE: { label: "Canette", icon: "bottle-water", ratio: "2:3 (ex. 1000 × 1500 px)" },
};

export const PACKAGINGS = Object.keys(PACKAGING_META) as Packaging[];

/**
 * Valeurs du formulaire → corps de `POST generate` (hors photo). Les champs
 * libres saisis pour un autre modèle sont ignorés par l'API (seules les
 * balises du modèle choisi sont alimentées).
 */
export function toGenerateRequest(v: GenerationFormValues) {
  return {
    SHTID: Number(v.SHTID),
    TPLID: Number(v.TPLID),
    LNGCOD: v.LNGCOD,
    FORMAT: v.FORMAT,
    HVE: v.HVE,
    BIO: v.BIO,
    PACKAGING: v.PACKAGING,
    COD_ARTICLE: v.ARTICLE || undefined,
    FREE: v.FREE,
    LOGISTICS: v.LOGISTICS,
    ...v.LOCAL,
  };
}

/** "HVE", "BIO", "HVE + BIO" ou "" */
export function logosLabel(g: { HVE: boolean; BIO: boolean }): string {
  return [g.HVE && "HVE", g.BIO && "BIO"].filter(Boolean).join(" + ");
}
