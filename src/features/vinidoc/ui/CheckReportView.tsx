import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type { CheckReport } from "../../../entities/vinidoc/vinidoc.types";

interface CheckReportViewProps {
  report: CheckReport;
  /** N'affiche que les balises en erreur (vue compacte) */
  errorsOnly?: boolean;
}

const ISSUE_LABELS = {
  TOO_LONG: "Trop long",
  MISSING: "Obligatoire, vide",
  UNKNOWN_TAG: "Balise inconnue (rendue vide)",
} as const;

/** Résultat du contrôle d'une fiche face aux modèles (longueurs, obligatoires). */
const CheckReportView: React.FC<CheckReportViewProps> = ({ report, errorsOnly = false }) => {
  if (report.TEMPLATES.length === 0) {
    return <p className="vd-muted">Aucun modèle actif n'est utilisable dans cette langue.</p>;
  }

  return (
    <div className="vd-check">
      {report.TRANSLATION_MISSING && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Aucun texte dans la langue {report.LNGCOD.toUpperCase()} : les
          champs traduits seront vides.
        </div>
      )}
      {report.TEMPLATES.map((tpl) => {
        const tags = errorsOnly ? tpl.ERRORS : tpl.TAGS;
        return (
          <div key={tpl.TPLID} className={`vd-check__template${tpl.OK ? " vd-check__template--ok" : " vd-check__template--ko"}`}>
            <div className="vd-check__title">
              <Icon iconName={tpl.OK ? "circle-check" : "circle-xmark"} />
              <strong>{tpl.TPLNAM}</strong>
              <span>{tpl.OK ? "conforme" : `${tpl.ERRORS.length} problème(s)`}</span>
            </div>
            {tags.length > 0 && (
              <table className="vd-table vd-table--compact">
                <thead>
                  <tr>
                    <th>Balise</th>
                    <th className="vd-num">Longueur</th>
                    <th className="vd-num">Max</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((t) => (
                    <tr key={t.TAGNAM} className={t.ISSUE && t.ISSUE !== "UNKNOWN_TAG" ? "vd-row--error" : ""}>
                      <td>
                        <code>{`{{${t.TAGNAM}}}`}</code>
                        {t.REQUIRED && <span className="vd-required" title="Obligatoire">*</span>}
                      </td>
                      <td className="vd-num">{t.LENGTH}</td>
                      <td className="vd-num">{t.MAXLEN ?? "—"}</td>
                      <td>{t.ISSUE ? ISSUE_LABELS[t.ISSUE] : "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CheckReportView;
