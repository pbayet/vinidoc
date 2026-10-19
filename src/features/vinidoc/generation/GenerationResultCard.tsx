import React, { useEffect } from "react";
import {
  FileAttachmentCards,
  FileViewerModal,
  Icon,
  useFileViewer,
} from "@uvcdr/custom-form-system";
import { useVinidoc } from "../context/VinidocContext";
import { formatDateTime, languageName } from "../lib/format";
import { toViewerFile } from "./generationValues";
import type { GenerationResult } from "../../../entities/vinidoc/vinidoc.types";

/** Fichier tout juste généré : ouverture dans la liseuse + avertissements éventuels. */
const GenerationResultCard: React.FC<{ result: GenerationResult }> = ({
  result,
}) => {
  const { languages } = useVinidoc();
  const viewer = useFileViewer();
  const { open } = viewer;

  // Aperçu ouvert automatiquement à chaque nouvelle génération.
  useEffect(() => {
    if (result.URL) open([toViewerFile(result)], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.GENID, open]);

  return (
    <div className="vd-generated" role="status">
      <div className="vd-generated__title">
        <Icon iconName="circle-check" /> Fiche générée
      </div>
      <FileAttachmentCards files={[toViewerFile(result)]} />
      <span className="vd-muted">
        {result.VERNUM != null ? `Version v${result.VERNUM}` : "Saisie en cours"}{" "}
        · {languageName(languages, result.LNGCOD)} ·{" "}
        {formatDateTime(result.CREDAT)}
      </span>
      {result.VERNUM == null && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Contenu non validé par le
          marketing.
        </div>
      )}
      {result.WARNINGS.map((w) => (
        <div key={w} className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> {w}
        </div>
      ))}
      {viewer.viewerProps && <FileViewerModal {...viewer.viewerProps} />}
    </div>
  );
};

export default GenerationResultCard;
