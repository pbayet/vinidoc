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
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  languageName,
  sheetTitle,
} from "../lib/format";
import { templateLanguageLabel } from "../templates/templateUtils";
import { useTemplatePreview } from "../templates/useTemplatePreview";
import GenerationPreview from "./GenerationPreview";
import GenerationSummary from "./GenerationSummary";
import { contentSourceOf, useGenerationSource } from "./useGenerationSource";
import { useArticle } from "./useArticle";
import ArticleLogistics from "./ArticleLogistics";
import CorrectionModal from "./CorrectionModal";
import FreeFields from "./FreeFields";
import LocalSheetEditModal from "./LocalSheetEditModal";
import { useTemplateTags } from "./useTemplateTags";
import { useCancellableDelay } from "./useCancellableDelay";
import {
  CHECK_SECTION_ID,
  EMPTY_WARNING_CONTEXT,
  applyLocalChanges,
  checkWithOverrides,
  hasLocalChanges,
  FORMAT_META,
  OUTPUT_FORMATS,
  PACKAGING_META,
  PACKAGINGS,
  PHOTO_ACCEPT,
  PHOTO_MAX_SIZE,
  freeTagIssues,
  generationWarnings,
  initialGenerationValues,
  toGenerateRequest,
  type GenerationFormValues,
  type WarningContext,
} from "./generationValues";
import { useConfirm } from "@uvcdr/confirm-notify-system";
import type {
  CheckReport,
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
  /** Fiche modifiée depuis la page (correction des textes) : recharger les vins */
  onSheetsChanged: () => void;
}

/** Champs dont le changement rend obsolète le dernier fichier généré. */
const SOURCE_FIELDS: ReadonlyArray<keyof GenerationFormValues> = [
  "ARTICLE",
  "SHTID",
  "LNGCOD",
  "TPLID",
  "FREE",
  "LOGISTICS",
  "LOCAL",
];

/** Délai pendant lequel une génération demandée peut encore être annulée. */
const GENERATION_DELAY_SECONDS = 5;

/**
 * Formulaire de génération d'une fiche technique.
 *
 * Parcours : article PFI (facultatif) et vin → langue et modèle → format /
 * photo / logos. L'article restreint les vins aux fiches de ses codes vrac et
 * alimente les balises logistiques {{LOG.*}}. Une fiche
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
  onSheetsChanged,
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

  // Clic sur « Générer » par erreur : compte à rebours annulable avant
  // l'appel à l'API (une génération lancée ne peut plus être interrompue).
  const delay = useCancellableDelay(GENERATION_DELAY_SECONDS);

  // Balises du modèle et article chargés par le contenu du formulaire :
  // alertes recalculées sur les valeurs soumises.
  const warningContext = useRef<WarningContext>(EMPTY_WARNING_CONTEXT);
  const { confirm } = useConfirm();

  const handleSubmit = async (values: GenerationFormValues) => {
    const warnings = generationWarnings(values, warningContext.current);
    if (warnings.length) {
      // Alertes : confirmation explicite, qui tient lieu de délai d'annulation.
      const ok = await confirm({
        title: "Générer malgré les alertes ?",
        description: (
          <ul className="vd-confirm-list">
            {warnings.map((w) => (
              <li key={w.key}>{w.message}</li>
            ))}
          </ul>
        ),
        buttons: [
          { text: "Annuler", responseValue: false, variant: "outline" },
          {
            text: "Générer quand même",
            responseValue: true,
            variant: "warning",
          },
        ],
      });
      if (!ok) return;
    } else if (!(await delay.wait())) return;
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
          onSheetsChanged={onSheetsChanged}
          countdown={delay.remaining}
          onCancelGeneration={delay.cancel}
          warningContext={warningContext}
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
  onSheetsChanged: () => void;
  /** Secondes avant le lancement de la génération (null hors attente) */
  countdown: number | null;
  onCancelGeneration: () => void;
  /** Contexte des alertes, tenu à jour pour la confirmation à la soumission */
  warningContext: React.RefObject<WarningContext>;
}

const GenerationWorkspace: React.FC<GenerationWorkspaceProps> = ({
  sheets,
  templates,
  warningContext,
  result,
  formApi,
  onSheetsChanged,
  countdown,
  onCancelGeneration,
}) => {
  const api = useVinidocApi();
  const { languages, colors, defaultLng } = useVinidoc();
  const { values, setFieldValue } = useFormContext<GenerationFormValues>();
  const preview = useTemplatePreview();
  const sheet = sheets.find((s) => String(s.SHTID) === values.SHTID);
  // Le select ne propose d'office que les PFI du code vrac du vin (ouvert
  // par l'URL `?sheet=` ou déduit de l'article), y compris après le choix
  // d'un article : on peut ainsi changer de PFI pour le même vrac. Mémorisé
  // pour survivre à l'effacement de l'article (qui vide le vin). Taper une
  // recherche remplace ce filtre.
  const [vracFilter, setVracFilter] = useState("");
  const sheetVrac = sheet?.CODVRAC;
  useEffect(() => {
    if (sheetVrac) setVracFilter(sheetVrac);
  }, [sheetVrac]);
  const pfi = useArticle(api, values.ARTICLE, vracFilter);
  const template = templates.find(
    (t) =>
      String(t.TPLID) === values.TPLID &&
      (!t.LNGCOD || t.LNGCOD === values.LNGCOD),
  );

  const source = useGenerationSource({
    api,
    sheet,
    lng: values.LNGCOD,
    template,
    article: values.ARTICLE,
    // Fiche ajustée localement : contrôlée par l'API telle qu'elle sera générée.
    local: values.LOCAL,
  });

  const { content, availableLngs } = source;
  // Données logistiques corrigées : contrôle de l'API refait localement
  // (sans aller-retour à chaque frappe) ; c'est lui qui autorise la génération.
  const check = useMemo(
    () => checkWithOverrides(source.check, values.LOGISTICS),
    [source.check, values.LOGISTICS],
  );
  const effectiveSource = useMemo(() => ({ ...source, check }), [source, check]);
  const tplTags = useTemplateTags(api, template?.TPLID);

  // Ajustements de la fiche propres au vin et à la langue : oubliés s'ils changent.
  const [editingLocal, setEditingLocal] = useState(false);
  const localFor = useRef(`${values.SHTID}|${values.LNGCOD}`);
  useEffect(() => {
    const key = `${values.SHTID}|${values.LNGCOD}`;
    if (key === localFor.current) return;
    localFor.current = key;
    setFieldValue("LOCAL", null);
  }, [values.SHTID, values.LNGCOD, setFieldValue]);
  const localContent = useMemo(
    () => content && applyLocalChanges(content, values.LNGCOD, values.LOCAL),
    [content, values.LNGCOD, values.LOCAL],
  );

  // Alertes non bloquantes (récapitulatif) ; contexte partagé avec la
  // soumission pour la confirmation. Sans modèle : aucune alerte.
  const ctx = useMemo<WarningContext>(
    () =>
      template
        ? {
            freeTags: tplTags.freeTags,
            photoFrame: tplTags.photoFrame,
            logisticsTags: tplTags.logisticsTags,
            logistics: pfi.article?.LOGISTICS ?? null,
          }
        : EMPTY_WARNING_CONTEXT,
    [
      template,
      tplTags.freeTags,
      tplTags.photoFrame,
      tplTags.logisticsTags,
      pfi.article,
    ],
  );
  useEffect(() => {
    warningContext.current = ctx;
  }, [ctx, warningContext]);
  const warnings = generationWarnings(values, ctx);
  const notValidated = !!sheet && contentSourceOf(sheet) === "CURRENT";
  const lngAvailable = availableLngs.includes(values.LNGCOD);

  /* ───────────────────── Correction des textes (EF-53) ───────────────────── */

  // Textes bloquants pour le modèle choisi : corrigés dans une boîte de
  // dialogue, puis la génération reprend d'elle-même une fois le nouveau
  // contrôle conforme.
  const blockingTags =
    check?.TEMPLATES.find((t) => t.TPLID === template?.TPLID)?.ERRORS ?? [];
  const [correcting, setCorrecting] = useState(false);
  const resumeFrom = useRef<CheckReport | null | undefined>(undefined);
  const onCorrected = () => {
    setCorrecting(false);
    resumeFrom.current = source.check;
    onSheetsChanged();
  };
  useEffect(() => {
    if (
      resumeFrom.current === undefined ||
      !source.check ||
      source.check === resumeFrom.current
    )
      return;
    if (source.checking) return;
    resumeFrom.current = undefined;
    if (check?.OK && !freeTagIssues(tplTags.freeTags, values.FREE).length)
      void formApi.submitForm();
  }, [
    source.check,
    check,
    source.checking,
    formApi,
    tplTags.freeTags,
    values.FREE,
  ]);

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

  // Le vin se déduit de l'article : fiche de son code vrac, celle du même
  // millésime d'abord (première renvoyée par l'API). Article effacé : plus
  // de vin (sauf vin présélectionné par l'URL, tant qu'aucun article n'a été choisi).
  const articleSheet = pfi.article?.SHEETS[0];
  useEffect(() => {
    if (!pfi.article) return;
    const next = articleSheet ? String(articleSheet.SHTID) : "";
    if (next !== values.SHTID) setFieldValue("SHTID", next);
  }, [pfi.article, articleSheet, values.SHTID, setFieldValue]);

  // PFI dont aucun vrac n'a de fiche : non sélectionnable. Le select ne gère
  // pas d'option désactivée : le choix est annulé (retour à l'article
  // précédent) et expliqué, pour ne pas laisser croire que le PFI n'existe pas.
  const [refused, setRefused] = useState<{
    code: string;
    codvracs: string[];
  } | null>(null);
  const accepted = useRef(values.ARTICLE);
  useEffect(() => {
    const codvracs = pfi.noSheet.get(values.ARTICLE);
    if (values.ARTICLE && codvracs) {
      setRefused({ code: values.ARTICLE, codvracs });
      setFieldValue("ARTICLE", accepted.current);
      return;
    }
    accepted.current = values.ARTICLE;
    if (values.ARTICLE) setRefused(null);
  }, [values.ARTICLE, pfi.noSheet, setFieldValue]);

  const previousArticle = useRef(values.ARTICLE);
  useEffect(() => {
    const wasChosen =
      !!previousArticle.current && !pfi.noSheet.has(previousArticle.current);
    if (wasChosen && !values.ARTICLE) setFieldValue("SHTID", "");
    previousArticle.current = values.ARTICLE;
  }, [values.ARTICLE, pfi.noSheet, setFieldValue]);

  // Corrections logistiques propres à l'article : oubliées s'il change.
  const loadedArticle = pfi.article?.COD_ARTICLE;
  const correctedArticle = useRef(loadedArticle);
  useEffect(() => {
    if (!loadedArticle || loadedArticle === correctedArticle.current) return;
    correctedArticle.current = loadedArticle;
    setFieldValue("LOGISTICS", {});
  }, [loadedArticle, setFieldValue]);

  const otherVintage =
    !!pfi.article?.MILLESIME &&
    !!articleSheet &&
    articleSheet.MILLESIME !== pfi.article.MILLESIME;

  // Langue absente du contenu : langue par défaut, sinon la première.
  useEffect(() => {
    if (!content || availableLngs.includes(values.LNGCOD)) return;
    const next = availableLngs.includes(defaultLng)
      ? defaultLng
      : (availableLngs[0] ?? "");
    if (next !== values.LNGCOD) setFieldValue("LNGCOD", next);
  }, [content, availableLngs, defaultLng, values.LNGCOD, setFieldValue]);

  /* ───────────────────────── Options ───────────────────────── */

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
            title="Article"
            description="La fiche œnologique est celle du code vrac de l'article (même millésime en priorité) ; l'article renseigne aussi les données logistiques."
          >
            <CustomFormSelect
              name="ARTICLE"
              label="Article (PFI)"
              placeholder="Rechercher un PFI (code, libellé, code vrac)…"
              options={pfi.selectedOption}
              loadOptions={pfi.loadOptions}
              noOptionsMessage="Aucun article PFI"
              loading={pfi.loading}
              renderOption={(option) => {
                const codvracs = pfi.noSheet.get(option.value);
                const status = pfi.unvalidated.get(option.value);
                if (!codvracs && status) {
                  return (
                    <span
                      className="vd-article-option"
                      title="Fiche œnologique non validée par le marketing : générée depuis la saisie en cours."
                    >
                      <span>{option.label}</span>
                      <span
                        className={`vd-chip vd-chip--${STATUS_COLORS[status]}`}
                      >
                        <Icon iconName={STATUS_ICONS[status]} /> Non validée (
                        {STATUS_LABELS[status].toLowerCase()})
                      </span>
                    </span>
                  );
                }
                if (!codvracs) return option.label;
                const stop = (e: React.SyntheticEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                };
                return (
                  <span
                    className="vd-option-disabled"
                    aria-disabled="true"
                    title="Le vrac de ce PFI n'a pas de fiche œnologique : créez-la dans Œnologie."
                    onMouseDown={stop}
                    onClick={stop}
                  >
                    <span>{option.label}</span>
                    <span className="vd-chip vd-chip--muted">
                      <Icon iconName="ban" />
                      {codvracs.length
                        ? `Vrac ${codvracs.join(", ")} sans fiche`
                        : "Aucun vrac (VHL)"}
                    </span>
                  </span>
                );
              }}
              helpText={
                vracFilter
                  ? `Liste filtrée sur le code vrac ${vracFilter} (tapez pour chercher un autre article).`
                  : undefined
              }
              validate={validators.required(
                "Choisissez un article : il porte les données logistiques.",
              )}
            />
            {refused && (
              <div className="vd-alert vd-alert--danger" role="alert">
                <Icon iconName="ban" />
                <span>
                  <strong>Le PFI {refused.code} ne peut pas être choisi</strong>{" "}
                  :{" "}
                  {refused.codvracs.length
                    ? `le vrac ${refused.codvracs.join(", ")} n'a pas de fiche œnologique`
                    : "il n'a aucun code vrac (composant VHL)"}
                  . Créez la fiche dans Œnologie pour pouvoir générer.
                </span>
              </div>
            )}
            {pfi.article && pfi.article.SHEETS.length === 0 && (
              <div className="vd-alert vd-alert--danger" role="alert">
                <Icon iconName="circle-xmark" />
                <span>
                  <strong>
                    Aucune fiche œnologique pour l'article{" "}
                    {pfi.article.COD_ARTICLE}
                  </strong>{" "}
                  :{" "}
                  {pfi.article.CODVRACS.length
                    ? `le code vrac ${pfi.article.CODVRACS.join(", ")} n'existe pas dans les fiches œnologiques`
                    : "il n'a aucun code vrac (composant VHL)"}
                  . Créez la fiche dans Œnologie pour pouvoir générer.
                </span>
              </div>
            )}
            {sheet && (
              <div className="vd-alert vd-alert--info" role="status">
                <Icon iconName="wine-bottle" />
                <span>
                  Fiche œnologique : <strong>{sheetTitle(sheet)}</strong> —{" "}
                  {sheet.APPELL}
                  {sheet.LIBELLE ? ` — ${sheet.LIBELLE}` : ""}
                </span>
              </div>
            )}
            {sheet && !values.ARTICLE && (
              <div className="vd-alert vd-alert--danger" role="alert">
                <Icon iconName="truck" />
                <span>
                  <strong>Aucun article PFI sélectionné</strong> : les données
                  logistiques ne sont pas chargées. Choisissez l'article du code
                  vrac {sheet.CODVRAC} pour pouvoir générer.
                </span>
              </div>
            )}
            {otherVintage && (
              <div className="vd-alert vd-alert--warning" role="status">
                <Icon iconName="triangle-exclamation" />
                <span>
                  Aucune fiche du millésime {pfi.article?.MILLESIME} : la fiche{" "}
                  {articleSheet?.MILLESIME ?? "non millésimée"} du même code
                  vrac est utilisée.
                </span>
              </div>
            )}
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
            {pfi.article && (
              <ArticleLogistics
                fields={pfi.article.LOGISTICS}
                overrides={values.LOGISTICS}
                onChange={(next) => setFieldValue("LOGISTICS", next)}
              />
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
                  content
                    ? "Choisir une langue"
                    : "Choisissez d'abord un article"
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

          {template && tplTags.freeTags.length > 0 && (
            <>
              <CustomFormSection
                icon={<StepBadge step={3} />}
                title="Champs libres"
                description="Textes propres à cette génération, injectés dans les balises {{FREE.*}} du modèle (non enregistrés sur la fiche)."
              >
                <FreeFields template={template} tags={tplTags.freeTags} />
              </CustomFormSection>

              <CustomFormDivider />
            </>
          )}

          <CustomFormSection
            icon={<StepBadge step={tplTags.freeTags.length ? 4 : 3} />}
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
                  variant="danger-outline"
                  size="sm"
                  aria-label="Affichage"
                  selectedVariant="success-outline"
                  pressEffect={false}
                  selectionMode="multiple"
                  shape="pill"
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
                    leftIcon={<Icon iconName={"shield-halved"}></Icon>}
                  >
                    HVE
                  </CustomButton>
                  <CustomButton
                    value={"BIO"}
                    leftIcon={<Icon iconName={"leaf"}></Icon>}
                  >
                    BIO
                  </CustomButton>
                </CustomButtonGroup>
                <p className="vd-muted vd-generate__hint">
                  Formes « badge:HVE » / « badge:BIO » du modèle : retirées si
                  le logo n'est pas sélectionné. Les deux sélectionnés : seul le
                  logo combiné « badge:BIOHVE » est affiché (s'il existe dans le
                  modèle).
                </p>
              </div>

              <div>
                <span className="vd-generate__label">Conditionnement</span>
                <CustomButtonGroup
                  menuStyle="segmented"
                  size={"sm"}
                  selectionMode="single"
                  selectedColor="success"
                  value={formApi.values["PACKAGING"]}
                  onValueChange={(v) => {
                    if (typeof v !== "string") return;
                    formApi.setFieldValue("PACKAGING", v);
                  }}
                >
                  {PACKAGINGS.map((p) => (
                    <CustomButton
                      value={p}
                      leftIcon={<Icon iconName={PACKAGING_META[p].icon}></Icon>}
                    >
                      {PACKAGING_META[p].label}
                    </CustomButton>
                  ))}
                </CustomButtonGroup>
                <p className="vd-muted vd-generate__hint">
                  Groupes « badge:PHOTO_BOUTEILLE » / « badge:PHOTO_BIB » / «
                  badge:PHOTO_CANETTE » du modèle : seul celui du
                  conditionnement choisi est conservé. Format de photo attendu :{" "}
                  {PACKAGING_META[formApi.values["PACKAGING"]].ratio}, fond
                  transparent.
                </p>
              </div>
            </div>

            <CustomFormFile
              name="PHOTO"
              label="Photo produit (optionnelle)"
              accept={PHOTO_ACCEPT}
              maxFileSize={PHOTO_MAX_SIZE}
              helpText="Remplace l'image « img:BOTTLEPHOTO » du modèle (ajustée sans être rognée) ; sinon l'image du modèle est conservée. 15 Mo max."
            />
          </CustomFormSection>
        </CustomFormSection>

        <CustomFormSection
          id={CHECK_SECTION_ID}
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
                : "Choisissez un article pour afficher l'aperçu."}
            </div>
          ) : !lngAvailable ? (
            <div className="section-placeholder">
              Choisissez une langue pour afficher l'aperçu.
            </div>
          ) : (
            <>
              <div className="vd-local-sheet">
                <CustomButton
                  type="button"
                  size="xs"
                  variant="outline"
                  leftIcon={<Icon iconName="pen-to-square" />}
                  title="Modifier la fiche pour cette génération uniquement (rien n'est enregistré)"
                  onClick={() => setEditingLocal(true)}
                >
                  Ajuster la fiche localement
                </CustomButton>
                {hasLocalChanges(values.LOCAL) && (
                  <>
                    <span className="vd-chip vd-chip--warning">
                      <Icon iconName="pen" /> Fiche ajustée pour cette
                      génération (
                      {[
                        values.LOCAL?.SHEET && "caractéristiques",
                        values.LOCAL?.TRANSLATION &&
                          `textes ${values.LNGCOD.toUpperCase()}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      )
                    </span>
                    <CustomButton
                      type="button"
                      size="xs"
                      variant="link"
                      leftIcon={<Icon iconName="rotate-left" />}
                      onClick={() => setFieldValue("LOCAL", null)}
                    >
                      Retirer les ajustements
                    </CustomButton>
                  </>
                )}
              </div>
              <GenerationPreview
                sheet={localContent ?? content}
                translation={
                  (localContent ?? content).TRANSLATIONS[values.LNGCOD]
                }
                lng={values.LNGCOD}
                colors={colors}
                template={template}
                check={check}
                checking={source.checking}
              />
            </>
          )}
        </CustomFormSection>
      </div>

      <aside className="vd-generate__aside">
        <GenerationSummary
          sheet={sheet}
          template={template}
          source={effectiveSource}
          article={pfi.article}
          articleLoading={pfi.loading}
          freeTags={tplTags.freeTags}
          warnings={warnings}
          countdown={countdown}
          onCancelGeneration={onCancelGeneration}
          result={result}
          onCorrect={
            blockingTags.length ? () => setCorrecting(true) : undefined
          }
        />
      </aside>

      {editingLocal && content && lngAvailable && (
        <LocalSheetEditModal
          content={content}
          lng={values.LNGCOD}
          local={values.LOCAL}
          onApply={(local) => setFieldValue("LOCAL", local)}
          onClose={() => setEditingLocal(false)}
        />
      )}

      {correcting && sheet && template && (
        <CorrectionModal
          SHTID={sheet.SHTID}
          lng={values.LNGCOD}
          template={template}
          errors={blockingTags}
          onClose={() => setCorrecting(false)}
          onCorrected={onCorrected}
        />
      )}

      {preview.viewer.viewerProps && (
        <FileViewerModal {...preview.viewer.viewerProps} />
      )}
    </div>
  );
};

export default GenerationForm;
