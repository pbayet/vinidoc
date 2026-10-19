import { useEffect, useMemo, useState } from "react";
import type { VinidocApi } from "../api/useVinidocApi";
import type {
  CheckReport,
  ContentSource,
  SheetListItem,
  SheetSnapshot,
  SheetVersion,
  Template,
} from "../../../entities/vinidoc/vinidoc.types";

interface GenerationSourceParams {
  api: VinidocApi;
  /** Vin sélectionné */
  sheet?: SheetListItem;
  lng: string;
  template?: Template;
}

export interface GenerationSource {
  /** Contenu qui sera injecté dans le modèle */
  content: SheetSnapshot | null;
  /** VALIDATED : dernière version validée ; CURRENT : saisie en cours */
  source: ContentSource | null;
  /** Version validée utilisée (null pour la saisie en cours) */
  version: SheetVersion | null;
  loadingContent: boolean;
  /** Langues présentes dans le contenu */
  availableLngs: string[];
  /** Contrôle des longueurs contenu × langue × modèle */
  check: CheckReport | null;
  checking: boolean;
}

/**
 * Même règle que l'API (`generate`) : une fiche au statut VALIDATED est
 * générée depuis sa dernière version validée ; sinon depuis la saisie en
 * cours (non validée par le marketing — non bloquant).
 */
export function contentSourceOf(sheet: SheetListItem): ContentSource {
  return sheet.STATUS === "VALIDATED" && sheet.LASTVER > 0
    ? "VALIDATED"
    : "CURRENT";
}

/**
 * Charge le contenu à générer pour le vin choisi puis contrôle
 * automatiquement ses textes face au modèle et à la langue sélectionnés.
 * Les requêtes devenues obsolètes (changement de sélection en cours de
 * chargement) sont ignorées.
 */
export function useGenerationSource({
  api,
  sheet,
  lng,
  template,
}: GenerationSourceParams): GenerationSource {
  const [content, setContent] = useState<SheetSnapshot | null>(null);
  const [version, setVersion] = useState<SheetVersion | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [check, setCheck] = useState<CheckReport | null>(null);
  const [checking, setChecking] = useState(false);

  const shtid = sheet?.SHTID;
  const source = sheet ? contentSourceOf(sheet) : null;
  const lastVer = sheet?.LASTVER;
  // Saisie en cours : rechargée à chaque modification de la fiche.
  const modDat = source === "CURRENT" ? sheet?.MODDAT : undefined;

  useEffect(() => {
    setContent(null);
    setVersion(null);
    if (!shtid || !source) return;
    let cancelled = false;
    setLoadingContent(true);

    const load: Promise<void> =
      source === "VALIDATED" && lastVer
        ? api.getVersion(shtid, lastVer).then((v) => {
            if (cancelled) return;
            setVersion(v);
            setContent(v.SNAPSHOT);
          })
        : api.getSheet(shtid).then((s) => {
            if (cancelled) return;
            setContent(s);
          });

    load
      .catch(() => undefined)
      .finally(() => !cancelled && setLoadingContent(false));
    return () => {
      cancelled = true;
    };
  }, [api, shtid, source, lastVer, modDat]);

  const availableLngs = useMemo(
    () => (content ? Object.keys(content.TRANSLATIONS) : []),
    [content],
  );

  const tplid = template?.TPLID;
  const lngAvailable = availableLngs.includes(lng);

  useEffect(() => {
    setCheck(null);
    if (!content || !source || !tplid || !lngAvailable) return;
    let cancelled = false;
    api
      .checkSheet(
        content.SHTID,
        { LNGCOD: lng, TPLID: tplid, SOURCE: source },
        { setLoading: setChecking, silentError: true },
      )
      .then((r) => !cancelled && setCheck(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, content, source, tplid, lng, lngAvailable]);

  return {
    content,
    source: content ? source : null,
    version,
    loadingContent,
    availableLngs,
    check,
    checking,
  };
}
