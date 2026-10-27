import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CustomFormSubmit,
  Icon,
  useFormContext,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import { useVinidoc } from "../context/VinidocContext";
import {
  colorLabel,
  formatDateTime,
  languageName,
  sheetTitle,
} from "../lib/format";
import GenerationResultCard from "./GenerationResultCard";
import {
  FORMAT_META,
  logosLabel,
  type GenerationFormValues,
} from "./generationValues";
import type { GenerationSource } from "./useGenerationSource";
import type {
  GenerationResult,
  SheetListItem,
  Template,
} from "../../../entities/vinidoc/vinidoc.types";

interface GenerationSummaryProps {
  sheet?: SheetListItem;
  template?: Template;
  source: GenerationSource;
  result: GenerationResult | null;
}

/** warn : point d'attention non bloquant (contenu non validé). */
type StepState = "ok" | "warn" | "ko" | "pending" | "idle";

const STEP_ICONS: Record<StepState, string> = {
  ok: "circle-check",
  warn: "triangle-exclamation",
  ko: "circle-xmark",
  pending: "hourglass-half",
  idle: "circle",
};

interface SummaryStep {
  key: string;
  label: string;
  state: StepState;
  value: React.ReactNode;
}

/**
 * Récapitulatif (colonne de droite, collant) : vin sélectionné, état de
 * chaque prérequis, bouton de génération et dernier fichier produit.
 */
const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  sheet,
  template,
  source,
  result,
}) => {
  const navigate = useNavigate();
  const { languages, colors } = useVinidoc();
  const { values, submitting } = useFormContext<GenerationFormValues>();
  const { content, version, loadingContent, availableLngs, check, checking } =
    source;

  const lngOk = !!content && availableLngs.includes(values.LNGCOD);
  const canGenerate = lngOk && !!template && check?.OK === true && !submitting;
  const format = FORMAT_META[values.FORMAT];

  const steps: SummaryStep[] = [
    {
      key: "content",
      label: "Contenu",
      state: version
        ? "ok"
        : content
          ? "warn"
          : loadingContent
            ? "pending"
            : "idle",
      value: version
        ? `Version validée n°${version.VERNUM} du ${formatDateTime(version.VALDAT)} (${version.VALUSR})`
        : content
          ? "Saisie en cours — non validée par le marketing"
          : loadingContent
            ? "Chargement…"
            : "Aucun vin sélectionné",
    },
    {
      key: "lng",
      label: "Langue",
      state: lngOk ? "ok" : "idle",
      value: lngOk ? languageName(languages, values.LNGCOD) : "—",
    },
    {
      key: "tpl",
      label: "Modèle",
      state: template ? "ok" : "idle",
      value: template?.TPLNAM ?? "—",
    },
    {
      key: "check",
      label: "Contrôle des textes",
      state: checking ? "pending" : check ? (check.OK ? "ok" : "ko") : "idle",
      value: checking
        ? "En cours…"
        : check
          ? check.OK
            ? "Conforme au modèle"
            : "Textes non conformes — voir le détail"
          : "En attente du vin, de la langue et du modèle",
    },
  ];

  const blockingReason = canGenerate
    ? null
    : (steps.find((s) => s.state !== "ok" && s.state !== "warn")?.value ??
      null);

  const logos = logosLabel(values);

  return (
    <CustomFormSection title="Récapitulatif" icon={<Icon iconName="clipboard-check" />}>
      <div className="vd-summary">
        {sheet ? (
          <div className="vd-summary__wine">
            <span className="vd-summary__wine-title">{sheetTitle(sheet)}</span>
            <span>{sheet.APPELL}</span>
            {sheet.LIBELLE && <span className="vd-muted">{sheet.LIBELLE}</span>}
            <span className="vd-summary__wine-meta">
              <span
                className={`vd-color vd-color--${sheet.COLCOD.toLowerCase()}`}
              >
                {colorLabel(colors, sheet.COLCOD)}
              </span>
              <button
                type="button"
                className="vd-link"
                onClick={() => navigate(`/oenologie/${sheet.SHTID}`)}
              >
                <Icon iconName="arrow-up-right-from-square" /> Ouvrir la fiche
              </button>
            </span>
          </div>
        ) : (
          <div className="vd-summary__wine vd-summary__wine--empty">
            <Icon iconName="wine-bottle" /> Aucun vin sélectionné
          </div>
        )}

        <ul className="vd-summary__steps">
          {steps.map((s) => (
            <li
              key={s.key}
              className={`vd-summary__step vd-summary__step--${s.state}`}
            >
              <Icon iconName={STEP_ICONS[s.state]} />
              <div>
                <span className="vd-summary__step-label">{s.label}</span>
                <span className="vd-summary__step-value">{s.value}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="vd-summary__output">
          <span className="vd-chip">
            <Icon iconName={format.icon} /> {format.label}
          </span>
          <span
            className={`vd-chip${logos ? " vd-chip--success" : " vd-chip--muted"}`}
          >
            {logos ? `Logos ${logos}` : "Sans logo"}
          </span>
          <span
            className={`vd-chip${values.PHOTO ? " vd-chip--success" : " vd-chip--muted"}`}
          >
            <Icon iconName="image" />{" "}
            {values.PHOTO ? "Photo personnalisée" : "Photo du modèle"}
          </span>
        </div>

        <CustomFormSubmit
          variant="success"
          size="sm"
          fullWidth
          leftIcon={<Icon iconName={format.icon} />}
          disabled={!canGenerate}
          title={canGenerate ? undefined : String(blockingReason ?? "")}
        >
          Générer le {format.label}
        </CustomFormSubmit>
        {!canGenerate && !submitting && blockingReason && (
          <p className="vd-summary__reason">{blockingReason}</p>
        )}

        {result && <GenerationResultCard result={result} />}
      </div>
    </CustomFormSection>
  );
};

export default GenerationSummary;
