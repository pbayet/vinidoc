import { useQuery } from "@uvcdr/data-query";
import type { VinidocApi } from "../api/useVinidocApi";
import type { TemplateTag } from "../../../entities/vinidoc/vinidoc.types";
import { freeTagsOf } from "./generationValues";

export interface TemplateTagsInfo {
  /** Champs libres {{FREE.*}} à saisir */
  freeTags: TemplateTag[];
  /** Le modèle a un cadre photo (img:BOTTLEPHOTO) */
  photoFrame: boolean;
  /** Balises logistiques {{LOG.*}} utilisées par le modèle */
  logisticsTags: string[];
}

const EMPTY: TemplateTagsInfo = {
  freeTags: [],
  photoFrame: false,
  logisticsTags: [],
};

/**
 * Balises du modèle choisi utiles au formulaire de génération : champs
 * libres, cadre photo, balises logistiques. La liste des modèles ne contient
 * pas leurs balises, chargées avec le détail du modèle.
 *
 * Chargement et cache par @uvcdr/data-query (clé par modèle) : la réponse
 * d'un modèle précédent (changement en cours de chargement) est ignorée, et
 * revenir sur un modèle déjà chargé l'affiche aussitôt (puis le recharge).
 * Erreur non bloquante : le formulaire s'affiche sans ces balises.
 */
export function useTemplateTags(api: VinidocApi, TPLID?: number) {
  const { data, isLoading } = useQuery({
    queryKey: ["vinidoc/template-tags", TPLID],
    queryFn: () => api.getTemplate(TPLID!, { silentError: true }),
    enabled: !!TPLID,
    retry: false,
    select: (t): TemplateTagsInfo => {
      const tags = t.TAGS ?? [];
      return {
        freeTags: freeTagsOf(tags),
        photoFrame: tags.some(
          (g) => g.TAGTYP === "IMAGE" && g.TAGNAM === "BOTTLEPHOTO",
        ),
        logisticsTags: tags
          .filter((g) => g.TAGTYP === "TEXT" && g.TAGNAM.startsWith("LOG."))
          .map((g) => g.TAGNAM),
      };
    },
  });

  return { ...(TPLID && data ? data : EMPTY), loading: !!TPLID && isLoading };
}
