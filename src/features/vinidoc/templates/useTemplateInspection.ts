import { useEffect, useState } from "react";
import { useVinidocApi } from "../api/useVinidocApi";
import type { TemplateInspection } from "../../../entities/vinidoc/vinidoc.types";

export interface TemplateInspectionState {
  loading: boolean;
  result: TemplateInspection | null;
  /** Fichier refusé par l'API (pptx illisible, sans diapositive…) — toast déjà affiché */
  failed: boolean;
}

const IDLE: TemplateInspectionState = { loading: false, result: null, failed: false };

/**
 * Analyse le .pptx dès qu'il est choisi (POST /templates/inspect, rien n'est
 * enregistré). Une réponse arrivée après un changement de fichier est ignorée.
 */
export function useTemplateInspection(file: File | null): TemplateInspectionState {
  const api = useVinidocApi();
  const [state, setState] = useState<TemplateInspectionState>(IDLE);

  useEffect(() => {
    if (!file) {
      setState(IDLE);
      return;
    }
    let stale = false;
    setState({ loading: true, result: null, failed: false });
    api
      .inspectTemplate(file)
      .then((result) => !stale && setState({ loading: false, result, failed: false }))
      .catch(() => !stale && setState({ loading: false, result: null, failed: true }));
    return () => {
      stale = true;
    };
  }, [api, file]);

  return state;
}
