import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, ModalBody } from "@uvcdr/modal";
import {
  CustomButton,
  CustomForm,
  CustomFormCheckBox,
  CustomFormCheckBoxButton,
  CustomFormDivider,
  CustomFormFile,
  CustomFormGrid,
  CustomFormInput,
  CustomFormList,
  CustomFormSection,
  CustomFormSelect,
  CustomFormTextarea,
  FileAttachmentCards,
  Icon,
  useFormContext,
  validators,
} from "@uvcdr/custom-form-system";
import { useConfirm, useNotification } from "@uvcdr/confirm-notify-system";
import StepBadge from "../ui/StepBadge";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { PPTX_MAX_SIZE } from "./TemplateImportModal";
import { languageOptions, toTemplateViewerFile } from "./templateUtils";
import { useTemplateInspection } from "./useTemplateInspection";
import TemplateInspectionView from "./TemplateInspectionView";
import TemplateEditSummary from "./TemplateEditSummary";
import {
  changedTagKeys,
  metaChanged,
  otherTagsOf,
  tagKey,
  templateToForm,
  toTagsRequest,
  toUpdateRequest,
  validateMaxLen,
  validateTemplateForm,
  type TagFormRow,
  type TemplateEditFormValues,
} from "./templateEditValues";
import type { Template } from "../../../entities/vinidoc/vinidoc.types";

interface TemplateEditModalProps {
  /** Modèle à modifier (route `/modeles/:tplid`) */
  TPLID: number;
  /** Fermeture (retour à `/modeles`) */
  onClose: () => void;
}

/**
 * Administration d'un modèle, en modale au-dessus de la liste. Ouverte par
 * la route `/modeles/:tplid` (cf. ModelesPage).
 *
 * Parcours : informations → fichier (remplacement optionnel, analysé dès le
 * choix) → longueur max et caractère obligatoire des balises texte. Un seul
 * enregistrement applique, dans l'ordre, les blocs modifiés : métadonnées,
 * balises, puis fichier (les réglages des balises toujours présentes sont
 * conservés au remplacement).
 */
const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  TPLID,
  onClose,
}) => {
  const api = useVinidocApi();
  const { confirm } = useConfirm();
  const { notifySuccess } = useNotification();

  const [tpl, setTpl] = useState<Template | null>(null);
  const [lastDiff, setLastDiff] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  // Dernier ROWVER connu : mis à jour à chaque étape réussie, pour qu'un
  // nouvel essai après un échec partiel ne parte pas d'une version périmée.
  const rowver = useRef("");

  const load = useCallback(async () => {
    try {
      const t = await api.getTemplate(TPLID);
      rowver.current = t.ROWVER;
      setTpl(t);
    } catch {
      onClose();
    }
  }, [api, TPLID, onClose]);

  useEffect(() => {
    void load();
  }, [load]);

  // Référence stable tant que le modèle enregistré ne change pas.
  const initial = useMemo(() => (tpl ? templateToForm(tpl) : null), [tpl]);

  if (!tpl || !initial) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Modèle PowerPoint"
        size="xl"
        closeOnOverlayClick={false}
      >
        <ModalBody>
          <div className="vd-empty">Chargement…</div>
        </ModalBody>
      </Modal>
    );
  }

  const handleSubmit = async (values: TemplateEditFormValues) => {
    const saveMeta = metaChanged(values, tpl);
    const saveTags = changedTagKeys(values, tpl).size > 0;
    const file = values.FILE;
    if (!saveMeta && !saveTags && !file) return;

    setSaving(true);
    try {
      let latest = tpl;
      if (saveMeta) {
        latest = await api.updateTemplate(
          TPLID,
          toUpdateRequest(values, rowver.current),
        );
        rowver.current = latest.ROWVER;
      }
      if (saveTags) {
        latest = await api.setTemplateTags(TPLID, toTagsRequest(values));
        rowver.current = latest.ROWVER ?? rowver.current;
      }
      if (file) {
        setLastDiff(await api.replaceTemplateFile(TPLID, file));
        latest = await api.getTemplate(TPLID);
        rowver.current = latest.ROWVER;
      } else {
        setLastDiff(null);
      }
      // Réinitialise le formulaire sur la version enregistrée.
      setTpl(latest);
      notifySuccess("Modèle enregistré.");
    } catch {
      /* toast déjà affiché — la saisie est conservée pour un nouvel essai */
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Supprimer ce modèle ?",
      description:
        "Il ne sera plus proposé pour la génération. L'historique des fiches déjà générées est conservé.",
      type: "deletecancel",
    });
    if (!ok) return;
    try {
      await api.deleteTemplate(TPLID, { setLoading: setSaving });
      notifySuccess("Modèle supprimé.");
      onClose();
    } catch {
      /* toast déjà affiché */
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={tpl.TPLNAM}
      size="xl"
      preventClose={saving}
      headerActions={
        <CustomButton
          size="xs"
          variant="danger-outline"
          leftIcon={<Icon iconName="trash" />}
          disabled={saving}
          onClick={() => void remove()}
        >
          Supprimer
        </CustomButton>
      }
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <CustomForm<TemplateEditFormValues>
          initialValues={initial}
          defaultValues={initial}
          enableReinitialize
          validate={validateTemplateForm}
          onSubmit={handleSubmit}
          loading={saving}
          inputSize="xs"
        >
          <TemplateEditWorkspace template={tpl} lastDiff={lastDiff} />
        </CustomForm>
      </ModalBody>
    </Modal>
  );
};

/* ───────────────────────── Contenu du formulaire ───────────────────────── */

interface TemplateEditWorkspaceProps {
  template: Template;
  lastDiff: Template | null;
}

const TemplateEditWorkspace: React.FC<TemplateEditWorkspaceProps> = ({
  template,
  lastDiff,
}) => {
  const { languages, mergeFields } = useVinidoc();
  const { values } = useFormContext<TemplateEditFormValues>();
  const inspection = useTemplateInspection(values.FILE);

  const lngOptions = useMemo(() => languageOptions(languages), [languages]);
  const changed = changedTagKeys(values, template);
  const otherTags = otherTagsOf(template);
  const fieldLabel = (tag: string) =>
    mergeFields?.TEXT.find((f) => f.TAG === tag)?.LABEL;

  return (
    <div className="vd-generate vd-dark-text">
      <div className="vd-generate__main">
        <CustomFormSection
          title="Paramètres du modèle"
          icon={<Icon iconName="sliders" />}
          description="Les modifications sont appliquées ensemble depuis le récapitulatif."
        >
          <CustomFormSection
            icon={<StepBadge step={1} />}
            title="Informations"
            description="Un modèle inactif n'est plus proposé à la génération."
          >
            <CustomFormGrid
              columns="repeat(auto-fit, minmax(220px, 1fr))"
              gap={12}
            >
              <CustomFormInput
                name="TPLNAM"
                label="Nom"
                maxLength={150}
                validate={validators.required(
                  "Le nom du modèle est obligatoire.",
                )}
              />
              <CustomFormSelect
                name="LNGCOD"
                label="Langue"
                placeholder="Toutes les langues"
                options={lngOptions}
                helpText="Vide : modèle proposé pour toutes les langues."
              />
            </CustomFormGrid>
            <CustomFormTextarea
              name="DESCR"
              label="Description"
              rows={2}
              maxLength={1000}
              validate={validators.maxLength(1000)}
            />
            <div className="vd-generate__choices">
              <CustomFormCheckBoxButton
                name="ACTIVE"
                label="Modèle actif"
                states={{
                  unchecked: { variant: "neutral", icon: "eye-slash" },
                  checked: { variant: "success", icon: "check" },
                }}
              />
            </div>
          </CustomFormSection>

          <CustomFormDivider />

          <CustomFormSection
            icon={<StepBadge step={2} />}
            title="Fichier"
            description="Remplacer le fichier conserve les réglages des balises toujours présentes."
          >
            {template.FILEURL && (
              <FileAttachmentCards
                files={[
                  toTemplateViewerFile({
                    ...template,
                    FILEURL: template.FILEURL,
                  }),
                ]}
              />
            )}
            <CustomFormFile
              name="FILE"
              label="Nouveau fichier .pptx (optionnel)"
              accept=".pptx"
              maxFileSize={PPTX_MAX_SIZE}
              helpText="Le fichier est analysé dès sa sélection ; il remplace l'actuel à l'enregistrement."
            />
            <TemplateInspectionView state={inspection} />
          </CustomFormSection>

          <CustomFormDivider />

          <CustomFormSection
            icon={<StepBadge step={3} />}
            title="Balises texte"
            description="Longueur max (en caractères, retours à la ligne comptés 1) et caractère obligatoire de chaque balise. Une fiche qui dépasse ne pourra pas être générée avec ce modèle."
          >
            {values.TAGS.length === 0 ? (
              <p className="vd-muted">
                Aucune balise texte détectée dans ce modèle.
              </p>
            ) : (
              <CustomFormList<TagFormRow>
                name="TAGS"
                className="vd-tag-list"
                header={() => (
                  <div className="vd-tag-row vd-tag-row--head" aria-hidden>
                    <span>Balise</span>
                    <span>Contenu</span>
                    <span className="vd-num">Longueur max</span>
                    <span>Obligatoire</span>
                  </div>
                )}
              >
                {({ item }) => {
                  const key = tagKey(item);
                  const cls = [
                    "vd-tag-row",
                    !item.ISKNOWN && "vd-tag-row--warning",
                    changed.has(key) && "vd-tag-row--changed",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div className={cls}>
                      <code>{`{{${item.TAGNAM}}}`}</code>
                      <span>
                        {item.ISKNOWN ? (
                          fieldLabel(item.TAGNAM)
                        ) : (
                          <span
                            className="vd-chip vd-chip--warning"
                            title="Absente du catalogue : rendue vide. Renommez-la dans le modèle."
                          >
                            Inconnue
                          </span>
                        )}
                      </span>
                      <CustomFormInput
                        name="MAXLEN"
                        type="number"
                        min={1}
                        placeholder="Illimité"
                        aria-label={`Longueur max de ${item.TAGNAM}`}
                        disabled={!item.ISKNOWN}
                        validate={validateMaxLen}
                        className="vd-maxlen"
                      />
                      <CustomFormCheckBox
                        name="REQUIRED"
                        label=""
                        aria-label={`${item.TAGNAM} obligatoire`}
                        disabled={!item.ISKNOWN}
                      />
                    </div>
                  );
                }}
              </CustomFormList>
            )}

            {otherTags.length > 0 && (
              <>
                <h5 className="vd-subtitle">Images et blocs conditionnels</h5>
                <div>
                  {otherTags.map((g) => (
                    <span
                      key={tagKey(g)}
                      className={`vd-chip ${g.ISKNOWN ? "" : "vd-chip--warning"}`}
                      title={g.ISKNOWN ? "" : "Inconnue du catalogue"}
                    >
                      {g.TAGTYP === "IMAGE" ? "img:" : "badge:"}
                      {g.TAGNAM}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CustomFormSection>
        </CustomFormSection>
      </div>

      <aside className="vd-generate__aside">
        <TemplateEditSummary
          template={template}
          inspection={inspection}
          lastDiff={lastDiff}
        />
      </aside>
    </div>
  );
};

export default TemplateEditModal;
