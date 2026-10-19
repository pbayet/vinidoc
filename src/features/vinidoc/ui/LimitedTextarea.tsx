import React from "react";
import { CustomInput, CustomTextarea } from "@uvcdr/custom-form-system";
import type { TagLimit } from "../../../entities/vinidoc/vinidoc.types";
import { textLength } from "../lib/format";

interface LimitedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Limite technique de la base (bloquante) */
  hardMax: number;
  /** Limite la plus stricte des modèles actifs (indicative, non bloquante) */
  templateMax?: number | null;
  /** Détail des limites par modèle (infobulle) */
  limits?: TagLimit[];
  rows?: number;
  hint?: string;
  readOnly?: boolean;
  placeholder?: string;
}

/**
 * Champ texte avec compteur de caractères comparé aux longueurs max des
 * modèles PowerPoint actifs. Dépasser la limite d'un modèle reste possible
 * (le texte peut servir avec d'autres modèles) mais est signalé : la
 * génération avec ce modèle sera refusée par l'API.
 */
const LimitedTextarea: React.FC<LimitedTextareaProps> = ({
  label,
  value,
  onChange,
  hardMax,
  templateMax,
  limits = [],
  rows = 4,
  hint,
  readOnly,
  placeholder,
}) => {
  const length = textLength(value);
  const over = templateMax != null && length > templateMax;
  const tooLongFor = limits.filter(
    (l) => l.MAXLEN != null && length > l.MAXLEN,
  );
  const title = limits.length
    ? limits
        .map(
          (l) =>
            `${l.TPLNAM} : ${l.MAXLEN ?? "illimité"}${l.REQUIRED ? " (obligatoire)" : ""}`,
        )
        .join("\n")
    : "Aucun modèle actif n'utilise ce champ";

  return (
    <div className={`vd-limited${over ? " vd-limited--over" : ""}`}>
      {rows > 1 ? (
        <CustomTextarea
          label={label}
          value={value}
          rows={rows}
          maxLength={hardMax}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          inputSize="xs"
        />
      ) : (
        <CustomInput
          label={label}
          value={value}
          maxLength={hardMax}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          inputSize="xs"
        />
      )}
      <div className="vd-limited__footer">
        <span className="vd-limited__hint">
          {over
            ? `Trop long pour : ${tooLongFor.map((l) => `${l.TPLNAM} (${l.MAXLEN})`).join(", ")}`
            : hint}
        </span>
        <span className="vd-limited__counter" title={title}>
          {length}
          {templateMax != null ? ` / ${templateMax}` : ""} car.
        </span>
      </div>
    </div>
  );
};

export default LimitedTextarea;
