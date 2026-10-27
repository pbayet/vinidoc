import React, { useEffect, useMemo, useState } from "react";
import {
  CustomButton,
  CustomSelect,
  Icon,
  type SelectOption,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { languageName } from "../lib/format";
import { templateLanguageLabel } from "../templates/templateUtils";
import CheckReportModal from "./CheckReportModal";
import type {
  CheckReport,
  Language,
  Sheet,
  Template,
} from "../../../entities/vinidoc/vinidoc.types";

/** Portée du contrôle : un TPLID, ou tous les modèles actifs de la langue. */
const ALL = "ALL";

const templateLabel = (languages: Language[], t: Template) =>
  `${t.TPLNAM} (${templateLanguageLabel(languages, t.LNGCOD)})`;

interface TemplatesCardProps {
  sheet: Sheet;
  /** Langue affichée dans la carte des textes (langue contrôlée) */
  lng: string;
  /** Modification du modèle par défaut autorisée (œnologie ou marketing) */
  canEdit: boolean;
  /** Des modifications ne sont pas enregistrées (contrôle sur l'enregistré, modèle par défaut verrouillé) */
  hasUnsavedChanges: boolean;
  /** Appelé après l'enregistrement du modèle par défaut (relecture de la fiche) */
  onSaved: () => void;
}

/**
 * Modèles PowerPoint de la fiche :
 *   - modèle par défaut, présélectionné à la génération. Préférence hors
 *     contenu validé : l'enregistrer ne change pas le statut de la fiche ;
 *   - contrôle des textes enregistrés (longueurs max, balises obligatoires),
 *     sur le modèle par défaut en priorité, un autre modèle ou tous les
 *     modèles actifs de la langue — à lancer avant de soumettre la fiche.
 */
const TemplatesCard: React.FC<TemplatesCardProps> = ({
  sheet,
  lng,
  canEdit,
  hasUnsavedChanges,
  onSaved,
}) => {
  const api = useVinidocApi();
  const { languages } = useVinidoc();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState(ALL);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [reportScope, setReportScope] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    api
      .listTemplates({ ACTIVE: true }, { silentError: true })
      .then(setTemplates)
      .catch(() => {
        /* liste vide : sélection impossible */
      });
  }, [api]);

  const defaultTemplate = templates.find((t) => t.TPLID === sheet.DEFTPLID);
  const unavailable =
    sheet.DEFTPLID != null && templates.length > 0 && !defaultTemplate;
  const compatible = useMemo(
    () => templates.filter((t) => !t.LNGCOD || t.LNGCOD === lng),
    [templates, lng],
  );
  const defaultCompatible =
    !!defaultTemplate && compatible.includes(defaultTemplate);

  // Contrôle sur le modèle par défaut en priorité (s'il est compatible avec
  // la langue), sinon sur tous les modèles.
  useEffect(() => {
    setScope(defaultCompatible ? String(sheet.DEFTPLID) : ALL);
  }, [defaultCompatible, sheet.DEFTPLID]);

  /* ───────────────────────── Modèle par défaut ───────────────────────── */

  const defaultOptions = useMemo<SelectOption[]>(
    () =>
      templates.map((t) => ({
        type: "option",
        value: String(t.TPLID),
        label: templateLabel(languages, t),
      })),
    [templates, languages],
  );

  const current = sheet.DEFTPLID != null ? String(sheet.DEFTPLID) : "";

  const saveDefault = async (value: string) => {
    if (value === current) return;
    try {
      await api.setDefaultTemplate(
        sheet.SHTID,
        value ? Number(value) : null,
        sheet.ROWVER,
        {
          setLoading: setSaving,
          successMessage: "Modèle par défaut enregistré.",
        },
      );
      onSaved();
    } catch {
      /* toast déjà affiché */
    }
  };

  /* ───────────────────────── Contrôle ───────────────────────── */

  const scopeOptions = useMemo<SelectOption[]>(
    () => [
      { type: "option", value: ALL, label: "Tous les modèles actifs" },
      ...compatible.map<SelectOption>((t) => ({
        type: "option",
        value: String(t.TPLID),
        label:
          t.TPLID === sheet.DEFTPLID
            ? `${templateLabel(languages, t)} — par défaut`
            : templateLabel(languages, t),
      })),
    ],
    [compatible, sheet.DEFTPLID, languages],
  );

  const runCheck = async () => {
    try {
      const r = await api.checkSheet(
        sheet.SHTID,
        {
          LNGCOD: lng,
          SOURCE: "CURRENT",
          TPLID: scope === ALL ? undefined : Number(scope),
        },
        { setLoading: setChecking },
      );
      setReport(r);
      setReportScope(scope);
      setShowReport(true);
    } catch {
      /* toast déjà affiché */
    }
  };

  const stale = !report || report.LNGCOD !== lng || reportScope !== scope;
  const checkedTemplate = templates.find(
    (t) => String(t.TPLID) === reportScope,
  );
  const scopeLabel = checkedTemplate
    ? templateLabel(languages, checkedTemplate)
    : "Tous les modèles actifs";

  return (
    <CustomFormSection
      title="Modèles PowerPoint"
      icon={<Icon iconName="file-powerpoint" />}
      className="vd-templates"
      description={`Modèle présélectionné à la génération, et contrôle des textes enregistrés en ${languageName(languages, lng)} (longueurs max, balises obligatoires).`}
    >
      <div className="vd-panel">
        <CustomSelect
          inputSize="xs"
          label="Modèle par défaut"
          placeholder="Aucun (choix à la génération)"
          options={defaultOptions}
          value={current}
          onChange={(v: string) => void saveDefault(v)}
          disabled={!canEdit || hasUnsavedChanges || saving}
        />
        <p className="vd-muted">
          {canEdit && hasUnsavedChanges
            ? "Enregistrez d'abord vos modifications pour changer le modèle par défaut."
            : "Le modifier ne change pas le statut de la fiche."}
        </p>
        {unavailable && (
          <div className="vd-alert vd-alert--warning">
            <Icon iconName="triangle-exclamation" /> Le modèle par défaut n'est
            plus actif : il ne sera pas présélectionné.
          </div>
        )}
        {defaultTemplate && !defaultCompatible && (
          <div className="vd-alert vd-alert--info">
            <Icon iconName="circle-info" /> Le modèle par défaut est réservé à
            une autre langue : il n'est pas contrôlable en{" "}
            {languageName(languages, lng)}.
          </div>
        )}
      </div>

      <div className="vd-panel">
        <div className="vd-check-scope">
          <CustomSelect
            inputSize="xs"
            label="Modèle à contrôler"
            options={scopeOptions}
            value={scope}
            onChange={(v: string) => setScope(v || ALL)}
            clearable={false}
          />
          <CustomButton
            size="xs"
            variant="outline"
            leftIcon={<Icon iconName="list-check" />}
            loading={checking}
            onClick={() => void runCheck()}
          >
            Contrôler
          </CustomButton>
        </div>

        {hasUnsavedChanges && (
          <div className="vd-alert vd-alert--warning">
            <Icon iconName="triangle-exclamation" /> Des modifications ne sont
            pas enregistrées : le contrôle porte sur la dernière version
            enregistrée.
          </div>
        )}
        {report && !stale ? (
          <div className="vd-check-last">
            <span
              className={`vd-chip ${report.OK ? "vd-chip--success" : "vd-chip--danger"}`}
            >
              <Icon
                iconName={report.OK ? "circle-check" : "triangle-exclamation"}
              />{" "}
              {report.OK ? "Conforme" : "Non conforme"}
            </span>
            <CustomButton
              size="2xs"
              variant="ghost"
              leftIcon={<Icon iconName="eye" />}
              onClick={() => setShowReport(true)}
            >
              Voir le rapport
            </CustomButton>
          </div>
        ) : (
          <p className="vd-muted">Le rapport s'ouvre après le contrôle.</p>
        )}
      </div>

      <CheckReportModal
        report={showReport ? report : null}
        scopeLabel={scopeLabel}
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={() => setShowReport(false)}
      />
    </CustomFormSection>
  );
};

export default TemplatesCard;
