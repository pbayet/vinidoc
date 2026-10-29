import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CustomButton,
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
  PACKAGING_META,
  freeTagIssues,
  logosLabel,
  scrollToCheckSection,
  type GenerationFormValues,
  type GenerationWarning,
} from "./generationValues";
import type { GenerationSource } from "./useGenerationSource";
import type {
  Article,
  GenerationResult,
  SheetListItem,
  Template,
  TemplateTag,
} from "../../../entities/vinidoc/vinidoc.types";

interface GenerationSummaryProps {
  sheet?: SheetListItem;
  template?: Template;
  source: GenerationSource;
  /** Article PFI chargé (données logistiques), null sans article */
  article: Article | null;
  articleLoading: boolean;
  /** Champs libres {{FREE.*}} du modèle choisi */
  freeTags: TemplateTag[];
  /** Points d'attention non bloquants (cf. generationWarnings) */
  warnings: GenerationWarning[];
  /** Secondes avant le lancement de la génération (null hors attente) */
  countdown: number | null;
  /** Annule la génération pendant le compte à rebours */
  onCancelGeneration: () => void;
  result: GenerationResult | null;
  /** Textes non conformes au modèle : ouvre la boîte de correction (EF-53) */
  onCorrect?: () => void;
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
  value: string;
  /** Rend la valeur cliquable (ex. vers le détail du contrôle) */
  onClick?: () => void;
}

/** Valeur d'une étape, en lien si elle a une action. */
const StepValue: React.FC<{ step: SummaryStep; className: string }> = ({
  step,
  className,
}) =>
  step.onClick ? (
    <button
      type="button"
      className={`vd-link ${className}`}
      onClick={step.onClick}
    >
      {step.value} <Icon iconName="arrow-down" />
    </button>
  ) : (
    <span className={className}>{step.value}</span>
  );

/**
 * Récapitulatif (colonne de droite, collant) : vin sélectionné, état de
 * chaque prérequis, bouton de génération et dernier fichier produit.
 */
const GenerationSummary: React.FC<GenerationSummaryProps> = ({
  sheet,
  template,
  source,
  article,
  articleLoading,
  freeTags,
  warnings,
  countdown,
  onCancelGeneration,
  result,
  onCorrect,
}) => {
  const navigate = useNavigate();
  const { languages, colors } = useVinidoc();
  const { values, submitting } = useFormContext<GenerationFormValues>();
  const { content, version, loadingContent, availableLngs, check, checking } =
    source;

  const lngOk = !!content && availableLngs.includes(values.LNGCOD);
  const freeIssues = freeTagIssues(freeTags, values.FREE);
  // Champs facultatifs vides (les obligatoires bloquent via freeIssues).
  const emptyFree = freeTags.filter(
    (t) => !t.REQUIRED && !values.FREE[t.TAGNAM]?.trim(),
  );

  const logisticsWarn = warnings.some((w) => w.key === "logistics");
  // Données logistiques : article chargé, et c'est bien celui choisi.
  const articleOk =
    !!values.ARTICLE && article?.COD_ARTICLE === values.ARTICLE;
  const canGenerate =
    articleOk &&
    lngOk &&
    !!template &&
    check?.OK === true &&
    !freeIssues.length &&
    !submitting;
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
            : "Aucun article sélectionné",
    },
    {
      key: "article",
      label: "Données logistiques",
      state: articleOk
        ? logisticsWarn
          ? "warn"
          : "ok"
        : articleLoading
          ? "pending"
          : sheet
            ? "ko"
            : "idle",
      value: articleOk
        ? `Article ${article?.COD_ARTICLE}${logisticsWarn ? " — données manquantes" : ""}`
        : articleLoading
          ? "Chargement de l'article…"
          : sheet
            ? "Aucun article PFI sélectionné — choisissez l'article pour charger les données logistiques"
            : "—",
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
      onClick: check && !check.OK ? scrollToCheckSection : undefined,
    },
    ...(template && freeTags.length
      ? [
          {
            key: "free",
            label: "Champs libres",
            state: freeIssues.length ? "ko" : emptyFree.length ? "warn" : "ok",
            value: freeIssues.length
              ? freeIssues.join(" ; ")
              : `${freeTags.length - emptyFree.length}/${freeTags.length} renseigné${freeTags.length > 1 ? "s" : ""}`,
          } satisfies SummaryStep,
        ]
      : []),
  ];

  const blockingStep = canGenerate
    ? undefined
    : steps.find((s) => s.state !== "ok" && s.state !== "warn");
  const blockingReason = blockingStep?.value ?? null;

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
            <Icon iconName="wine-bottle" /> Aucun article sélectionné
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
                <StepValue step={s} className="vd-summary__step-value" />
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
            <Icon iconName={PACKAGING_META[values.PACKAGING].icon} />{" "}
            {PACKAGING_META[values.PACKAGING].label} ·{" "}
            {values.PHOTO ? "photo personnalisée" : "photo du modèle"}
          </span>
        </div>

        {warnings.map((w) => (
          <div key={w.key} className="vd-alert vd-alert--warning" role="status">
            <Icon iconName="triangle-exclamation" />
            <span>{w.message}</span>
          </div>
        ))}

        {countdown != null ? (
          <div className="vd-summary__countdown" role="status">
            <span>
              <Icon iconName="hourglass-half" /> Génération du {format.label}{" "}
              dans {countdown} s…
            </span>
            <CustomButton
              type="button"
              variant="danger"
              size="sm"
              fullWidth
              leftIcon={<Icon iconName="xmark" />}
              onClick={onCancelGeneration}
            >
              Annuler la génération
            </CustomButton>
          </div>
        ) : onCorrect && check && !check.OK && !checking ? (
          <CustomButton
            type="button"
            variant="warning"
            size="sm"
            fullWidth
            leftIcon={<Icon iconName="pen-to-square" />}
            title="Corriger les textes trop longs ou vides, puis générer"
            onClick={onCorrect}
          >
            Corriger les textes et générer
          </CustomButton>
        ) : (
          <CustomFormSubmit
            variant="success"
            size="sm"
            fullWidth
            leftIcon={<Icon iconName={format.icon} />}
            disabled={!canGenerate}
            title={canGenerate ? undefined : (blockingReason ?? "")}
          >
            Générer le {format.label}
          </CustomFormSubmit>
        )}
        {!canGenerate && !submitting && blockingStep && (
          <p className="vd-summary__reason">
            <StepValue step={blockingStep} className="vd-summary__reason-text" />
          </p>
        )}

        {result && <GenerationResultCard result={result} />}
      </div>
    </CustomFormSection>
  );
};

export default GenerationSummary;
