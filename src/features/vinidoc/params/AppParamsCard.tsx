import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CustomForm,
  CustomFormGrid,
  CustomFormInput,
  CustomFormReset,
  CustomFormSection,
  CustomFormSubmit,
  Icon,
  validators,
} from "@uvcdr/custom-form-system";
import { useWebSocket } from "../../../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { formatDateTime } from "../lib/format";
import type { AppParam } from "../../../entities/vinidoc/vinidoc.types";

type ParamValues = Record<string, number | "">;

/**
 * Paramètres de l'application, modifiables sans développement : calculs
 * logistiques (masse volumique du vin, support palette — EF-16 / EF-17) et
 * durée d'inactivité libérant la réservation d'une fiche (RG-04).
 * Consultables par tous ; modifiables avec le droit PARAMS.
 */
const AppParamsCard: React.FC = () => {
  const api = useVinidocApi();
  const { rights } = useVinidoc();
  const [params, setParams] = useState<AppParam[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setParams(await api.getParams({ silentError: true }));
      setError(false);
    } catch {
      setError(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);
  useWebSocket("vinidoc.params.updated", useCallback(() => void load(), [load]));

  const initial = useMemo<ParamValues>(
    () => Object.fromEntries((params ?? []).map((p) => [p.PRMKEY, p.PRMVAL])),
    [params],
  );

  const save = async (values: ParamValues) => {
    if (!params) return;
    const changed = params
      .filter((p) => values[p.PRMKEY] !== "" && Number(values[p.PRMKEY]) !== p.PRMVAL)
      .map((p) => ({ PRMKEY: p.PRMKEY, PRMVAL: Number(values[p.PRMKEY]) }));
    if (!changed.length) return;
    try {
      setParams(await api.updateParams(changed, { successMessage: "Paramètres enregistrés." }));
    } catch {
      /* toast déjà affiché */
    }
  };

  const lastChange = params
    ?.filter((p) => p.MODUSR !== "init")
    .sort((a, b) => b.MODDAT.localeCompare(a.MODDAT))[0];

  return (
    <CustomFormSection
      title="Paramètres de l'application"
      icon={<Icon iconName="sliders" />}
      description="Valeurs utilisées par les calculs logistiques (poids pleins, palette chargée) et par la réservation des fiches en modification. Les formules sont à valider avec le référent Sage X3."
    >
      {error && <p className="vd-settings__error">Impossible de charger les paramètres.</p>}
      {params && (
        <CustomForm<ParamValues>
          initialValues={initial}
          defaultValues={initial}
          enableReinitialize
          disabled={!rights.PARAMS}
          onSubmit={save}
          inputSize="sm"
        >
          {(form) => (
            <>
              <CustomFormGrid columns="repeat(auto-fit, minmax(260px, 1fr))" gap={12}>
                {params.map((p) => (
                  <CustomFormInput
                    key={p.PRMKEY}
                    name={p.PRMKEY}
                    label={`${p.LABEL}${p.UNIT ? ` (${p.UNIT})` : ""}`}
                    type="number"
                    step="any"
                    min={p.MINVAL ?? undefined}
                    max={p.MAXVAL ?? undefined}
                    validate={validators.compose(
                      validators.required("Valeur obligatoire."),
                      ...(p.MINVAL != null ? [validators.min(p.MINVAL, `Minimum ${p.MINVAL}.`)] : []),
                      ...(p.MAXVAL != null ? [validators.max(p.MAXVAL, `Maximum ${p.MAXVAL}.`)] : []),
                    )}
                  />
                ))}
              </CustomFormGrid>
              {lastChange && (
                <p className="vd-muted">
                  Dernière modification le {formatDateTime(lastChange.MODDAT)} par{" "}
                  {lastChange.MODUSR}.
                </p>
              )}
              {rights.PARAMS ? (
                <div className="vd-section-actions">
                  {form.dirty && (
                    <CustomFormReset
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
              ) : (
                <p className="vd-muted">
                  Consultation seule : ces paramètres sont modifiés par le
                  service informatique.
                </p>
              )}
            </>
          )}
        </CustomForm>
      )}
    </CustomFormSection>
  );
};

export default AppParamsCard;
