import React, { useState } from "react";
import { CustomButton, Icon, CustomFormSection } from "@uvcdr/custom-form-system";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import ThemePicker from "../shared/ui/ThemePicker/ThemePicker";
import DefaultThemeModal from "../shared/ui/DefaultThemeModal/DefaultThemeModal";
import { THEME_LABELS } from "../shared/lib/theme/theme";
import { useUserTheme } from "../shared/lib/theme/userTheme";
import AppParamsCard from "../features/vinidoc/params/AppParamsCard";
import { useMergeFieldsOnly } from "../features/auth/hooks/useMergeFieldsOnly";

/**
 * Paramètres de l'utilisateur. Apparence : thème de VINIDOC pour son compte,
 * enregistré en base (usersmanager/theme, APPCOD VINDOC) et appliqué
 * immédiatement ; « Par défaut » reprend son thème par défaut (commun à
 * toutes ses applications), modifiable ici dans une modale.
 * Paramètres de l'application : calculs logistiques et réservation des
 * fiches (cf. AppParamsCard).
 */
const ParametresPage: React.FC = () => {
  const { theme, isLoading, isSaving, loadError, setApplicationTheme } =
    useUserTheme();
  const [isDefaultThemeOpen, setDefaultThemeOpen] = useState(false);
  // ⚠️ TEMPORAIRE — accès restreint : section « Apparence » seule
  const mergeFieldsOnly = useMergeFieldsOnly();

  return (
    <PageLayout title="Paramètres">
      <CustomFormSection
        title="Apparence"
        icon={<Icon iconName="circle-half-stroke" />}
        description="Thème d'affichage de l'application pour votre compte (enregistré sur le serveur, commun à tous vos postes). « Par défaut » reprend votre thème par défaut, commun à toutes vos applications."
      >
        <ThemePicker
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
            size="xs"
            onClick={() => setDefaultThemeOpen(true)}
          >
            Modifier mon thème par défaut
          </CustomButton>
        </div>
      </CustomFormSection>

      {!mergeFieldsOnly && <AppParamsCard />}

      <DefaultThemeModal
        isOpen={isDefaultThemeOpen}
        onClose={() => setDefaultThemeOpen(false)}
      />
    </PageLayout>
  );
};

export default ParametresPage;
