import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type { TagType } from "../../../entities/vinidoc/vinidoc.types";
import type { TemplateInspectionState } from "./useTemplateInspection";

/** Écriture de la balise telle qu'elle apparaît dans le modèle. */
const tagLabel = (TAGTYP: TagType, TAGNAM: string) =>
  TAGTYP === "TEXT" ? `{{${TAGNAM}}}` : TAGTYP === "IMAGE" ? `img:${TAGNAM}` : `badge:${TAGNAM}`;

/** Compte rendu de l'analyse d'un .pptx avant import / remplacement. */
const TemplateInspectionView: React.FC<{ state: TemplateInspectionState }> = ({ state }) => {
  const { loading, result, failed } = state;

  if (loading) {
    return (
      <div className="vd-alert vd-alert--info">
        <Icon iconName="spinner" /> Analyse des balises du fichier…
      </div>
    );
  }
  if (failed) {
    return (
      <div className="vd-alert vd-alert--danger">
        <Icon iconName="circle-xmark" /> Ce fichier ne peut pas être utilisé comme modèle.
      </div>
    );
  }
  if (!result) return null;

  const { TAGS, UNKNOWN, MISSING } = result;
  const withLength = TAGS.filter((t) => t.MAXLEN != null);
  const lengthWarnings = result.LENGTHWARNINGS ?? [];

  return (
    <>
      {withLength.length > 0 && (
        <div className="vd-alert vd-alert--info">
          <Icon iconName="circle-info" />
          <div>
            <div>Longueur(s) max reprise(s) du modèle :</div>
            {withLength.map((t) => (
              <span key={`${t.TAGTYP}:${t.TAGNAM}`} className="vd-chip vd-chip--muted">
                <code>{`{{${t.TAGNAM}}}`}</code> {t.MAXLEN} car.
              </span>
            ))}
          </div>
        </div>
      )}
      {lengthWarnings.length > 0 && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" />
          <div>
            {lengthWarnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        </div>
      )}
      {UNKNOWN.length > 0 && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" />
          <div>
            <div>
              {UNKNOWN.length} balise(s) inconnue(s) du catalogue — elles seront rendues vides :
            </div>
            {UNKNOWN.map((t) => (
              <span key={`${t.TAGTYP}:${t.TAGNAM}`} className="vd-chip vd-chip--warning">
                <code>{tagLabel(t.TAGTYP, t.TAGNAM)}</code>
              </span>
            ))}
          </div>
        </div>
      )}
      {MISSING.length > 0 && (
        <div className="vd-alert vd-alert--info">
          <Icon iconName="circle-info" />
          <div>
            <div>Balise(s) du catalogue absente(s) de ce modèle :</div>
            {MISSING.map((t) => (
              <span key={`${t.TAGTYP}:${t.TAGNAM}`} className="vd-chip vd-chip--muted" title={t.LABEL}>
                <code>{tagLabel(t.TAGTYP, t.TAGNAM)}</code>
              </span>
            ))}
          </div>
        </div>
      )}
      {UNKNOWN.length === 0 && MISSING.length === 0 && (
        <div className="vd-alert vd-alert--success">
          <Icon iconName="circle-check" /> {TAGS.length} balise(s) détectée(s), toutes reconnues.
        </div>
      )}
      {TAGS.length === 0 && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Aucune balise détectée dans ce fichier.
        </div>
      )}
    </>
  );
};

export default TemplateInspectionView;
