import React, { useEffect, useMemo, type Ref } from "react";
import {
  CustomForm,
  CustomFormReset,
  CustomFormSubmit,
  type CustomFormHandle,
  Icon,
  useFormContext,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import CommonFormFields from "./CommonFormFields";
import {
  commonToForm,
  formToCommon,
  uppercaseCodvrac,
  validateCommonForm,
  type CommonFormValues,
} from "./commonForm";
import type { SheetCommon } from "../../../entities/vinidoc/vinidoc.types";

interface CommonFieldsCardProps {
  /** Caractéristiques enregistrées (référence pour « modifié » et « Annuler ») */
  value: SheetCommon;
  readOnly: boolean;
  /** Enregistre puis recharge la fiche ; la carte se réinitialise sur la nouvelle valeur. */
  onSave: (value: SheetCommon) => Promise<void>;
  /** Informe le parent d'une saisie non enregistrée (garde-fou de soumission). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Accès au formulaire (enregistrement général depuis SheetEditor). */
  formRef?: Ref<CustomFormHandle<CommonFormValues>>;
}

/** Remonte l'état « modifié » du formulaire au parent. */
const DirtyReporter: React.FC<{ onChange?: (dirty: boolean) => void }> = ({
  onChange,
}) => {
  const { dirty } = useFormContext();
  useEffect(() => {
    onChange?.(dirty);
  }, [dirty, onChange]);
  useEffect(() => () => onChange?.(false), [onChange]);
  return null;
};

/**
 * Caractéristiques communes à toutes les langues (édition d'une fiche
 * existante) : identité du vin, températures, échelles, cépages.
 */
const CommonFieldsCard: React.FC<CommonFieldsCardProps> = ({
  value,
  readOnly,
  onSave,
  onDirtyChange,
  formRef,
}) => {
  // Référence stable tant que le contenu enregistré ne change pas : un
  // rechargement de la fiche pour une autre raison (traduction enregistrée)
  // ne réinitialise pas une saisie en cours.
  const valueKey = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => commonToForm(value), [valueKey]);

  return (
    <CustomForm<CommonFormValues>
      ref={formRef}
      className="section-grid--full"
      initialValues={initial}
      defaultValues={initial}
      enableReinitialize
      disabled={readOnly}
      validate={validateCommonForm}
      onChange={uppercaseCodvrac}
      onSubmit={(v) => onSave(formToCommon(v))}
      inputSize="xs"
    >
      {(form) => (
        <CustomFormSection
          title="Caractéristiques"
          icon={<Icon iconName="id-card" />}
          description="Données communes à toutes les langues."
        >
          <DirtyReporter onChange={onDirtyChange} />
          <CommonFormFields />
          {!readOnly && (
            <div className="vd-section-actions">
              {form.dirty && (
                <CustomFormReset
                  shortcut="Mod+Z"
                  bindShortcut
                  size="xs"
                  variant="danger-outline"
                  leftIcon={<Icon iconName="rotate-left" />}
                >
                  Annuler
                </CustomFormReset>
              )}
              <CustomFormSubmit
                size="xs"
                variant="primary"
                leftIcon={<Icon iconName="floppy-disk" />}
                disabled={!form.dirty || !form.isValid || form.submitting}
              >
                Enregistrer
              </CustomFormSubmit>
            </div>
          )}
        </CustomFormSection>
      )}
    </CustomForm>
  );
};

export default CommonFieldsCard;
