import React, { useRef, useState } from "react";

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
 * jauge segmentée : survol = aperçu, clic = sélection, nouveau clic sur la
 * valeur courante = effacement.
 * Clavier : flèches / Début / Fin pour changer, Suppr / Retour arrière pour effacer.
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
  const [hover, setHover] = useState<number | null>(null);
  const segments = useRef<(HTMLButtonElement | null)[]>([]);
  const last = steps.length - 1;
  const max = steps[last];
  // Comparaisons par position : les valeurs n'ont pas à être contiguës.
  const valueIdx = value == null ? -1 : steps.indexOf(value);
  const shownIdx = !readOnly && hover != null ? hover : valueIdx;

  const select = (idx: number | null) => {
    if (readOnly) return;
    onChange(idx == null ? null : steps[idx]);
    if (idx != null) segments.current[idx]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next: Record<string, number | null> = {
      ArrowRight: Math.min(last, valueIdx + 1),
      ArrowUp: Math.min(last, valueIdx + 1),
      ArrowLeft: Math.max(0, valueIdx - 1),
      ArrowDown: Math.max(0, valueIdx - 1),
      Home: 0,
      End: last,
      Delete: null,
      Backspace: null,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(next[e.key]);
  };

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

      <div
        className="vd-scale__track"
        role="radiogroup"
        aria-label={label}
        aria-readonly={readOnly || undefined}
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
        onMouseLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        {steps.map((step, idx) => {
          const on = idx <= shownIdx;
          return (
            <button
              key={step}
              ref={(el) => {
                segments.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={value === step}
              aria-label={`${label} : ${step} sur ${max}`}
              // Focus itinérant : seul le segment courant (ou le 1er) est tabulable.
              tabIndex={readOnly ? -1 : idx === Math.max(valueIdx, 0) ? 0 : -1}
              disabled={readOnly}
              className={[
                "vd-scale__segment",
                on && "vd-scale__segment--on",
                on &&
                  hover != null &&
                  !readOnly &&
                  "vd-scale__segment--preview",
                value === step && "vd-scale__segment--current",
              ]
                .filter(Boolean)
                .join(" ")}
              // Niveau relatif 0 → 1 : la teinte s'adapte au nombre de segments.
              style={
                { "--vd-scale-ratio": last > 0 ? idx / last : 1 } as React.CSSProperties
              }
              onMouseEnter={() => setHover(idx)}
              onClick={() => select(value === step ? null : idx)}
            >
              {step}
            </button>
          );
        })}
      </div>

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
