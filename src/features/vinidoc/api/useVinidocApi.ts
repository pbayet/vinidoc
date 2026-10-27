import { useMemo } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest, type RequestOptions } from "../../../app/api/api";
import type {
  BulkSubmitResult,
  CheckReport,
  Generation,
  GenerationResult,
  MeResponse,
  MergeFields,
  OutputFormat,
  Sheet,
  SheetCommon,
  SheetList,
  SheetListFilters,
  SheetState,
  SheetVersion,
  SheetVersionSummary,
  Template,
  TemplateInspection,
  TemplatePreview,
  TagType,
  TranslationValues,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Client de l'API /vinidoc
// -----------------------------------------
// Un seul point d'entrée pour toutes les routes du module : chaque méthode
// injecte le token courant et renvoie directement `data`. En cas d'erreur,
// `apiRequest` affiche déjà le toast (cf. useApiMessage) puis rejette : les
// appelants n'ont qu'à interrompre leur traitement (try/catch ou .catch()).

const BASE = "vinidoc";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Params = Record<string, unknown>;

/**
 * `apiRequest` refuse les `undefined` dans un corps JSON, et sérialise `null`
 * en "null" dans une query string : on nettoie selon le contexte.
 */
function clean(params: Params, forQuery: boolean): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (forQuery && (value === null || value === "")) continue;
    out[key] = value as Json;
  }
  return out;
}

/** Champs multipart : uniquement des primitives (les vides sont envoyés en ""). */
function multipartFields(params: Params): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    out[key] = value === null ? "" : (value as string | number | boolean);
  }
  return out;
}

export interface RequestExtras {
  setLoading?: (loading: boolean) => void;
  successMessage?: string;
  silentError?: boolean;
}

export function createVinidocApi(token: string | undefined) {
  async function call<R>(
    endpoint: string,
    method: RequestOptions["method"],
    params: Params = {},
    extras: RequestExtras = {},
    files?: Record<string, File[]>,
  ): Promise<R> {
    const isQuery = method === "GET" || method === "DELETE";
    const options: RequestOptions<R> = {
      endpoint: `${BASE}/${endpoint}`,
      method,
      token,
      noStore: true,
      ...extras,
    };
    if (files) {
      options.params = multipartFields(params);
      options.files = files;
    } else {
      // `null` est accepté à l'exécution (JSON) mais absent du type du package.
      options.params = clean(params, isQuery) as RequestOptions["params"];
    }
    const res = await apiRequest<R>(options);
    return res.data as R;
  }

  return {
    /* Référentiels */
    getMe: (x?: RequestExtras) => call<MeResponse>("me", "GET", {}, x),
    getMergeFields: (LNGCOD?: string, x?: RequestExtras) =>
      call<MergeFields>("merge-fields", "GET", { LNGCOD }, x),

    /* Fiches */
    listSheets: (filters: SheetListFilters, x?: RequestExtras) =>
      call<SheetList>("sheets", "GET", { ...filters }, x),
    getSheet: (SHTID: number, x?: RequestExtras) => call<Sheet>(`sheets/${SHTID}`, "GET", {}, x),
    createSheet: (
      body: SheetCommon & { TRANSLATION?: Partial<TranslationValues> },
      x?: RequestExtras,
    ) => call<SheetState>("sheets", "POST", { ...body }, x),
    updateSheet: (SHTID: number, body: SheetCommon & { ROWVER: string }, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}`, "PUT", { ...body }, x),
    deleteSheet: (SHTID: number, ROWVER: string, COMMENT?: string, x?: RequestExtras) =>
      call<{ SHTID: number; DELETED: boolean }>(`sheets/${SHTID}`, "DELETE", { ROWVER, COMMENT }, x),
    setDefaultTemplate: (SHTID: number, DEFTPLID: number | null, ROWVER: string, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}/default-template`, "PUT", { DEFTPLID, ROWVER }, x),
    saveTranslation: (
      SHTID: number,
      LNGCOD: string,
      body: Partial<TranslationValues> & { ROWVER: string },
      x?: RequestExtras,
    ) => call<SheetState>(`sheets/${SHTID}/translations/${LNGCOD}`, "PUT", { ...body }, x),
    deleteTranslation: (SHTID: number, LNGCOD: string, ROWVER: string, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}/translations/${LNGCOD}`, "DELETE", { ROWVER }, x),

    /* Workflow */
    submitSheet: (SHTID: number, ROWVER: string, COMMENT?: string, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}/submit`, "POST", { ROWVER, COMMENT }, x),
    submitAllSheets: (
      body: { SEARCH?: string; COLCOD?: string; MILLESIME?: number; COMMENT?: string },
      x?: RequestExtras,
    ) => call<BulkSubmitResult>("sheets/submit-all", "POST", { ...body }, x),
    validateSheet: (SHTID: number, ROWVER: string, COMMENT?: string, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}/validate`, "POST", { ROWVER, COMMENT }, x),
    rejectSheet: (SHTID: number, ROWVER: string, COMMENT: string, x?: RequestExtras) =>
      call<SheetState>(`sheets/${SHTID}/reject`, "POST", { ROWVER, COMMENT }, x),

    /* Versions & contrôle */
    getVersions: (SHTID: number, x?: RequestExtras) =>
      call<SheetVersionSummary[]>(`sheets/${SHTID}/versions`, "GET", {}, x),
    getVersion: (SHTID: number, VERNUM: number, x?: RequestExtras) =>
      call<SheetVersion>(`sheets/${SHTID}/versions/${VERNUM}`, "GET", {}, x),
    checkSheet: (
      SHTID: number,
      body: { LNGCOD: string; TPLID?: number; SOURCE?: "CURRENT" | "VALIDATED" },
      x?: RequestExtras,
    ) => call<CheckReport>(`sheets/${SHTID}/check`, "POST", { ...body }, x),

    /* Modèles */
    listTemplates: (filters: { ACTIVE?: boolean; LNGCOD?: string } = {}, x?: RequestExtras) =>
      call<Template[]>("templates", "GET", { ...filters }, x),
    getTemplate: (TPLID: number, x?: RequestExtras) => call<Template>(`templates/${TPLID}`, "GET", {}, x),
    createTemplate: (
      body: { TPLNAM: string; DESCR?: string | null; LNGCOD?: string | null },
      file: File,
      x?: RequestExtras,
    ) => call<Template>("templates", "POST", { ...body }, x, { file: [file] }),
    inspectTemplate: (file: File, x?: RequestExtras) =>
      call<TemplateInspection>("templates/inspect", "POST", {}, x, { file: [file] }),
    updateTemplate: (
      TPLID: number,
      body: { TPLNAM: string; DESCR: string | null; LNGCOD: string | null; ACTIVE: boolean; ROWVER: string },
      x?: RequestExtras,
    ) => call<Template>(`templates/${TPLID}`, "PUT", { ...body }, x),
    replaceTemplateFile: (TPLID: number, file: File, x?: RequestExtras) =>
      call<Template>(`templates/${TPLID}/file`, "PUT", {}, x, { file: [file] }),
    setTemplateTags: (
      TPLID: number,
      TAGS: { TAGTYP: TagType; TAGNAM: string; MAXLEN: number | null; REQUIRED: boolean }[],
      x?: RequestExtras,
    ) => call<Template>(`templates/${TPLID}/tags`, "PUT", { TAGS }, x),
    previewTemplate: (TPLID: number, x?: RequestExtras) =>
      call<TemplatePreview>(`templates/${TPLID}/preview`, "GET", {}, x),
    deleteTemplate: (TPLID: number, x?: RequestExtras) =>
      call<{ TPLID: number; DELETED: boolean }>(`templates/${TPLID}`, "DELETE", {}, x),

    /* Génération */
    generate: (
      body: {
        SHTID: number;
        TPLID: number;
        LNGCOD: string;
        FORMAT: OutputFormat;
        HVE: boolean;
        BIO: boolean;
      },
      photo?: File | null,
      x?: RequestExtras,
    ) =>
      photo
        ? call<GenerationResult>("generate", "POST", { ...body }, x, { photo: [photo] })
        : call<GenerationResult>("generate", "POST", { ...body }, x),
    listGenerations: (filters: { SHTID?: number; TPLID?: number; LIMIT?: number } = {}, x?: RequestExtras) =>
      call<Generation[]>("generations", "GET", { ...filters }, x),
  };
}

export type VinidocApi = ReturnType<typeof createVinidocApi>;

/** Client lié au token de l'utilisateur connecté. */
export function useVinidocApi(): VinidocApi {
  const { jwtPayload } = useAuth();
  const token = jwtPayload.$token;
  return useMemo(() => createVinidocApi(token), [token]);
}
