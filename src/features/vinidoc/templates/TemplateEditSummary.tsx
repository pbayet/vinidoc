import React from "react";
import {
  CustomFormReset,
  CustomFormSubmit,
  Icon,
  useFormContext,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import { useVinidoc } from "../context/VinidocContext";
import { formatBytes, formatDateTime } from "../lib/format";
import { templateLanguageLabel } from "./templateUtils";
import {
  changedTagKeys,
  metaChanged,
  type TemplateEditFormValues,
} from "./templateEditValues";
import type { TemplateInspectionState } from "./useTemplateInspection";
import type { Template } from "../../../entities/vinidoc/vinidoc.types";

interface TemplateEditSummaryProps {
  template: Template;
  inspection: TemplateInspectionState;
  /** Résultat du dernier remplacement de fichier (balises ajoutées / retirées) */
  lastDiff: Template | null;
}

/** warn : point d'attention non bloquant. */
type StepState = "ok" | "edit" | "warn" | "ko" | "pending";

const STEP_ICONS: Record<StepState, string> = {
  ok: "circle-check",
  edit: "pen",
  warn: "triangle-exclamation",
  ko: "circle-xmark",
  pending: "hourglass-half",
};

interface SummaryStep {
  key: string;
  label: string;
  state: StepState;
  value: React.ReactNode;
}

/**
 * Récapitulatif (colonne de droite, collant) : identité du modèle, état de
 * chaque bloc (inchangé / modifié / à vérifier), enregistrement groupé.
 */
const TemplateEditSummary: React.FC<TemplateEditSummaryProps> = ({
  template,
  inspection,
  lastDiff,
}) => {
  const { languages } = useVinidoc();
  const { values, dirty, isValid, submitting } =
    useFormContext<TemplateEditFormValues>();

  const meta = metaChanged(values, template);
  const tagChanges = changedTagKeys(values, template).size;
  const unknownTags = (template.TAGS ?? []).filter((g) => !g.ISKNOWN).length;
  const fileBlocked =
    !!values.FILE && (inspection.loading || inspection.failed);

  const steps: SummaryStep[] = [
    {
      key: "meta",
      label: "Informations",
      state: !values.TPLNAM.trim() ? "ko" : meta ? "edit" : "ok",
      value: !values.TPLNAM.trim()
        ? "Le nom du modèle est obligatoire"
        : meta
          ? "Modifiées — à enregistrer"
          : "À jour",
    },
    {
      key: "file",
      label: "Fichier",
      state: !values.FILE
        ? "ok"
        : inspection.loading
          ? "pending"
          : inspection.failed
            ? "ko"
            : inspection.result?.UNKNOWN.length
              ? "warn"
              : "edit",
      value: !values.FILE
        ? (template.ORIGINALNAME ?? "Fichier actuel")
        : inspection.loading
          ? "Analyse du nouveau fichier…"
          : inspection.failed
            ? "Nouveau fichier inutilisable"
            : inspection.result?.UNKNOWN.length
              ? `Remplacement prévu — ${inspection.result.UNKNOWN.length} balise(s) inconnue(s)`
              : `Remplacement prévu : ${values.FILE.name}`,
    },
    {
      key: "tags",
      label: "Balises texte",
      state: !isValid
        ? "ko"
        : tagChanges
          ? "edit"
          : unknownTags
            ? "warn"
            : "ok",
      value: !isValid
        ? "Longueurs max invalides"
        : tagChanges
          ? `${tagChanges} balise(s) modifiée(s)`
          : unknownTags
            ? `${unknownTags} balise(s) inconnue(s) du catalogue`
            : `${values.TAGS.length} balise(s) — à jour`,
    },
  ];

  const blockingReason = !dirty
    ? "Aucune modification à enregistrer."
    : (steps.find((s) => s.state === "ko" || s.state === "pending")?.value ??
      null);
  const canSave =
    dirty && isValid && !fileBlocked && !submitting && !!values.TPLNAM.trim();

  return (
    <CustomFormSection title="Récapitulatif" icon={<Icon iconName="clipboard-check" />}>
      <div className="vd-summary">
        <div className="vd-summary__wine">
          <span className="vd-summary__wine-title">
            {values.TPLNAM.trim() || template.TPLNAM}
          </span>
          {template.ORIGINALNAME && (
            <span className="vd-muted">
              <Icon iconName="file-powerpoint" /> {template.ORIGINALNAME}
              {template.SIZEBYTES
                ? ` — ${formatBytes(template.SIZEBYTES)}`
                : ""}
            </span>
          )}
          <span className="vd-summary__wine-meta">
            <span className="vd-chip">
              <Icon iconName="language" />{" "}
              {templateLanguageLabel(languages, values.LNGCOD || null)}
            </span>
            <span
              className={`vd-chip${values.ACTIVE ? " vd-chip--success" : " vd-chip--muted"}`}
            >
              {values.ACTIVE ? "Actif" : "Inactif"}
            </span>
          </span>
        </div>

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

        <div className="vd-summary__actions">
          <CustomFormSubmit
            variant="primary"
            size="sm"
            fullWidth
            leftIcon={<Icon iconName="floppy-disk" />}
            disabled={!canSave}
            title={canSave ? undefined : String(blockingReason ?? "")}
          >
            Enregistrer les modifications
          </CustomFormSubmit>
          {dirty && (
            <CustomFormReset
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<Icon iconName="rotate-left" />}
            >
              Annuler les modifications
            </CustomFormReset>
          )}
        </div>
        {!canSave && !submitting && blockingReason && (
          <p className="vd-summary__reason">{blockingReason}</p>
        )}

        {lastDiff && <FileDiff diff={lastDiff} />}

        <p className="vd-muted vd-summary__audit">
          <li>
            Créé le {formatDateTime(template.CREDAT)} par {template.CREUSR}
          </li>
          <li>
            Modifié le {formatDateTime(template.MODDAT)} par {template.MODUSR}
          </li>
        </p>
      </div>
    </CustomFormSection>
  );
};

/** Compte rendu du dernier remplacement de fichier. */
const FileDiff: React.FC<{ diff: Template }> = ({ diff }) => {
  const added = diff.ADDEDTAGS ?? [];
  const removed = diff.REMOVEDTAGS ?? [];
  const lengths = diff.MAXLENTAGS ?? [];
  return (
    <div className="vd-alert vd-alert--info">
      <Icon iconName="circle-info" />
      <div>
        <strong>Fichier remplacé.</strong>
        {added.length > 0 && (
          <div>Balises ajoutées : {added.map((t) => t.TAGNAM).join(", ")}</div>
        )}
        {removed.length > 0 && (
          <div>
            Balises retirées : {removed.map((t) => t.TAGNAM).join(", ")}
          </div>
        )}
        {lengths.length > 0 && (
          <div>
            Longueurs reprises du modèle :{" "}
            {lengths
              .map((t) => `${t.TAGNAM} ${t.OLDMAXLEN ?? "illimitée"} → ${t.NEWMAXLEN}`)
              .join(", ")}
          </div>
        )}
        {!added.length && !removed.length && (
          <div>Mêmes balises que le fichier précédent.</div>
        )}
      </div>
    </div>
  );
};

export default TemplateEditSummary;
