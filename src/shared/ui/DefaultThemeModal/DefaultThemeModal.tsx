import React from "react";
import "./DefaultThemeModal.scss";
import { Modal } from "@uvcdr/modal";
import { CustomInputRadioButton } from "@uvcdr/custom-form-system";
import { THEME_LABELS, type ThemePreference } from "../../lib/theme/theme";
import { useUserTheme } from "../../lib/theme/userTheme";

const THEME_OPTIONS: { value: ThemePreference; icon: string }[] = [
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
  { value: "system", icon: "desktop" },
];

interface DefaultThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Choix du thème par défaut de l'utilisateur (commun à toutes les
 * applications sans thème propre), enregistré directement depuis cette
 * application (usersmanager/theme sans APPCOD) : plus besoin de passer par
 * les Paramètres de users-manager.
 */
const DefaultThemeModal: React.FC<DefaultThemeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, isLoading, isSaving, loadError, setDefaultTheme } =
    useUserTheme();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thème par défaut"
      size="md"
      closeOnEscape
    >
      <p className="default-theme-modal__hint">
        Thème utilisé par toutes vos applications, sauf celles pour lesquelles
        vous avez choisi un thème spécifique.
      </p>
      <div
        className="default-theme-modal__options"
        role="radiogroup"
        aria-label="Thème par défaut"
      >
        {THEME_OPTIONS.map((option) => (
          <CustomInputRadioButton
            key={option.value}
            label={THEME_LABELS[option.value]}
            name="defaultThemePreference"
            value={option.value}
            checked={theme?.default === option.value}
            onChange={() => void setDefaultTheme(option.value)}
            disabled={isLoading || isSaving || loadError}
            inputSize="sm"
            states={{
              unchecked: { variant: "neutral", icon: option.icon },
              checked: { variant: "primary", icon: option.icon },
            }}
          />
        ))}
      </div>
      {loadError && (
        <p className="default-theme-modal__error">
          Impossible de charger votre préférence de thème.
        </p>
      )}
    </Modal>
  );
};

export default DefaultThemeModal;
