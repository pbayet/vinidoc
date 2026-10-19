import type { ExistingFile, SelectOption } from "@uvcdr/custom-form-system";
import type { Language, Template } from "../../../entities/vinidoc/vinidoc.types";

/** Options de langue d'un modèle (valeur vide = toutes les langues). */
export function languageOptions(languages: Language[]): SelectOption[] {
  return languages.map((l) => ({ type: "option", value: l.LNGCOD, label: `${l.LNGNAM} (${l.LNGCOD.toUpperCase()})` }));
}

export function templateLanguageLabel(languages: Language[], code: string | null): string {
  if (!code) return "Toutes langues";
  return languages.find((l) => l.LNGCOD === code)?.LNGNAM ?? code.toUpperCase();
}

/** Fichier .pptx d'un modèle → pièce jointe pour la liseuse (FileAttachmentCards / FileViewerModal). */
export function toTemplateViewerFile(t: Pick<Template, "FILECODE" | "ORIGINALNAME" | "SIZEBYTES"> & { FILEURL: string }): ExistingFile {
  return {
    name: t.ORIGINALNAME ?? "modèle.pptx",
    url: t.FILEURL,
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: t.SIZEBYTES ?? undefined,
    filecode: t.FILECODE,
  };
}
