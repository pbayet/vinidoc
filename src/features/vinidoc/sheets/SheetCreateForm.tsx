import React, { useEffect, useState } from "react";
import { Modal, ModalBody } from "@uvcdr/modal";
import { useConfirm } from "@uvcdr/confirm-notify-system";
import {
  CustomButton,
  CustomForm,
  CustomFormError,
  Icon,
  useField,
  useFormContext,
} from "@uvcdr/custom-form-system";
import SectionCard from "../../../shared/ui/SectionCard/ui/SectionCard";
import LimitedTextarea from "../ui/LimitedTextarea";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { TRANSLATION_LABELS, languageName } from "../lib/format";
import {
  TRANSLATION_FIELDS,
  type TranslationField,
} from "../../../entities/vinidoc/vinidoc.types";
import CommonFormFields, { UnsavedChangesGuard } from "./CommonFormFields";
import {
  EMPTY_COMMON_VALUES,
  formToCommon,
  uppercaseCodvrac,
  validateCommonForm,
  type CommonFormValues,
} from "./commonForm";

/* ───────────────────────────── Valeurs du formulaire ───────────────────────────── */

type SheetCreateValues = CommonFormValues & Record<TranslationField, string>;

const INITIAL_VALUES: SheetCreateValues = {
  ...EMPTY_COMMON_VALUES,
  ...(Object.fromEntries(TRANSLATION_FIELDS.map((f) => [f, ""])) as Record<
    TranslationField,
    string
  >),
};

/* ───────────────────────────── Champs connectés ───────────────────────────── */

/** Texte traduisible avec compteur face aux longueurs max des modèles actifs. */
const FormLimitedText: React.FC<{ name: TranslationField }> = ({ name }) => {
  const { mergeFields } = useVinidoc();
  const field = useField<string>(name);
  const meta = TRANSLATION_LABELS[name];
  const limit = mergeFields?.TEXT.find((f) => f.SHEETFIELD === name);
  return (
    <LimitedTextarea
      label={meta.label}
      rows={meta.rows}
      hardMax={meta.max}
      hint={meta.hint}
      templateMax={limit?.MAXLEN}
      limits={limit?.LIMITS}
      readOnly={field.disabled}
      value={field.value ?? ""}
      onChange={field.setValue}
    />
  );
};

/** Id du `<form>` : le bouton « Créer la fiche » est dans l'en-tête de la modale, hors du formulaire. */
const FORM_ID = "vd-sheet-create-form";

/** Remonte l'état « saisie en cours » du formulaire (confirmation à la fermeture). */
const DirtyReporter: React.FC<{ onChange: (dirty: boolean) => void }> = ({
  onChange,
}) => {
  const { dirty, submitting } = useFormContext();
  useEffect(
    () => onChange(dirty && !submitting),
    [dirty, submitting, onChange],
  );
  return null;
};

/* ───────────────────────────── Modale ───────────────────────────── */

interface SheetCreateFormProps {
  /** Fiche créée : ouverture de son édition (`/oenologie/:shtid`) */
  onCreated: (SHTID: number) => void;
  /** Fermeture de la modale (retour à la liste) */
  onClose: () => void;
}

/**
 * Création d'une fiche œnologique : caractéristiques communes + textes dans
 * la langue de référence. Les traductions s'ajoutent ensuite depuis la fiche.
 *
 * Affichée en modale au-dessus de la liste, ouverte par la route
 * `/oenologie/new` — cf. SheetsList.
 */
const SheetCreateForm: React.FC<SheetCreateFormProps> = ({
  onCreated,
  onClose,
}) => {
  const api = useVinidocApi();
  const { confirm } = useConfirm();
  const { defaultLng, languages } = useVinidoc();
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fermeture : confirmation si une saisie est en cours.
  const requestClose = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Abandonner la création ?",
        description: "La saisie en cours sera perdue.",
        type: "discardcancel",
      });
      if (!ok) return;
    }
    onClose();
  };

  const submit = async (v: SheetCreateValues) => {
    const translation = Object.fromEntries(
      TRANSLATION_FIELDS.map((f) => [f, v[f].trim() || null]),
    ) as Record<TranslationField, string | null>;
    const hasText = Object.values(translation).some((t) => t != null);

    setSubmitting(true);
    try {
      const state = await api.createSheet(
        {
          ...formToCommon(v),
          TRANSLATION: hasText ? translation : undefined,
        },
        { successMessage: "Fiche créée." },
      );
      onCreated(state.SHTID);
    } catch {
      /* toast déjà affiché */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => void requestClose()}
      title="Nouvelle fiche œnologique"
      size="xl"
      preventClose={submitting}
      headerActions={
        <>
          <CustomButton
            size="xs"
            variant="ghost"
            disabled={submitting}
            onClick={() => void requestClose()}
          >
            Annuler
          </CustomButton>
          <CustomButton
            type="submit"
            form={FORM_ID}
            size="xs"
            variant="success"
            leftIcon={<Icon iconName="plus" />}
            loading={submitting}
            disabled={submitting}
          >
            Créer la fiche
          </CustomButton>
        </>
      }
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text">
          <CustomForm<SheetCreateValues>
            id={FORM_ID}
            initialValues={INITIAL_VALUES}
            defaultValues={INITIAL_VALUES}
            validate={validateCommonForm}
            onChange={uppercaseCodvrac}
            onSubmit={submit}
            inputSize="xs"
          >
            <UnsavedChangesGuard />
            <DirtyReporter onChange={setDirty} />

            <div className="section-grid">
              <SectionCard
                title="Caractéristiques"
                icon="id-card"
                className="section-grid--full"
                description="Données communes à toutes les langues."
              >
                <CommonFormFields />
              </SectionCard>

              <SectionCard
                title="Textes"
                icon="language"
                className="section-grid--full"
                description={`Textes en ${languageName(languages, defaultLng)} (langue de référence). Les traductions pourront être ajoutées après la création.`}
              >
                <div className="vd-texts">
                  {TRANSLATION_FIELDS.map((f) => (
                    <FormLimitedText key={f} name={f} />
                  ))}
                </div>
              </SectionCard>
            </div>

            <CustomFormError />
          </CustomForm>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default SheetCreateForm;
