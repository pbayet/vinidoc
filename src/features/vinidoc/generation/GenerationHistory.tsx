import React, { useMemo } from "react";
import {
  FileViewerModal,
  Icon,
  useFileViewer,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import { useVinidoc } from "../context/VinidocContext";
import {
  formatBytes,
  formatDateTime,
  languageName,
  sheetTitle,
} from "../lib/format";
import { FORMAT_META, logosLabel, toViewerFile } from "./generationValues";
import type { Generation } from "../../../entities/vinidoc/vinidoc.types";

interface GenerationHistoryProps {
  history: Generation[];
  /** Code vrac du vin filtré (sinon : toutes les générations) */
  sheetCode?: string;
}

/** Dernières fiches générées (toutes, ou celles du vin sélectionné). */
const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  history,
  sheetCode,
}) => {
  const { languages } = useVinidoc();
  const viewer = useFileViewer();

  // Fichiers encore disponibles : navigation précédent/suivant dans la liseuse.
  const files = useMemo(
    () =>
      history.flatMap((g) =>
        g.URL
          ? [{ GENID: g.GENID, file: toViewerFile({ ...g, URL: g.URL }) }]
          : [],
      ),
    [history],
  );

  const openFile = (genId: number) => {
    const index = files.findIndex((f) => f.GENID === genId);
    if (index >= 0) viewer.open(files.map((f) => f.file), index);
  };

  return (
    <CustomFormSection
      title={`Dernières générations (${history.length})`}
      icon={<Icon iconName="clock-rotate-left" />}
      description={
        sheetCode
          ? `Fichiers générés pour ${sheetCode}.`
          : "Tous vins confondus."
      }
    >
      {history.length === 0 ? (
        <div className="section-placeholder">Aucune fiche générée.</div>
      ) : (
        <div className="vd-table-wrapper">
          <table className="vd-table vd-history">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Vin</th>
                <th>Modèle</th>
                <th>Langue</th>
                <th>Logos</th>
                <th>Généré le</th>
                <th>Par</th>
              </tr>
            </thead>
            <tbody>
              {history.map((g) => {
                const format = FORMAT_META[g.FORMAT];
                const logos = logosLabel(g);
                return (
                  <tr key={g.GENID}>
                    <td>
                      {g.URL ? (
                        <button
                          type="button"
                          onClick={() => openFile(g.GENID)}
                          className="vd-link vd-history__file"
                          title={`Ouvrir (${format.label})`}
                        >
                          <Icon iconName={format.icon} />
                          <span className="vd-ellipsis">
                            {g.ORIGINALNAME ?? format.label}
                          </span>
                          {g.SIZEBYTES ? (
                            <span className="vd-history__size">
                              {formatBytes(g.SIZEBYTES)}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <span className="vd-history__file vd-muted">
                          <Icon iconName={format.icon} /> Fichier supprimé
                        </span>
                      )}
                    </td>
                    <td>
                      {sheetTitle(g)}{" "}
                      {g.VERNUM != null ? (
                        <span className="vd-chip vd-chip--muted">
                          v{g.VERNUM}
                        </span>
                      ) : (
                        <span
                          className="vd-chip vd-chip--warning"
                          title="Générée depuis la saisie en cours, non validée par le marketing"
                        >
                          Non validée
                        </span>
                      )}
                    </td>
                    <td>{g.TPLNAM}</td>
                    <td>
                      <span
                        className="vd-chip"
                        title={languageName(languages, g.LNGCOD)}
                      >
                        {g.LNGCOD.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {logos ? (
                        <span className="vd-chip vd-chip--success">
                          {logos}
                        </span>
                      ) : (
                        <span className="vd-muted">—</span>
                      )}
                    </td>
                    <td className="vd-history__date">
                      {formatDateTime(g.CREDAT)}
                    </td>
                    <td className="vd-muted">{g.CREUSR}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {viewer.viewerProps && <FileViewerModal {...viewer.viewerProps} />}
    </CustomFormSection>
  );
};

export default GenerationHistory;
