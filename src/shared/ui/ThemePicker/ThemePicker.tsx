import React from "react";
import {
  CustomButton,
  CustomButtonGroup,
  Icon,
} from "@uvcdr/custom-form-system";
import { THEME_LABELS, type ThemePreference } from "../../lib/theme/theme";

const THEME_OPTIONS: { value: ThemePreference; icon: string }[] = [
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
  { value: "system", icon: "desktop" },
];

/** Valeur du bouton « Par défaut » (le groupe ne gère que des chaînes). */
const DEFAULT_VALUE = "default";

interface ThemePickerProps {
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
}

/** Choix du thème d'affichage (Clair / Sombre / Système). */
const ThemePicker: React.FC<ThemePickerProps> = ({
  defaultOption,
  value,
  onChange,
  disabled,
  ariaLabel = "Thème d'affichage",
}) => {
  const options: {
    value: ThemePreference | null;
    label: string;
    icon: string;
  }[] = [
    ...(defaultOption
      ? [{ value: null, label: defaultOption, icon: "rotate-left" }]
      : []),
    ...THEME_OPTIONS.map((o) => ({ ...o, label: THEME_LABELS[o.value] })),
  ];

  return (
    <CustomButtonGroup
      role="radiogroup"
      aria-label={ariaLabel}
      menuStyle="toolbar"
      size={"sm"}
      selectionMode="single"
      selectedColor="success"
      disabled={disabled}
      value={value ?? DEFAULT_VALUE}
      onValueChange={(v) => {
        if (typeof v !== "string") return;
        onChange(v === DEFAULT_VALUE ? null : (v as ThemePreference));
      }}
    >
      {options.map((option) => (
        <CustomButton
          key={option.value ?? DEFAULT_VALUE}
          value={option.value ?? DEFAULT_VALUE}
          leftIcon={<Icon iconName={option.icon} />}
        >
          {option.label}
        </CustomButton>
      ))}
    </CustomButtonGroup>
  );
};

export default ThemePicker;
