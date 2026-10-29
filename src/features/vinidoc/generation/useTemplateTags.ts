import { useEffect, useState } from "react";
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
 * pas leurs balises, chargées avec le détail du modèle. Réponse d'un modèle
 * précédent (changement en cours de chargement) ignorée.
 */
export function useTemplateTags(api: VinidocApi, TPLID?: number) {
  const [info, setInfo] = useState<TemplateTagsInfo>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInfo(EMPTY);
    if (!TPLID) return;
    let cancelled = false;
    setLoading(true);
    api
      .getTemplate(TPLID, { silentError: true })
      .then((t) => {
        if (cancelled) return;
        const tags = t.TAGS ?? [];
        setInfo({
          freeTags: freeTagsOf(tags),
          photoFrame: tags.some(
            (g) => g.TAGTYP === "IMAGE" && g.TAGNAM === "BOTTLEPHOTO",
          ),
          logisticsTags: tags
            .filter((g) => g.TAGTYP === "TEXT" && g.TAGNAM.startsWith("LOG."))
            .map((g) => g.TAGNAM),
        });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, TPLID]);

  return { ...info, loading };
}
