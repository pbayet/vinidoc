import React from "react";
import "./ThemePicker.scss";
import { CustomInputRadioButton } from "@uvcdr/custom-form-system";
import { THEME_LABELS, type ThemePreference } from "../../lib/theme/theme";

const THEME_OPTIONS: { value: ThemePreference; icon: string }[] = [
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
  { value: "system", icon: "desktop" },
];

interface ThemePickerProps {
  /** Nom du groupe de boutons radio (unique dans la page). */
  name: string;
  /** Valeur sélectionnée ; null = option « Par défaut » (si `defaultOption`). */
  value: ThemePreference | null;
  onChange: (value: ThemePreference | null) => void;
  /**
   * Ajoute une option « Par défaut » (valeur null) en tête, avec le libellé
   * fourni — ex. « Par défaut (Clair) ».
   */
  defaultOption?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** "compact" : boutons plus petits et sans marge (ex. dans une liste). */
  size?: "default" | "compact";
}

/** Choix du thème d'affichage (Clair / Sombre / Système). */
const ThemePicker: React.FC<ThemePickerProps> = ({
  name,
  value,
  onChange,
  defaultOption,
  disabled,
  ariaLabel = "Thème d'affichage",
  size = "default",
}) => {
  const options: { value: ThemePreference | null; label: string; icon: string }[] = [
    ...(defaultOption
      ? [{ value: null, label: defaultOption, icon: "rotate-left" }]
      : []),
    ...THEME_OPTIONS.map((o) => ({ ...o, label: THEME_LABELS[o.value] })),
  ];

  return (
    <div
      className={`theme-picker${size === "compact" ? " theme-picker--compact" : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <CustomInputRadioButton
          key={option.value ?? "default"}
          label={option.label}
          name={name}
          value={option.value ?? "default"}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          inputSize={size === "compact" ? "xs" : "sm"}
          states={{
            unchecked: { variant: "neutral", icon: option.icon },
            checked: { variant: "primary", icon: option.icon },
          }}
        />
      ))}
    </div>
  );
};

export default ThemePicker;
