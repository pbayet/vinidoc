import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CustomButton,
  CustomButtonGroup,
  CustomForm,
  CustomFormApi,
  CustomFormDivider,
  CustomFormFile,
  CustomFormGrid,
  CustomFormSection,
  CustomFormSelect,
  FileViewerModal,
  Icon,
  useFormContext,
  validators,
  type FieldChange,
  type SelectOption,
} from "@uvcdr/custom-form-system";
import StepBadge from "../ui/StepBadge";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { STATUS_LABELS, languageName, sheetTitle } from "../lib/format";
import { templateLanguageLabel } from "../templates/templateUtils";
import { useTemplatePreview } from "../templates/useTemplatePreview";
import GenerationPreview from "./GenerationPreview";
import GenerationSummary from "./GenerationSummary";
import { contentSourceOf, useGenerationSource } from "./useGenerationSource";
import {
  FORMAT_META,
  OUTPUT_FORMATS,
  PHOTO_ACCEPT,
  PHOTO_MAX_SIZE,
  initialGenerationValues,
  toGenerateRequest,
  type GenerationFormValues,
} from "./generationValues";
import type {
  GenerationResult,
  SheetListItem,
  Template,
} from "../../../entities/vinidoc/vinidoc.types";

interface GenerationFormProps {
  /** Toutes les fiches (validées ou non) */
  sheets: SheetListItem[];
  /** Modèles actifs */
  templates: Template[];
  /** Vin présélectionné (paramètre d'URL `?sheet=`) */
  initialSheetId: string;
  /** Changement de vin (synchronisation URL / historique) */
  onSheetChange: (sheetId: string) => void;
  /** Appelé après une génération réussie */
  onGenerated: () => void;
}

/** Champs dont le changement rend obsolète le dernier fichier généré. */
const SOURCE_FIELDS: ReadonlyArray<keyof GenerationFormValues> = [
  "SHTID",
  "LNGCOD",
  "TPLID",
];

/**
 * Formulaire de génération d'une fiche technique.
 *
 * Parcours : vin → langue et modèle → format / photo / logos. Une fiche
 * validée est générée depuis sa dernière version validée ; une fiche non
 * validée depuis la saisie en cours (avertissement, non bloquant). Le contrôle des longueurs est relancé automatiquement à chaque
 * changement ; la génération n'est possible que si le contrôle est conforme.
 */
const GenerationForm: React.FC<GenerationFormProps> = ({
  sheets,
  templates,
  initialSheetId,
  onSheetChange,
  onGenerated,
}) => {
  const api = useVinidocApi();
  const { defaultLng } = useVinidoc();
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Valeurs de montage uniquement : la suite est gérée par le formulaire.
  const [initial] = useState(() =>
    initialGenerationValues(initialSheetId, defaultLng),
  );

  const handleChange = (change: FieldChange<GenerationFormValues>) => {
    if (change.name === "SHTID") onSheetChange(String(change.value ?? ""));
    if (SOURCE_FIELDS.includes(change.name)) setResult(null);
  };

  const handleSubmit = async (values: GenerationFormValues) => {
    try {
      const r = await api.generate(toGenerateRequest(values), values.PHOTO, {
        successMessage: "Fiche technique générée.",
      });
      setResult(r);
      onGenerated();
    } catch {
      /* toast déjà affiché (contraintes, conversion PDF...) */
    }
  };

  return (
    <CustomForm<GenerationFormValues>
      initialValues={initial}
      defaultValues={initial}
      onChange={handleChange}
      onSubmit={handleSubmit}
      inputSize="sm"
    >
      {(api) => (
        <GenerationWorkspace
          sheets={sheets}
          templates={templates}
          result={result}
          formApi={api}
        />
      )}
    </CustomForm>
  );
};

/* ───────────────────────── Contenu du formulaire ───────────────────────── */

interface GenerationWorkspaceProps {
  sheets: SheetListItem[];
  templates: Template[];
  result: GenerationResult | null;
  formApi: CustomFormApi<GenerationFormValues>;
}

const GenerationWorkspace: React.FC<GenerationWorkspaceProps> = ({
  sheets,
  templates,
  result,
  formApi,
}) => {
  const api = useVinidocApi();
  const { languages, colors, defaultLng } = useVinidoc();
  const { values, setFieldValue } = useFormContext<GenerationFormValues>();
  const preview = useTemplatePreview();

  const sheet = sheets.find((s) => String(s.SHTID) === values.SHTID);
  const template = templates.find(
    (t) =>
      String(t.TPLID) === values.TPLID &&
      (!t.LNGCOD || t.LNGCOD === values.LNGCOD),
  );

  console.log(sheets, sheet);

  const source = useGenerationSource({
    api,
    sheet,
    lng: values.LNGCOD,
    template,
  });

  const { content, availableLngs, check } = source;
  const notValidated = !!sheet && contentSourceOf(sheet) === "CURRENT";
  const lngAvailable = availableLngs.includes(values.LNGCOD);

  // Changement de vin : présélection de son modèle par défaut (s'il est
  // actif), une seule fois par vin pour ne pas écraser un choix manuel.
  const presetFor = useRef<string | null>(null);
  useEffect(() => {
    if (!sheet || !templates.length || presetFor.current === values.SHTID)
      return;
    presetFor.current = values.SHTID;
    const def = templates.find((t) => t.TPLID === sheet.DEFTPLID);
    if (!def) return;
    setFieldValue("TPLID", String(def.TPLID));
    if (def.LNGCOD) setFieldValue("LNGCOD", def.LNGCOD);
  }, [sheet, templates, values.SHTID, setFieldValue]);

  // Langue absente du contenu : langue par défaut, sinon la première.
  useEffect(() => {
    if (!content || availableLngs.includes(values.LNGCOD)) return;
    const next = availableLngs.includes(defaultLng)
      ? defaultLng
      : (availableLngs[0] ?? "");
    if (next !== values.LNGCOD) setFieldValue("LNGCOD", next);
  }, [content, availableLngs, defaultLng, values.LNGCOD, setFieldValue]);

  /* ───────────────────────── Options ───────────────────────── */

  // Vins regroupés : validés par le marketing d'abord, puis non validés.
  const sheetOptions = useMemo<SelectOption[]>(() => {
    const toOption = (s: SheetListItem): SelectOption => ({
      type: "option",
      value: String(s.SHTID),
      label: `${sheetTitle(s)} — ${s.APPELL}${s.LIBELLE ? ` — ${s.LIBELLE}` : ""}`,
      keywords: [s.CODVRAC, s.APPELL, s.LIBELLE ?? "", STATUS_LABELS[s.STATUS]],
    });
    const validated = sheets.filter((s) => contentSourceOf(s) === "VALIDATED");
    const others = sheets.filter((s) => contentSourceOf(s) === "CURRENT");
    return [
      {
        type: "category",
        label: "Validés par le marketing",
        children: validated.map(toOption),
      },
      {
        type: "category",
        label: "Non validés (saisie en cours)",
        children: others.map(toOption),
      },
    ].filter((c) => c.children.length > 0) as SelectOption[];
  }, [sheets]);

  const lngOptions = useMemo<SelectOption[]>(
    () =>
      availableLngs.map((l) => ({
        type: "option",
        value: l,
        label: languageName(languages, l),
      })),
    [availableLngs, languages],
  );

  const tplOptions = useMemo<SelectOption[]>(
    () =>
      templates.map((t) => ({
        type: "option",
        value: String(t.TPLID),
        label: `${t.TPLNAM} (${templateLanguageLabel(languages, t.LNGCOD)})`,
      })),
    [templates, languages],
  );

  const tplLanguage = useMemo(
    () => new Map(templates.map((t) => [String(t.TPLID), t.LNGCOD])),
    [templates],
  );
  const hasCompatibleTemplate = templates.some(
    (t) => !t.LNGCOD || t.LNGCOD === values.LNGCOD,
  );

  return (
    <div className="vd-generate">
      <div className="vd-generate__main">
        <CustomFormSection
          title="Paramètres de la fiche"
          icon={<Icon iconName="sliders" />}
          description="Vin validé : dernière version validée par le marketing. Vin non validé : saisie en cours."
        >
          <CustomFormSection
            icon={<StepBadge step={1} />}
            title="Vin"
            description="Les vins non validés par le marketing restent sélectionnables."
          >
            <CustomFormSelect
              name="SHTID"
              label="Vin"
              placeholder={
                sheets.length
                  ? "Rechercher un code vrac, une appellation…"
                  : "Aucune fiche"
              }
              options={sheetOptions}
              validate={validators.required("Choisissez un vin.")}
            />
            {notValidated && sheet && (
              <div className="vd-alert vd-alert--warning" role="status">
                <Icon iconName="triangle-exclamation" />
                <span>
                  <strong>Vin non validé par le marketing</strong> (statut :{" "}
                  {STATUS_LABELS[sheet.STATUS]}). La fiche sera générée à partir
                  de la saisie en cours, susceptible d'évoluer.
                </span>
              </div>
            )}
          </CustomFormSection>

          <CustomFormDivider />

          <CustomFormSection
            icon={<StepBadge step={2} />}
            title="Langue et modèle"
            description="Seuls les modèles compatibles avec la langue choisie sont proposés."
          >
            <CustomFormGrid
              columns="repeat(auto-fit, minmax(220px, 1fr))"
              gap={12}
            >
              <CustomFormSelect
                name="LNGCOD"
                label="Langue"
                placeholder={
                  content ? "Choisir une langue" : "Choisissez d'abord un vin"
                }
                options={lngOptions}
                disabled={!content}
                validate={validators.required("Choisissez une langue.")}
              />
              <CustomFormSelect
                name="TPLID"
                label="Modèle PowerPoint"
                placeholder={
                  hasCompatibleTemplate
                    ? "Choisir un modèle"
                    : "Aucun modèle actif pour cette langue"
                }
                options={tplOptions}
                filterOption={(option, v) => {
                  const lng = tplLanguage.get(option.value);
                  return !lng || lng === v.LNGCOD;
                }}
                validate={validators.required("Choisissez un modèle.")}
                helpText={template?.DESCR ?? undefined}
              />
            </CustomFormGrid>
            <div className="vd-section-actions">
              <CustomButton
                type="button"
                size="xs"
                variant="outline"
                leftIcon={<Icon iconName="eye" />}
                disabled={!template}
                loading={!!template && preview.loadingId === template.TPLID}
                title="Aperçu PDF du modèle rempli de faux texte (longueur max de chaque balise)"
                onClick={() => template && void preview.open(template.TPLID)}
              >
                Aperçu du modèle
              </CustomButton>
            </div>
          </CustomFormSection>

          <CustomFormDivider />

          <CustomFormSection
            icon={<StepBadge step={3} />}
            title="Format et options"
          >
            <div className="vd-generate__options">
              <div>
                <span className="vd-generate__label" id="vd-format-label">
                  Format de sortie
                </span>
                <CustomButtonGroup
                  menuStyle="segmented"
                  size={"sm"}
                  selectionMode="single"
                  selectedColor="success"
                  value={formApi.values["FORMAT"]}
                  onValueChange={(v) => {
                    if (typeof v !== "string") return;
                    formApi.setFieldValue("FORMAT", v);
                  }}
                >
                  {OUTPUT_FORMATS.map((f) => (
                    <CustomButton
                      value={f}
                      leftIcon={<Icon iconName={FORMAT_META[f].icon}></Icon>}
                    >
                      {FORMAT_META[f].label}
                    </CustomButton>
                  ))}
                </CustomButtonGroup>
              </div>

              <div>
                <span className="vd-generate__label">Logos</span>
                <CustomButtonGroup
                  attached
                  variant="danger-outline"
                  size="sm"
                  aria-label="Affichage"
                  selectedVariant="success-outline"
                  pressEffect={false}
                  selectionMode="multiple"
                  value={[
                    formApi.values["HVE"] ? "HVE" : undefined,
                    formApi.values["BIO"] ? "BIO" : undefined,
                  ].filter((v) => v !== undefined)}
                  onValueChange={(v) => {
                    if (!Array.isArray(v)) return;
                    // v = sélection complète après le clic, pas le bouton cliqué.
                    formApi.setFieldValue("HVE", v.includes("HVE"));
                    formApi.setFieldValue("BIO", v.includes("BIO"));
                  }}
                >
                  <CustomButton
                    value={"HVE"}
                    leftIcon={
                      <Icon
                        iconName={formApi.values["HVE"] ? "check" : "plus"}
                      ></Icon>
                    }
                  >
                    HVE
                  </CustomButton>
                  <CustomButton
                    value={"BIO"}
                    leftIcon={
                      <Icon
                        iconName={formApi.values["BIO"] ? "check" : "plus"}
                      ></Icon>
                    }
                  >
                    BIO
                  </CustomButton>
                </CustomButtonGroup>
              </div>
            </div>
            <p className="vd-muted vd-generate__hint">
              Formes « badge:HVE » / « badge:BIO » du modèle : retirées si le
              logo n'est pas sélectionné. Les deux sélectionnés : seul le logo
              combiné « badge:BIOHVE » est affiché (s'il existe dans le modèle).
            </p>

            <CustomFormFile
              name="PHOTO"
              label="Photo bouteille (optionnelle)"
              accept={PHOTO_ACCEPT}
              maxFileSize={PHOTO_MAX_SIZE}
              helpText="Remplace l'image « img:BOTTLEPHOTO » du modèle ; sinon l'image du modèle est conservée. 15 Mo max."
            />
          </CustomFormSection>
        </CustomFormSection>

        <CustomFormSection
          title="Contrôle et aperçu"
          icon={<Icon iconName="eye" />}
          description={
            notValidated
              ? "Contrôle des longueurs et saisie en cours (non validée) qui sera injectée dans le modèle."
              : "Contrôle des longueurs et contenu de la version validée qui sera injecté dans le modèle."
          }
        >
          {!content ? (
            <div className="section-placeholder">
              {source.loadingContent
                ? "Chargement de la fiche…"
                : "Choisissez un vin pour afficher l'aperçu."}
            </div>
          ) : !lngAvailable ? (
            <div className="section-placeholder">
              Choisissez une langue pour afficher l'aperçu.
            </div>
          ) : (
            <GenerationPreview
              sheet={content}
              translation={content.TRANSLATIONS[values.LNGCOD]}
              lng={values.LNGCOD}
              colors={colors}
              template={template}
              check={check}
              checking={source.checking}
            />
          )}
        </CustomFormSection>
      </div>

      <aside className="vd-generate__aside">
        <GenerationSummary
          sheet={sheet}
          template={template}
          source={source}
          result={result}
        />
      </aside>

      {preview.viewer.viewerProps && (
        <FileViewerModal {...preview.viewer.viewerProps} />
      )}
    </div>
  );
};

export default GenerationForm;
