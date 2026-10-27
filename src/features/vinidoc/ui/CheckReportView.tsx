import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type {
  CheckReport,
  CheckedTag,
  TagIssue,
} from "../../../entities/vinidoc/vinidoc.types";

interface CheckReportViewProps {
  report: CheckReport;
  /** N'affiche que les balises en erreur (vue compacte) */
  errorsOnly?: boolean;
}

const ISSUE_META: Record<
  NonNullable<TagIssue>,
  { label: string; chip: string; icon: string }
> = {
  TOO_LONG: { label: "Trop long", chip: "danger", icon: "circle-xmark" },
  MISSING: { label: "Obligatoire, vide", chip: "danger", icon: "circle-xmark" },
  UNKNOWN_TAG: {
    label: "Inconnue (rendue vide)",
    chip: "warning",
    icon: "circle-question",
  },
};

/** Erreurs bloquantes d'abord, puis balises inconnues, puis conformes. */
const issueRank = (t: CheckedTag) =>
  !t.ISSUE ? 2 : t.ISSUE === "UNKNOWN_TAG" ? 1 : 0;

/** Longueur saisie face au maximum du modèle : « 123 / 250 » + jauge. */
const LengthGauge: React.FC<{ tag: CheckedTag }> = ({ tag }) => {
  if (tag.MAXLEN == null) {
    return (
      <span className="vd-gauge__value">
        {tag.LENGTH} <span className="vd-muted">/ illimité</span>
      </span>
    );
  }
  const ratio = tag.LENGTH / tag.MAXLEN;
  const level = ratio > 1 ? "over" : ratio >= 0.9 ? "near" : "ok";
  return (
    <div className="vd-gauge">
      <span className="vd-gauge__value">
        <strong>{tag.LENGTH}</strong> / {tag.MAXLEN}
      </span>
      <span className="vd-gauge__track" aria-hidden>
        <span
          className={`vd-gauge__bar vd-gauge__bar--${level}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </span>
    </div>
  );
};

/** Résultat du contrôle d'une fiche face aux modèles (longueurs, obligatoires). */
const CheckReportView: React.FC<CheckReportViewProps> = ({
  report,
  errorsOnly = false,
}) => {
  if (report.TEMPLATES.length === 0) {
    return (
      <p className="vd-muted">
        Aucun modèle actif n'est utilisable dans cette langue.
      </p>
    );
  }

  const multiple = report.TEMPLATES.length > 1;
  const failing = report.TEMPLATES.filter((t) => !t.OK).length;

  return (
    <div className="vd-check">
      {multiple && (
        <div className="vd-check__summary">
          <strong>{report.TEMPLATES.length} modèles contrôlés</strong>
          {failing > 0 && (
            <span className="vd-chip vd-chip--danger">
              <Icon iconName="circle-xmark" />
              {failing} non conforme{failing > 1 ? "s" : ""}
            </span>
          )}
          {report.TEMPLATES.length - failing > 0 && (
            <span className="vd-chip vd-chip--success">
              <Icon iconName="circle-check" />
              {report.TEMPLATES.length - failing} conforme
              {report.TEMPLATES.length - failing > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      {report.TRANSLATION_MISSING && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Aucun texte dans la langue{" "}
          {report.LNGCOD.toUpperCase()} : les champs traduits seront vides.
        </div>
      )}
      {report.TEMPLATES.map((tpl) => {
        const tags = [...(errorsOnly ? tpl.ERRORS : tpl.TAGS)].sort(
          (a, b) => issueRank(a) - issueRank(b),
        );
        return (
          // Plusieurs modèles : seuls les non conformes sont dépliés.
          <details
            key={tpl.TPLID}
            open={!multiple || !tpl.OK}
            className={`vd-check__template vd-check__template--${tpl.OK ? "ok" : "ko"}`}
          >
            <summary className="vd-check__title">
              <Icon iconName="chevron-right" className="vd-check__chevron" />
              <Icon
                iconName={tpl.OK ? "circle-check" : "circle-xmark"}
                className="vd-check__status"
              />
              <strong>{tpl.TPLNAM}</strong>
              <span>
                {tpl.OK
                  ? `conforme — ${tpl.TAGS.length} balise(s)`
                  : `${tpl.ERRORS.length} problème(s) sur ${tpl.TAGS.length} balise(s)`}
              </span>
            </summary>
            {tags.length > 0 && (
              <div className="vd-table-wrapper vd-check__body">
                <table className="vd-table vd-table--compact vd-check__table">
                  <colgroup>
                    <col className="vd-check__col-tag" />
                    <col className="vd-check__col-required" />
                    <col className="vd-check__col-length" />
                    <col className="vd-check__col-state" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Balise</th>
                      <th className="vd-center">Obligatoire</th>
                      <th>Longueur / max</th>
                      <th>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((t) => {
                      const meta = t.ISSUE ? ISSUE_META[t.ISSUE] : null;
                      return (
                        <tr
                          key={t.TAGNAM}
                          className={
                            meta
                              ? meta.chip === "danger"
                                ? "vd-row--error"
                                : "vd-row--warning"
                              : ""
                          }
                        >
                          <td>
                            <code>{`{{${t.TAGNAM}}}`}</code>
                          </td>
                          <td className="vd-center">
                            {t.REQUIRED ? (
                              <Icon iconName="check" />
                            ) : (
                              <span className="vd-muted">—</span>
                            )}
                          </td>
                          <td>
                            <LengthGauge tag={t} />
                          </td>
                          <td>
                            <span
                              className={`vd-chip vd-chip--${meta?.chip ?? "success"}`}
                            >
                              <Icon iconName={meta?.icon ?? "circle-check"} />
                              {meta?.label ?? "OK"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
};

export default CheckReportView;
