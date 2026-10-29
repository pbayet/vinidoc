import { useState } from "react";
import { useFileViewer } from "@uvcdr/custom-form-system";
import { isApiError } from "@uvcdr/api-auth-system";
import { useNotification } from "@uvcdr/confirm-notify-system";
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
  const { notifyError } = useNotification();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const open = async (TPLID: number) => {
    setLoadingId(TPLID);
    try {
      const preview = await api.previewTemplate(TPLID);
      if (!preview?.URL) {
        throw new Error(
          `Réponse d'aperçu sans URL : ${JSON.stringify(preview)}`,
        );
      }
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
    } catch (err) {
      // Erreur d'API : toast déjà affiché (fichier absent, conversion PDF...).
      // Toute autre erreur (réponse inattendue...) est signalée ici.
      if (!isApiError(err)) {
        console.error("[VINIDOC] Aperçu du modèle", TPLID, err);
        notifyError(
          "Impossible d'ouvrir l'aperçu du modèle.",
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  return { open, loadingId, viewer };
}
