import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/SettingsGeneral.scss";
import {
  CustomButton,
  CustomForm,
  CustomFormGrid,
  CustomFormInput,
  CustomFormReset,
  CustomFormSubmit,
  Icon,
  validators,
} from "@uvcdr/custom-form-system";
import { useRealtimeEvent } from "@uvcdr/realtime";
import { useVinidocApi } from "../../vinidoc/api/useVinidocApi";
import { useVinidoc } from "../../vinidoc/context/VinidocContext";
import { formatDateTime } from "../../vinidoc/lib/format";
import type { AppParam } from "../../../entities/vinidoc/vinidoc.types";

type ParamValues = Record<string, number | "">;

interface ParamCard {
  key: string;
  icon: string;
  title: string;
  description: string;
  /** Paramètres (PRMKEY) de la carte, dans l'ordre d'affichage */
  keys: string[];
}

/**
 * Cartes de l'onglet et paramètres (table PARAMS) qu'elles regroupent. Un
 * paramètre absent d'ici reste affiché, dans « Autres paramètres ».
 */
const PARAM_CARDS: ParamCard[] = [
  {
    key: "lock",
    icon: "lock",
    title: "Réservation des fiches",
    description:
      "Une fiche en modification est réservée à son auteur, puis libérée après un temps d'inactivité.",
    keys: ["LOCK_TIMEOUT_MIN"],
  },
  {
    key: "logistics",
    icon: "pallet",
    title: "Calculs logistiques",
    description:
      "Valeurs utilisées pour les poids pleins et la palette chargée. Formules à valider avec le référent Sage X3.",
    keys: ["WINE_DENSITY", "PALLET_WEIGHT", "PALLET_HEIGHT"],
  },
];

/** Libellés et aides d'affichage ; à défaut, le libellé en base. */
const PARAM_TEXTS: Record<string, { label: string; helpText: string }> = {
  LOCK_TIMEOUT_MIN: {
    label: "Libération après inactivité",
    helpText:
      "Au-delà de ce délai sans activité, la fiche est libérée pour les autres utilisateurs.",
  },
  WINE_DENSITY: {
    label: "Masse volumique du vin",
    helpText: "Sert au calcul des poids pleins.",
  },
  PALLET_WEIGHT: {
    label: "Poids du support palette",
    helpText: "Utilisé si la nomenclature ne le précise pas.",
  },
  PALLET_HEIGHT: {
    label: "Hauteur du support palette",
    helpText: "Utilisée si la nomenclature ne la précise pas.",
  },
};

const PLACEHOLDER_PARAMS: AppParam[] = PARAM_CARDS.flatMap((c) =>
  c.keys.map((PRMKEY) => ({
    PRMKEY,
    PRMVAL: 0,
    LABEL: PRMKEY,
    UNIT: null,
    MINVAL: null,
    MAXVAL: null,
    MODUSR: "init",
    MODDAT: "",
  })),
);

const formatNumber =(n: number) => n.toLocaleString("fr-FR");

const rangeText = (p: AppParam): string => {
  const unit = p.UNIT ? ` ${p.UNIT}` : "";
  if (p.MINVAL != null && p.MAXVAL != null)
    return `Entre ${formatNumber(p.MINVAL)} et ${formatNumber(p.MAXVAL)}${unit}.`;
  if (p.MINVAL != null) return `Minimum ${formatNumber(p.MINVAL)}${unit}.`;
  if (p.MAXVAL != null) return `Maximum ${formatNumber(p.MAXVAL)}${unit}.`;
  return "";
};

/** Cartes à afficher avec leurs paramètres ; les inconnus en dernier. */
const groupParams = (params: AppParam[]) => {
  const byKey = new Map(params.map((p) => [p.PRMKEY, p]));
  const known = new Set(PARAM_CARDS.flatMap((c) => c.keys));
  const cards = PARAM_CARDS.map((c) => ({
    ...c,
    params: c.keys.flatMap((k) => byKey.get(k) ?? []),
  }));
  const others = params.filter((p) => !known.has(p.PRMKEY));
  if (others.length)
    cards.push({
      key: "others",
      icon: "sliders",
      title: "Autres paramètres",
      description: "",
      keys: [],
      params: others,
    });
  return cards.filter((c) => c.params.length);
};

/**
 * Onglet « Général » de ParametresPage : paramètres de l'application,
 * modifiables sans développement — durée d'inactivité libérant la
 * réservation d'une fiche (RG-04) et calculs logistiques (masse volumique du
 * vin, support palette — EF-16 / EF-17).
 * Consultables par tous ; modifiables avec le droit PARAMS.
 */
const SettingsGeneral: React.FC = () => {
  const api = useVinidocApi();
  const { rights } = useVinidoc();
  const canEdit = !!rights.PARAMS;
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
  useRealtimeEvent("vinidoc.params.updated", useCallback(() => void load(), [load]));

  const initial = useMemo<ParamValues>(
    () => Object.fromEntries((params ?? []).map((p) => [p.PRMKEY, p.PRMVAL])),
    [params],
  );
  // Pendant le chargement : cartes connues en squelette.
  const cards = useMemo(() => groupParams(params ?? PLACEHOLDER_PARAMS), [params]);

  const lastChange = useMemo(
    () =>
      params
        ?.filter((p) => p.MODUSR !== "init")
        .sort((a, b) => b.MODDAT.localeCompare(a.MODDAT))[0],
    [params],
  );

  const handleSave = async (values: ParamValues) => {
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

  if (error) {
    return (
      <section className="settings-general" aria-label="Paramètres de l'application">
        <div className="settings-general__card">
          <p className="settings-general__error" role="alert">
            Impossible de charger les paramètres.
            <CustomButton
              size="xs"
              variant="neutral"
              leftIcon={<Icon iconName="rotate-right" />}
              onClick={() => void load()}
            >
              Réessayer
            </CustomButton>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-general" aria-label="Paramètres de l'application">
      <CustomForm<ParamValues>
        initialValues={initial}
        defaultValues={initial}
        enableReinitialize
        inputSize="xs"
        loading={!params}
        disabled={!canEdit}
        onSubmit={handleSave}
      >
        {(form) => (
          <div className="settings-general__content">
            {cards.map((card) => (
              <div key={card.key} className="settings-general__card">
                <header className="settings-general__card-header">
                  <Icon iconName={card.icon} />
                  <div>
                    <h4>{card.title}</h4>
                    {card.description && <p>{card.description}</p>}
                  </div>
                </header>

                <CustomFormGrid columns={2}>
                  {card.params.map((p) => {
                    const texts = PARAM_TEXTS[p.PRMKEY];
                    const label = texts?.label ?? p.LABEL;
                    return (
                      <CustomFormInput
                        key={p.PRMKEY}
                        name={p.PRMKEY}
                        type="number"
                        step="any"
                        min={p.MINVAL ?? undefined}
                        max={p.MAXVAL ?? undefined}
                        label={p.UNIT ? `${label} (${p.UNIT})` : label}
                        helpText={[texts?.helpText, rangeText(p)].filter(Boolean).join(" ")}
                        validate={validators.compose(
                          validators.required("Ce champ est obligatoire"),
                          ...(p.MINVAL != null
                            ? [validators.min(p.MINVAL, `Minimum ${formatNumber(p.MINVAL)}`)]
                            : []),
                          ...(p.MAXVAL != null
                            ? [validators.max(p.MAXVAL, `Maximum ${formatNumber(p.MAXVAL)}`)]
                            : []),
                        )}
                        loadingVariant="skeleton"
                      />
                    );
                  })}
                </CustomFormGrid>
              </div>
            ))}

            {params && (
              <div className="settings-general__footer">
                <p>
                  {!canEdit
                    ? "Consultation seule : ces paramètres sont modifiés par le service informatique."
                    : lastChange
                      ? `Dernière modification le ${formatDateTime(lastChange.MODDAT)} par ${lastChange.MODUSR}.`
                      : "Valeurs initiales, jamais modifiées."}
                </p>
                {canEdit && (
                  <div className="settings-general__actions">
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
                      variant="success"
                      size="xs"
                      leftIcon={<Icon iconName="floppy-disk" />}
                      disabled={!form.dirty || !form.isValid || form.submitting}
                    >
                      Enregistrer
                    </CustomFormSubmit>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CustomForm>
    </section>
  );
};

export default SettingsGeneral;
