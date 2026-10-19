import type { ExistingFile } from "@uvcdr/custom-form-system";
import type { OutputFormat } from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Génération d'une fiche technique — logique du formulaire CustomForm
// -----------------------------------------
// Valeurs "formulaire" (identifiants en chaînes pour les CustomFormSelect),
// constantes d'affichage et conversion vers le corps attendu par l'API.
// Rendu : ./GenerationForm.tsx

export const PHOTO_MAX_SIZE = 15 * 1024 * 1024;
export const PHOTO_ACCEPT = ".png,.jpg,.jpeg,.webp";

export type GenerationFormValues = {
  SHTID: string;
  LNGCOD: string;
  TPLID: string;
  FORMAT: OutputFormat;
  PHOTO: File | null;
  HVE: boolean;
  BIO: boolean;
};

export function initialGenerationValues(
  sheetId: string,
  lng: string,
): GenerationFormValues {
  return {
    SHTID: sheetId,
    LNGCOD: lng,
    TPLID: "",
    FORMAT: "pdf",
    PHOTO: null,
    HVE: false,
    BIO: false,
  };
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

/** Valeurs du formulaire → corps de `POST generate` (hors photo). */
export function toGenerateRequest(v: GenerationFormValues) {
  return {
    SHTID: Number(v.SHTID),
    TPLID: Number(v.TPLID),
    LNGCOD: v.LNGCOD,
    FORMAT: v.FORMAT,
    HVE: v.HVE,
    BIO: v.BIO,
  };
}

/** "HVE", "BIO", "HVE + BIO" ou "" */
export function logosLabel(g: { HVE: boolean; BIO: boolean }): string {
  return [g.HVE && "HVE", g.BIO && "BIO"].filter(Boolean).join(" + ");
}
