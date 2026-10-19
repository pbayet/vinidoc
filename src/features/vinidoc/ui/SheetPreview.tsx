import React, { useMemo } from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type {
  CheckedTag,
  Color,
  SheetCommon,
  TranslationField,
  TranslationValues,
} from "../../../entities/vinidoc/vinidoc.types";
import {
  TRANSLATION_LABELS,
  colorLabel,
  formatTemperature,
  mouthScaleLabels,
  sheetTitle,
  textLength,
} from "../lib/format";

interface SheetPreviewProps {
  sheet: SheetCommon;
  translation?: Partial<TranslationValues>;
  lng: string;
  colors: Color[];
  /**
   * Résultat du contrôle face à un modèle (optionnel) : les champs dont la
   * balise homonyme est en erreur sont signalés et leur compteur affiché.
   */
  checkedTags?: CheckedTag[];
}

/** Blocs de texte longs, dans l'ordre de lecture de la fiche. */
const TEXT_BLOCKS: TranslationField[] = [
  "TERROIR",
  "VINIF",
  "DEGUST",
  "ACCORDS",
  "ACCEXPL",
];

const ISSUE_LABELS = {
  TOO_LONG: "Trop long",
  MISSING: "Obligatoire, vide",
  UNKNOWN_TAG: "Balise inconnue",
} as const;

/* ───────────────────────── Échelle 1..5 ───────────────────────── */

const Scale: React.FC<{
  label: string;
  value: number | null;
  min?: string;
  max?: string;
}> = ({ label, value, min, max }) => (
  <div className="vd-sheet-scale">
    <div className="vd-sheet-scale__head">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
    <div
      className="vd-sheet-scale__track"
      role="meter"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={value ?? undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`vd-sheet-scale__seg${value != null && n <= value ? " vd-sheet-scale__seg--on" : ""}`}
        />
      ))}
    </div>
    {(min || max) && (
      <div className="vd-sheet-scale__ends">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    )}
  </div>
);

/* ───────────────────────── Composant ───────────────────────── */

/**
 * Lecture seule d'une fiche dans une langue, présentée comme la fiche
 * finale : identité, repères (service, garde, cépages), échelles et textes.
 * Sert à l'aperçu d'une version validée (génération, historique des versions).
 */
const SheetPreview: React.FC<SheetPreviewProps> = ({
  sheet,
  translation,
  lng,
  colors,
  checkedTags,
}) => {
  const mouth = mouthScaleLabels(colors, sheet.COLCOD, lng);

  const tagByName = useMemo(
    () => new Map((checkedTags ?? []).map((t) => [t.TAGNAM.toUpperCase(), t])),
    [checkedTags],
  );

  /** État de contrôle d'un champ traduit (si une balise homonyme existe). */
  const fieldCheck = (f: TranslationField) => {
    const tag = tagByName.get(f);
    const ko = !!tag?.ISSUE && tag.ISSUE !== "UNKNOWN_TAG";
    return {
      tag,
      ko,
      title: tag?.ISSUE ? ISSUE_LABELS[tag.ISSUE] : undefined,
    };
  };

  const libelle = fieldCheck("LIBELLE");
  const garde = fieldCheck("GARDE");
  const cepages = fieldCheck("CEPAGES");

  return (
    <article className="vd-sheet-card">
      <header className="vd-sheet-card__header">
        <span className={`vd-color vd-color--${sheet.COLCOD.toLowerCase()}`}>
          {colorLabel(colors, sheet.COLCOD, lng)}
        </span>
        <h3
          className={`vd-sheet-card__title${libelle.ko ? " vd-is-ko" : ""}`}
          title={libelle.title}
        >
          {translation?.LIBELLE || sheetTitle(sheet)}
        </h3>
        <p className="vd-sheet-card__subtitle">
          {sheet.APPELL} · {sheet.MILLESIME ?? "Non millésimé"} ·{" "}
          <code>{sheet.CODVRAC}</code>
        </p>
        {sheet.DESCVRAC && (
          <p className="vd-sheet-card__desc">{sheet.DESCVRAC}</p>
        )}
      </header>

      <div className="vd-sheet-card__facts">
        <div className="vd-fact">
          <Icon iconName="temperature-half" />
          <span className="vd-fact__label">Service</span>
          <span className="vd-fact__value">
            {formatTemperature(sheet.TEMPMIN, sheet.TEMPMAX)}
          </span>
        </div>
        <div
          className={`vd-fact${garde.ko ? " vd-is-ko" : ""}`}
          title={garde.title}
        >
          <Icon iconName="hourglass-half" />
          <span className="vd-fact__label">Garde</span>
          <span className="vd-fact__value">{translation?.GARDE || "—"}</span>
        </div>
        <div
          className={`vd-fact vd-fact--wide${cepages.ko ? " vd-is-ko" : ""}`}
          title={cepages.title}
        >
          <Icon iconName="seedling" />
          <span className="vd-fact__label">Cépages</span>
          <span className="vd-fact__value">{translation?.CEPAGES || "—"}</span>
        </div>
      </div>

      <div className="vd-sheet-card__scales">
        <Scale
          label="Intensité aromatique"
          value={sheet.INTARO}
          min="Peu intense"
          max="Très intense"
        />
        <Scale
          label="Intensité bouche"
          value={sheet.INTBOU}
          min={mouth.min}
          max={mouth.max}
        />
        <Scale
          label="Échelle fruit"
          value={sheet.ECHFRU}
          min="Floral"
          max="Très fruité"
        />
      </div>

      {!translation ? (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="language" /> Aucun texte dans cette langue.
        </div>
      ) : (
        <div className="vd-sheet-card__texts">
          {TEXT_BLOCKS.map((f) => {
            const value = translation[f] ?? "";
            const { tag, ko, title } = fieldCheck(f);
            return (
              <section
                key={f}
                className={`vd-sheet-text${ko ? " vd-sheet-text--ko" : ""}`}
              >
                <header className="vd-sheet-text__head">
                  <h5>{TRANSLATION_LABELS[f].label}</h5>
                  {tag && (
                    <span className="vd-sheet-text__count" title={title}>
                      {textLength(value)}
                      {tag.MAXLEN ? ` / ${tag.MAXLEN}` : ""}
                    </span>
                  )}
                </header>
                {value ? (
                  <p>{value}</p>
                ) : (
                  <p className="vd-muted">Non renseigné</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
};

export default SheetPreview;
