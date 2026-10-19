// -----------------------------------------
// Types de l'API VINIDOC (/api/vinidoc)
// -----------------------------------------
// Reflet des réponses du module backend modules/vinidoc (cf. son README).
// Les noms de champs sont ceux de l'API (majuscules, abréviations SQL) pour
// éviter toute couche de traduction entre le front et le back.

export type SheetStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
export type ColorCode = "ROUGE" | "ROSE" | "BLANC" | string;

export interface Rights {
  /** Saisie, traduction, soumission (œnologie) */
  EDIT: boolean;
  /** Validation / refus (marketing) */
  VALIDATE: boolean;
  /** Administration des modèles PowerPoint */
  TEMPLATES: boolean;
  /** Génération des fiches techniques */
  GENERATE: boolean;
}

export interface Language {
  LNGCOD: string;
  LNGNAM: string;
  ISDEFAULT: boolean;
  ACTIVE: boolean;
  SORTORD: number;
}

export interface ColorLabel {
  LABEL: string;
  /** Libellé de l'échelle bouche à 1 (léger / sec) */
  BOUMIN: string | null;
  /** Libellé de l'échelle bouche à 5 (puissant / doux / moelleux) */
  BOUMAX: string | null;
}

export interface Color {
  COLCOD: ColorCode;
  LABELS: Record<string, ColorLabel>;
}

export interface MeResponse {
  RIGHTS: Rights;
  DEFAULT_LNGCOD: string | null;
  LANGUAGES: Language[];
  COLORS: Color[];
}

/* ───────────────────────────── Balises ───────────────────────────── */

export interface TagLimit {
  TPLID: number;
  TPLNAM: string;
  MAXLEN: number | null;
  REQUIRED: boolean;
}

export interface TextMergeField {
  TAG: string;
  LABEL: string;
  TRANSLATED: boolean;
  /** Champ de traduction correspondant (DEGUST, TERROIR...) ou null */
  SHEETFIELD: TranslationField | null;
  /** Longueur max la plus stricte parmi les modèles actifs */
  MAXLEN: number | null;
  LIMITS: TagLimit[];
}

export interface MergeFields {
  TEXT: TextMergeField[];
  BADGES: { PATTERN: string; LABEL: string }[];
  IMAGES: { TAG: string; LABEL: string }[];
}

/* ───────────────────────────── Fiches ───────────────────────────── */

/** @deprecated Cépages désormais saisis en texte (traduction `CEPAGES`). */
export interface Grape {
  CEPAGE: string;
  PCT: number | null;
}

export const TRANSLATION_FIELDS = [
  "LIBELLE",
  "GARDE",
  "CEPAGES",
  "TERROIR",
  "VINIF",
  "DEGUST",
  "ACCORDS",
  "ACCEXPL",
] as const;

export type TranslationField = (typeof TRANSLATION_FIELDS)[number];

export type TranslationValues = Record<TranslationField, string | null>;

export interface Translation extends TranslationValues {
  MODUSR?: string;
  MODDAT?: string;
}

/** Champs communs à toutes les langues (saisie). */
export interface SheetCommon {
  CODVRAC: string;
  MILLESIME: number | null;
  APPELL: string;
  COLCOD: ColorCode;
  DESCVRAC: string | null;
  INTARO: number | null;
  INTBOU: number | null;
  ECHFRU: number | null;
  TEMPMIN: number | null;
  TEMPMAX: number | null;
}

export interface SheetEvent {
  EVTID: number;
  EVTTYP:
    | "CREATED"
    | "UPDATED"
    | "TRANSLATION_SAVED"
    | "TRANSLATION_DELETED"
    | "SUBMITTED"
    | "VALIDATED"
    | "REJECTED"
    | "DELETED";
  FROMSTS: SheetStatus | null;
  TOSTS: SheetStatus | null;
  LNGCOD: string | null;
  VERNUM: number | null;
  EVTUSR: string;
  EVTDAT: string;
  COMMENT: string | null;
}

export interface SheetVersionSummary {
  VERNUM: number;
  SUBUSR: string | null;
  VALUSR: string;
  VALDAT: string;
  COMMENT: string | null;
}

/** Contenu figé d'une version validée. */
export interface SheetSnapshot extends SheetCommon {
  SHTID: number;
  TRANSLATIONS: Record<string, TranslationValues>;
}

export interface SheetVersion extends SheetVersionSummary {
  SNAPSHOT: SheetSnapshot;
}

export interface Sheet extends SheetCommon {
  SHTID: number;
  STATUS: SheetStatus;
  LASTVER: number;
  CREUSR: string;
  CREDAT: string;
  MODUSR: string;
  MODDAT: string;
  SUBUSR: string | null;
  SUBDAT: string | null;
  ROWVER: string;
  TRANSLATIONS: Record<string, Translation>;
  EVENTS: SheetEvent[];
  VERSIONS: SheetVersionSummary[];
}

export interface SheetListItem {
  SHTID: number;
  CODVRAC: string;
  MILLESIME: number | null;
  APPELL: string;
  COLCOD: ColorCode;
  DESCVRAC: string | null;
  STATUS: SheetStatus;
  LASTVER: number;
  MODUSR: string;
  MODDAT: string;
  SUBUSR: string | null;
  SUBDAT: string | null;
  LIBELLE: string | null;
  LANGUAGES: string[];
  /**
   * Anomalies de saisie (données en cours) : traduction de la langue par
   * défaut absente, texte trop long ou balise obligatoire vide au regard des
   * modèles actifs. Vide = fiche conforme.
   */
  ISSUES: string[];
}

export interface SheetList {
  TOTAL: number;
  PAGE: number;
  PAGESIZE: number;
  ITEMS: SheetListItem[];
}

export interface SheetListFilters {
  SEARCH?: string;
  STATUS?: SheetStatus | "";
  COLCOD?: string;
  MILLESIME?: number | "";
  GENERABLE?: boolean;
  PAGE?: number;
  PAGESIZE?: number;
}

/** Réponse de POST /sheets/submit-all (soumission en masse). */
export interface BulkSubmitResult {
  SUBMITTED: { SHTID: number; CODVRAC: string; MILLESIME: number | null }[];
  /** Fiches non soumises : anomalies de saisie ou refus de l'API */
  ERRORS: { SHTID: number; CODVRAC: string; MILLESIME: number | null; MESSAGES: string[] }[];
}

/** Réponse de toute écriture sur une fiche. */
export interface SheetState {
  SHTID: number;
  STATUS: SheetStatus;
  LASTVER: number;
  ROWVER: string;
}

/* ───────────────────────────── Contrôle ───────────────────────────── */

export type TagIssue = "TOO_LONG" | "MISSING" | "UNKNOWN_TAG" | null;

export interface CheckedTag {
  TAGNAM: string;
  LENGTH: number;
  MAXLEN: number | null;
  REQUIRED: boolean;
  ISSUE: TagIssue;
}

export interface TemplateCheck {
  TPLID: number;
  TPLNAM: string;
  OK: boolean;
  TAGS: CheckedTag[];
  ERRORS: CheckedTag[];
}

export interface CheckReport {
  SHTID: number;
  SOURCE: "CURRENT" | "VALIDATED";
  VERNUM: number | null;
  LNGCOD: string;
  TRANSLATION_MISSING: boolean;
  OK: boolean;
  TEMPLATES: TemplateCheck[];
}

/* ───────────────────────────── Modèles ───────────────────────────── */

export type TagType = "TEXT" | "IMAGE" | "BADGE";

export interface TemplateTag {
  TAGTYP: TagType;
  TAGNAM: string;
  MAXLEN: number | null;
  REQUIRED: boolean;
  ISKNOWN: boolean;
}

export interface Template {
  TPLID: number;
  TPLKEY: string;
  TPLNAM: string;
  DESCR: string | null;
  LNGCOD: string | null;
  FILECODE: string;
  ACTIVE: boolean;
  CREUSR: string;
  CREDAT: string;
  MODUSR: string;
  MODDAT: string;
  ROWVER: string;
  ORIGINALNAME: string | null;
  RELATIVEPATH: string | null;
  SIZEBYTES: number | null;
  FILEURL: string | null;
  TEXTTAGS?: number;
  UNKNOWNTAGS?: number;
  TAGS?: TemplateTag[];
  WARNINGS?: string[];
  ADDEDTAGS?: { TAGTYP: TagType; TAGNAM: string }[];
  REMOVEDTAGS?: { TAGTYP: TagType; TAGNAM: string }[];
  /** Longueurs modifiées par les balises du nouveau fichier ({{TAG-250}}) */
  MAXLENTAGS?: { TAGTYP: TagType; TAGNAM: string; OLDMAXLEN: number | null; NEWMAXLEN: number }[];
}

/** Résultat de POST /templates/inspect (analyse d'un .pptx sans enregistrement). */
export interface TemplateInspection {
  /** MAXLEN : longueur saisie dans la balise du modèle ({{TAG-250}}), null sinon */
  TAGS: Omit<TemplateTag, "REQUIRED">[];
  /** Balises du fichier inconnues du catalogue (rendues vides) */
  UNKNOWN: { TAGTYP: TagType; TAGNAM: string }[];
  /** Balises du catalogue absentes du fichier */
  MISSING: { TAGTYP: TagType; TAGNAM: string; LABEL: string }[];
  /** Longueurs invalides ou contradictoires saisies dans les balises */
  LENGTHWARNINGS: string[];
  WARNINGS: string[];
}

/* ───────────────────────────── Génération ───────────────────────────── */

export type OutputFormat = "pdf" | "pptx";

/**
 * Contenu utilisé pour générer : dernière version validée (fiche au statut
 * VALIDATED) ou saisie en cours (fiche non validée par le marketing).
 */
export type ContentSource = "VALIDATED" | "CURRENT";

export interface GenerationResult {
  GENID: number;
  CREDAT: string;
  SHTID: number;
  /** null = saisie en cours (fiche non validée) */
  VERNUM: number | null;
  SOURCE: ContentSource;
  TPLID: number;
  LNGCOD: string;
  FORMAT: OutputFormat;
  HVE: boolean;
  BIO: boolean;
  FILECODE: string;
  ORIGINALNAME: string;
  URL: string;
  WARNINGS: string[];
}

export interface Generation {
  GENID: number;
  SHTID: number;
  CODVRAC: string;
  MILLESIME: number | null;
  /** null = saisie en cours (fiche non validée) */
  VERNUM: number | null;
  SOURCE: ContentSource;
  TPLID: number;
  TPLNAM: string;
  LNGCOD: string;
  FORMAT: OutputFormat;
  HVE: boolean;
  BIO: boolean;
  FILECODE: string;
  CREUSR: string;
  CREDAT: string;
  ORIGINALNAME: string | null;
  SIZEBYTES: number | null;
  URL: string | null;
}
