import React from "react";
import "./DefaultThemeModal.scss";
import { Modal } from "@uvcdr/modal";
import { useUserTheme } from "../../lib/theme/userTheme";
import ThemePicker from "../ThemePicker/ThemePicker";

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
      <ThemePicker
        value={theme?.default ?? null}
        onChange={(value) => {
          if (value) void setDefaultTheme(value);
        }}
        disabled={isLoading || isSaving || loadError}
        ariaLabel="Thème par défaut"
      />
      {loadError && (
        <p className="default-theme-modal__error">
          Impossible de charger votre préférence de thème.
        </p>
      )}
    </Modal>
  );
};

export default DefaultThemeModal;
