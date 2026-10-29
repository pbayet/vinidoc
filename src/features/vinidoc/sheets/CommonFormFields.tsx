import React, { useEffect, useMemo } from "react";
import {
  CustomFormGrid,
  CustomFormInput,
  CustomFormSelect,
  useField,
  useFormContext,
  validators,
  type SelectOption,
} from "@uvcdr/custom-form-system";
import ScaleInput from "../ui/ScaleInput";
import { useVinidoc } from "../context/VinidocContext";
import { SCALES, colorLabel, mouthScaleLabels } from "../lib/format";
import { codvracValidator, type CommonFormValues } from "./commonForm";

// Champs CustomForm des caractéristiques communes, partagés par la création
// (SheetCreateForm) et l'édition (CommonFieldsCard). Valeurs, conversions et
// validations : ./commonForm.ts

/* ───────────────────────────── Champs connectés ───────────────────────────── */

/** Échelle à niveaux branchée sur le formulaire. */
const FormScale: React.FC<{
  name: string;
  label: string;
  steps: readonly number[];
  minLabel?: string;
  maxLabel?: string;
}> = ({ name, ...props }) => {
  const field = useField<number | null>(name);
  return <ScaleInput {...props} value={field.value ?? null} readOnly={field.disabled} onChange={field.setValue} />;
};

/** Garde-fou : quitter l'onglet avec une saisie en cours. */
export const UnsavedChangesGuard: React.FC = () => {
  const { dirty, submitting } = useFormContext();
  useEffect(() => {
    if (!dirty || submitting) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, submitting]);
  return null;
};

/**
 * Champs des caractéristiques communes : identité du vin, températures,
 * échelles (les cépages sont saisis avec les textes traduisibles). À placer sous un <CustomForm> dont les valeurs
 * contiennent CommonFormValues.
 */
const CommonFormFields: React.FC<{
  /** Code vrac non modifiable (ajustement local d'une génération : il relie la fiche à l'article) */
  lockCodvrac?: boolean;
}> = ({ lockCodvrac = false }) => {
  const { colors, defaultLng } = useVinidoc();
  const { values } = useFormContext<CommonFormValues>();

  const colorOptions: SelectOption[] = useMemo(
    () => colors.map((c) => ({ type: "option", value: c.COLCOD, label: colorLabel(colors, c.COLCOD, defaultLng) })),
    [colors, defaultLng],
  );
  const mouth = mouthScaleLabels(colors, values.COLCOD, defaultLng);

  return (
    <>
      <CustomFormGrid columns="repeat(auto-fit, minmax(320px, 1fr))">
        <CustomFormInput
          name="CODVRAC"
          label="Code vrac"
          maxLength={30}
          placeholder="ex. VHL12345"
          validate={codvracValidator}
          disabled={lockCodvrac}
          helpText={lockCodvrac ? "Non modifiable : relie la fiche à l'article PFI." : undefined}
        />
        <CustomFormInput
          name="MILLESIME"
          label="Millésime"
          type="number"
          min={1900}
          max={2200}
          placeholder="Vide = non millésimé"
          validate={validators.compose(validators.min(1900, "Millésime invalide."), validators.max(2200, "Millésime invalide."))}
        />
        <CustomFormInput name="APPELL" label="Appellation" maxLength={100} placeholder="ex. CDR" validate={validators.required("L'appellation est obligatoire.")} />
        <CustomFormSelect name="COLCOD" label="Couleur" options={colorOptions} placeholder="Choisir une couleur" validate={validators.required("La couleur est obligatoire.")} />
        <CustomFormInput name="DESCVRAC" label="Description vrac" maxLength={100} placeholder="ex. STANDARD" />
        <CustomFormGrid columns={2} gap={8}>
          <CustomFormInput name="TEMPMIN" label="Temp. dégust. min (°C)" type="number" step={0.5} />
          <CustomFormInput name="TEMPMAX" label="Temp. dégust. max (°C)" type="number" step={0.5} />
        </CustomFormGrid>
      </CustomFormGrid>

      <div className="vd-scales">
        {SCALES.map((s) => (
          <FormScale
            key={s.key}
            name={s.key}
            label={s.label}
            steps={s.steps}
            minLabel={s.key === "INTBOU" ? mouth.min : s.min}
            maxLabel={s.key === "INTBOU" ? mouth.max : s.max}
          />
        ))}
      </div>
    </>
  );
};

export default CommonFormFields;
