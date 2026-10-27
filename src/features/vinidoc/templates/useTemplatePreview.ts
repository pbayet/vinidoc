import { useState } from "react";
import { useFileViewer } from "@uvcdr/custom-form-system";
import { useVinidocApi } from "../api/useVinidocApi";

/**
 * Aperçu PDF d'un modèle PowerPoint, rempli de faux texte à la longueur max
 * de chaque balise (cf. GET /templates/:TPLID/preview), ouvert dans la
 * liseuse : `{viewer.viewerProps && <FileViewerModal {...viewer.viewerProps} />}`.
 *
 * La première demande convertit le modèle (quelques secondes) ; les
 * suivantes réutilisent le PDF mis en cache par l'API.
 */
export function useTemplatePreview() {
  const api = useVinidocApi();
  const viewer = useFileViewer();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const open = async (TPLID: number) => {
    setLoadingId(TPLID);
    try {
      const preview = await api.previewTemplate(TPLID);
      viewer.open(
        [
          {
            name: preview.ORIGINALNAME,
            url: preview.URL,
            type: "application/pdf",
          },
        ],
        0,
      );
    } catch {
      /* toast déjà affiché (fichier absent, conversion PDF...) */
    } finally {
      setLoadingId(null);
    }
  };

  return { open, loadingId, viewer };
}
