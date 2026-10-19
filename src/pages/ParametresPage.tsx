import React, { useState } from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import SectionCard from "../shared/ui/SectionCard/ui/SectionCard";
import ThemePicker from "../shared/ui/ThemePicker/ThemePicker";
import DefaultThemeModal from "../shared/ui/DefaultThemeModal/DefaultThemeModal";
import { THEME_LABELS } from "../shared/lib/theme/theme";
import { useUserTheme } from "../shared/lib/theme/userTheme";

/**
 * Paramètres de l'utilisateur. Apparence : thème de VINIDOC pour son compte,
 * enregistré en base (usersmanager/theme, APPCOD VINDOC) et appliqué
 * immédiatement ; « Par défaut » reprend son thème par défaut (commun à
 * toutes ses applications), modifiable ici dans une modale.
 */
const ParametresPage: React.FC = () => {
  const { theme, isLoading, isSaving, loadError, setApplicationTheme } =
    useUserTheme();
  const [isDefaultThemeOpen, setDefaultThemeOpen] = useState(false);

  return (
    <PageLayout title="Paramètres">
      <SectionCard
        title="Apparence"
        icon="circle-half-stroke"
        description="Thème d'affichage de l'application pour votre compte (enregistré sur le serveur, commun à tous vos postes). « Par défaut » reprend votre thème par défaut, commun à toutes vos applications."
      >
        <ThemePicker
          name="vinidoc-theme"
          size="compact"
          value={theme?.application ?? null}
          defaultOption={`Par défaut${theme ? ` (${THEME_LABELS[theme.default]})` : ""}`}
          onChange={(value) => void setApplicationTheme(value)}
          disabled={isLoading || isSaving || loadError}
          ariaLabel="Thème d'affichage"
        />
        {loadError && (
          <p className="vd-settings__error">
            Impossible de charger votre préférence de thème.
          </p>
        )}
        <div className="vd-settings__default">
          <CustomButton
            leftIcon={<Icon iconName="palette" />}
            variant="neutral"
            size="sm"
            onClick={() => setDefaultThemeOpen(true)}
          >
            Modifier mon thème par défaut
          </CustomButton>
        </div>
      </SectionCard>

      <DefaultThemeModal
        isOpen={isDefaultThemeOpen}
        onClose={() => setDefaultThemeOpen(false)}
      />
    </PageLayout>
  );
};

export default ParametresPage;
