import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectOption } from "@uvcdr/custom-form-system";
import type { VinidocApi } from "../api/useVinidocApi";
import type {
  Article,
  ArticleSummary,
  SheetStatus,
} from "../../../entities/vinidoc/vinidoc.types";

/** Libellé d'un article PFI dans la liste : code — libellé (millésime). */
export function articleLabel(a: ArticleSummary): string {
  const name = a.LIBELLE_COURT ?? a.LIBELLE ?? "";
  return `${a.COD_ARTICLE}${name ? ` — ${name}` : ""}${a.MILLESIME ? ` (${a.MILLESIME})` : ""}`;
}

/** Mention ajoutée au libellé d'un article dont aucun code vrac n'a de fiche. */
export const NO_SHEET_SUFFIX = " — aucune fiche œnologique";

/**
 * Article PFI choisi à la génération (DWH) : recherche pour le select
 * (`loadOptions`) et détail de l'article sélectionné (fiches de ses codes
 * vrac, données logistiques). Les réponses obsolètes sont ignorées.
 *
 * Sans recherche, l'API ne propose que des PFI ayant une fiche œnologique ;
 * avec recherche, tous les PFI correspondants : ceux dont aucun code vrac
 * n'a de fiche (`noSheet` : COD_ARTICLE → codes vrac) ne sont pas
 * sélectionnables (cf. GenerationForm). Si la fiche a disparu entre-temps
 * (SHEETS vide), le libellé de la valeur choisie le signale. Les PFI dont la
 * fiche n'est pas validée par le marketing sont repérés (`unvalidated` :
 * COD_ARTICLE → statut de la fiche) pour un badge dans la liste.
 *
 * `prefilter` : recherche appliquée tant que rien n'est tapé (ex. code vrac
 * du vin ouvert par l'URL `?sheet=` : seuls ses PFI sont proposés).
 */
export function useArticle(api: VinidocApi, code: string, prefilter = "") {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  // Libellés des articles déjà proposés : affichage de la valeur choisie.
  const labels = useRef(new Map<string, string>());
  const [noSheet, setNoSheet] = useState<ReadonlyMap<string, string[]>>(
    new Map(),
  );
  const [unvalidated, setUnvalidated] = useState<
    ReadonlyMap<string, SheetStatus>
  >(new Map());

  const loadOptions = useCallback(
    async (search: string): Promise<SelectOption[]> => {
      const found = await api.searchArticles(search.trim() || prefilter, {
        silentError: true,
      });
      const missing = found.filter((a) => a.HASSHEET === false);
      if (missing.length) {
        setNoSheet((prev) => {
          const next = new Map(prev);
          for (const a of missing) next.set(a.COD_ARTICLE, a.CODVRACS);
          return next;
        });
      }
      setUnvalidated((prev) => {
        const next = new Map(prev);
        for (const a of found) {
          if (a.SHEETSTATUS && a.SHEETSTATUS !== "VALIDATED")
            next.set(a.COD_ARTICLE, a.SHEETSTATUS);
          else next.delete(a.COD_ARTICLE);
        }
        return next;
      });
      return found.map((a) => {
        const label = articleLabel(a);
        labels.current.set(a.COD_ARTICLE, label);
        return {
          type: "option",
          value: a.COD_ARTICLE,
          label,
          keywords: [a.LIBELLE ?? "", ...a.CODVRACS, a.STATUT ?? ""],
        };
      });
    },
    [api, prefilter],
  );

  useEffect(() => {
    setArticle(null);
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    api
      .getArticle(code)
      .then((a) => {
        if (cancelled) return;
        labels.current.set(
          a.COD_ARTICLE,
          articleLabel(a) + (a.SHEETS.length ? "" : NO_SHEET_SUFFIX),
        );
        setArticle(a);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, code]);

  /** Option de la valeur choisie (le select n'affiche que ses `options`). */
  const selectedOption: SelectOption[] = code
    ? [
        {
          type: "option",
          value: code,
          label: labels.current.get(code) ?? code,
        },
      ]
    : [];

  return {
    article,
    loading,
    loadOptions,
    selectedOption,
    noSheet,
    unvalidated,
  };
}
