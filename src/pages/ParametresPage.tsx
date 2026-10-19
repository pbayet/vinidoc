import React from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import SectionCard from "../shared/ui/SectionCard/ui/SectionCard";
import ThemePicker from "../shared/ui/ThemePicker/ThemePicker";
import { THEME_LABELS } from "../shared/lib/theme/theme";
import { useUserTheme } from "../shared/lib/theme/userTheme";
import { useUsersManagerSettings } from "../features/layout/hooks/useUsersManagerSettings";

/**
 * Paramètres de l'utilisateur. Apparence : thème de VINIDOC pour son compte,
 * enregistré en base (usersmanager/theme, APPCOD VINDOC) et appliqué
 * immédiatement ; « Par défaut » reprend son thème par défaut, réglé dans
 * les Paramètres de users-manager (bouton dédié, connexion automatique).
 */
const ParametresPage: React.FC = () => {
  const { theme, isLoading, isSaving, loadError, setApplicationTheme } =
    useUserTheme();
  const { isOpening, openUsersManagerSettings } = useUsersManagerSettings();

  return (
    <PageLayout title="Paramètres">
      <SectionCard
        title="Apparence"
        icon="circle-half-stroke"
        description="Thème d'affichage de l'application pour votre compte (enregistré sur le serveur, commun à tous vos postes). « Par défaut » reprend votre thème par défaut, commun à toutes vos applications et réglé dans les Paramètres de users-manager."
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
            leftIcon={<Icon iconName="arrow-up-right-from-square" />}
            variant="neutral"
            size="sm"
            loading={isOpening}
            disabled={isOpening}
            onClick={openUsersManagerSettings}
          >
            Modifier mon thème par défaut
          </CustomButton>
        </div>
      </SectionCard>
    </PageLayout>
  );
};

export default ParametresPage;
