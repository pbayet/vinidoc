import React, { useState } from "react";
import "../styles/SettingsDisplay.scss";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { THEME_LABELS } from "../../../shared/lib/theme/theme";
import { useUserTheme } from "../../../shared/lib/theme/userTheme";
import DefaultThemeModal from "../../../shared/ui/DefaultThemeModal/DefaultThemeModal";
import ThemePicker from "../../../shared/ui/ThemePicker/ThemePicker";

/**
 * Onglet « Affichage » de ParametresPage (ouvert à tous) : thème de
 * l'application pour l'utilisateur connecté.
 *
 * Thème enregistré en base (usersmanager/theme, APPCOD VINDOC) et appliqué
 * immédiatement ; « Par défaut » reprend le thème par défaut de
 * l'utilisateur, modifiable ici en modale (commun à toutes ses applications).
 *
 * Même logique que l'onglet « Affichage » de FSA : la garder alignée.
 */
const SettingsDisplay: React.FC = () => {
  const { theme, isLoading, isSaving, loadError, setApplicationTheme } =
    useUserTheme();
  // Thème par défaut (toutes applications) : modifiable ici, en modale.
  const [isDefaultThemeOpen, setDefaultThemeOpen] = useState(false);

  return (
    <section className="settings-display" aria-label="Affichage">
      <div className="settings-display__card">
        <header className="settings-display__card-header">
          <Icon iconName="circle-half-stroke" />
          <div>
            <h4>Apparence</h4>
            <p>
              Thème d'affichage de l'application pour votre compte (enregistré
              sur le serveur, commun à tous vos postes). « Par défaut » reprend
              votre thème par défaut, commun à toutes vos applications.
            </p>
          </div>
        </header>

        <div className="settings-display__picker">
          <ThemePicker
            defaultOption={`Par défaut${theme ? ` (${THEME_LABELS[theme.default]})` : ""}`}
            value={theme?.application ?? null}
            onChange={(value) => void setApplicationTheme(value)}
            disabled={isLoading || isSaving || loadError}
            ariaLabel="Thème d'affichage"
          />
        </div>
        {loadError && (
          <p className="settings-display__error">
            Impossible de charger votre préférence de thème.
          </p>
        )}

        <div className="settings-display__default">
          <CustomButton
            leftIcon={<Icon iconName="palette" />}
            variant="neutral"
            size="xs"
            onClick={() => setDefaultThemeOpen(true)}
          >
            Modifier mon thème par défaut
          </CustomButton>
        </div>
        <DefaultThemeModal
          isOpen={isDefaultThemeOpen}
          onClose={() => setDefaultThemeOpen(false)}
        />
      </div>
    </section>
  );
};

export default SettingsDisplay;
