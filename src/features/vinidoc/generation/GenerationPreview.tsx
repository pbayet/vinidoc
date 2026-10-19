import React, { useMemo, useState } from "react";
import { Icon } from "@uvcdr/custom-form-system";
import SheetPreview from "../ui/SheetPreview";
import type {
  CheckReport,
  CheckedTag,
  Color,
  SheetCommon,
  Template,
  TranslationValues,
} from "../../../entities/vinidoc/vinidoc.types";

interface GenerationPreviewProps {
  sheet: SheetCommon;
  translation?: Partial<TranslationValues>;
  lng: string;
  colors: Color[];
  template?: Template;
  check: CheckReport | null;
  checking: boolean;
}

const ISSUE_LABELS: Record<NonNullable<CheckedTag["ISSUE"]>, string> = {
  TOO_LONG: "Trop long",
  MISSING: "Obligatoire, vide",
  UNKNOWN_TAG: "Balise inconnue",
};

const isBlocking = (t: CheckedTag) => !!t.ISSUE && t.ISSUE !== "UNKNOWN_TAG";

type CheckState = "idle" | "pending" | "ok" | "ko";

const CHECK_META: Record<CheckState, { icon: string; title: string }> = {
  idle: { icon: "circle-info", title: "Contrôle en attente" },
  pending: { icon: "hourglass-half", title: "Contrôle en cours…" },
  ok: { icon: "circle-check", title: "Textes conformes" },
  ko: { icon: "circle-xmark", title: "Génération impossible" },
};

/** Jauge longueur / maximum d'une balise. */
const TagGauge: React.FC<{ tag: CheckedTag }> = ({ tag }) => {
  const ratio = tag.MAXLEN ? Math.min(tag.LENGTH / tag.MAXLEN, 1) : 0;
  const level = isBlocking(tag)
    ? "ko"
    : tag.MAXLEN && tag.LENGTH / tag.MAXLEN >= 0.9
      ? "warn"
      : "ok";

  return (
    <li className={`vd-gauge vd-gauge--${level}`}>
      <code className="vd-gauge__tag">
        {tag.TAGNAM}
        {tag.REQUIRED && (
          <span className="vd-required" title="Obligatoire">
            *
          </span>
        )}
      </code>
      <span className="vd-gauge__track" aria-hidden>
        {tag.MAXLEN ? (
          <span className="vd-gauge__fill" style={{ width: `${ratio * 100}%` }} />
        ) : null}
      </span>
      <span className="vd-gauge__count">
        {tag.LENGTH}
        {tag.MAXLEN ? ` / ${tag.MAXLEN}` : ""}
      </span>
      <span className="vd-gauge__state">
        {tag.ISSUE ? ISSUE_LABELS[tag.ISSUE] : "OK"}
      </span>
    </li>
  );
};

/**
 * Contrôle des longueurs face au modèle choisi (bandeau + jauges par
 * balise), suivi de l'aperçu de la version validée (`SheetPreview`) où les
 * champs en erreur sont signalés.
 */
const GenerationPreview: React.FC<GenerationPreviewProps> = ({
  sheet,
  translation,
  lng,
  colors,
  template,
  check,
  checking,
}) => {
  const [showAllTags, setShowAllTags] = useState(false);

  const tplCheck = check?.TEMPLATES.find((t) => t.TPLID === template?.TPLID);
  const tags = useMemo(
    // Problèmes d'abord, puis ordre du modèle.
    () =>
      [...(tplCheck?.TAGS ?? [])].sort(
        (a, b) => Number(!!b.ISSUE) - Number(!!a.ISSUE),
      ),
    [tplCheck],
  );
  const blocking = tags.filter(isBlocking);

  const state: CheckState =
    !template || (!checking && !check)
      ? "idle"
      : checking
        ? "pending"
        : check?.OK
          ? "ok"
          : "ko";

  const subtitle = {
    idle: "Choisissez un modèle pour contrôler la longueur des textes.",
    pending: `Vérification face au modèle « ${template?.TPLNAM} »…`,
    ok: `Tous les textes tiennent dans le modèle « ${template?.TPLNAM} ».`,
    ko: `${blocking.length} problème(s) avec « ${template?.TPLNAM} » : corrigez la fiche (œnologie) puis faites-la revalider, ou choisissez un autre modèle.`,
  }[state];

  // KO : problèmes affichés d'office ; OK : détail replié par défaut.
  const visibleTags =
    showAllTags ? tags : state === "ko" ? tags.filter((t) => !!t.ISSUE) : [];
  const canToggle = showAllTags || visibleTags.length < tags.length;

  return (
    <div className="vd-gen-preview">
      <div className={`vd-check-banner vd-check-banner--${state}`} role="status">
        <Icon iconName={CHECK_META[state].icon} />
        <div className="vd-check-banner__body">
          <strong>{CHECK_META[state].title}</strong>
          <span>{subtitle}</span>
        </div>
        {state !== "pending" && tags.length > 0 && (
          <div className="vd-check-banner__stats">
            <span>
              <strong>{tags.length - blocking.length}</strong> / {tags.length}
            </span>
            <small>balises OK</small>
          </div>
        )}
      </div>

      {check?.TRANSLATION_MISSING && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Aucun texte en{" "}
          {lng.toUpperCase()} : les champs traduits seront vides.
        </div>
      )}

      {tags.length > 0 && (
        <div className="vd-gauges">
          {visibleTags.length > 0 && (
            <ul className="vd-gauges__list">
              {visibleTags.map((t) => (
                <TagGauge key={t.TAGNAM} tag={t} />
              ))}
            </ul>
          )}
          {canToggle && (
            <button
              type="button"
              className="vd-link vd-gauges__toggle"
              aria-expanded={showAllTags}
              onClick={() => setShowAllTags((v) => !v)}
            >
              <Icon iconName={showAllTags ? "chevron-up" : "chevron-down"} />
              {showAllTags
                ? "Masquer le détail"
                : `Voir le détail des ${tags.length} balises`}
            </button>
          )}
        </div>
      )}

      <SheetPreview
        sheet={sheet}
        translation={translation}
        lng={lng}
        colors={colors}
        checkedTags={state === "pending" ? undefined : tags}
      />
    </div>
  );
};

export default GenerationPreview;
