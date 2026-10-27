import React from "react";
import { CustomButton, CustomButtonGroup } from "@uvcdr/custom-form-system";

interface ScaleInputProps {
  label: string;
  /** Valeurs proposées, dans l'ordre d'affichage (cf. SCALES) */
  steps: readonly number[];
  value: number | null;
  onChange: (value: number | null) => void;
  /** Libellé de la première valeur (ex. "Peu intense") */
  minLabel?: string;
  /** Libellé de la dernière valeur (ex. "Très intense") */
  maxLabel?: string;
  readOnly?: boolean;
}

/**
 * Échelle à niveaux (intensité aromatique, bouche, fruit) rendue comme une
 * jauge (CustomButtonGroup en mode `gauge`) : clic = sélection jusqu'à ce
 * niveau, nouveau clic sur la valeur courante = effacement.
 */
const ScaleInput: React.FC<ScaleInputProps> = ({
  label,
  steps,
  value,
  onChange,
  minLabel,
  maxLabel,
  readOnly,
}) => {
  const max = steps[steps.length - 1];
  const canErase = !readOnly && value != null;

  return (
    <div
      className={`vd-scale${readOnly ? " vd-scale--readonly" : ""}${value == null ? " vd-scale--empty" : ""}`}
    >
      <div className="vd-scale__header">
        <span className="vd-scale__label">{label}</span>
        <span className="vd-scale__value" aria-live="polite">
          {value == null ? (
            "Non renseigné"
          ) : (
            <>
              <strong>{value}</strong>/{max}
            </>
          )}
        </span>
      </div>

      <CustomButtonGroup
        attached
        fullWidth
        shape="pill"
        variant="secondary"
        size="sm"
        aria-label={label}
        selectedColor="info"
        selectedAppearance="solid"
        selectionMode="gauge"
        allowEmpty
        pressEffect={false}
        disabled={readOnly}
        value={value == null ? null : String(value)}
        onValueChange={(v) => {
          if (Array.isArray(v)) return;
          onChange(v === null ? null : Number(v));
        }}
      >
        {steps.map((step) => (
          <CustomButton
            key={step}
            value={String(step)}
            aria-label={`${label} : ${step} sur ${max}`}
          >
            {step}
          </CustomButton>
        ))}
      </CustomButtonGroup>

      <div
        className={`vd-scale__footer ${canErase ? "vd-scale__footer--erasable" : ""}`}
      >
        <span>{minLabel}</span>
        {canErase && (
          <button
            type="button"
            className="vd-scale__clear"
            onClick={() => onChange(null)}
          >
            Effacer
          </button>
        )}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
};

export default ScaleInput;
