import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import "../features/settings/styles/Settings.scss";
import {
  CustomButton,
  CustomButtonGroup,
  Icon,
} from "@uvcdr/custom-form-system";
import { useMergeFieldsOnly } from "../features/auth/hooks/useMergeFieldsOnly";
import SettingsGeneral from "../features/settings/ui/SettingsGeneral";
import SettingsDisplay from "../features/settings/ui/SettingsDisplay";

type SettingsTab = "general" | "display";

const SETTINGS_PATH = "/parametres";
const SETTINGS_DISPLAY_PATH = "/parametres/affichage";

const SETTINGS_TABS: {
  label: string;
  value: SettingsTab;
  path: string;
  icon: string;
}[] = [
  {
    label: "Général",
    value: "general",
    path: SETTINGS_PATH,
    icon: "sliders",
  },
  {
    label: "Affichage",
    value: "display",
    path: SETTINGS_DISPLAY_PATH,
    icon: "circle-half-stroke",
  },
];

/**
 * Page Paramètres : porte la seule gestion des onglets, chacun synchronisé
 * avec sa route (/parametres, /parametres/affichage).
 *  - Général : SettingsGeneral (paramètres de l'application ; modifiables
 *    avec le droit PARAMS, consultables par tous)
 *  - Affichage : SettingsDisplay (thème, pour tous)
 * ⚠️ TEMPORAIRE — accès restreint (cf. useMergeFieldsOnly) : seul l'onglet
 * Affichage, sans barre d'onglets.
 *
 * Même organisation que la page Paramètres de FSA.
 */
const ParametresPage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mergeFieldsOnly = useMergeFieldsOnly();

  const selectedTab: SettingsTab = pathname.startsWith(SETTINGS_DISPLAY_PATH)
    ? "display"
    : "general";
  const activeTab: SettingsTab = mergeFieldsOnly ? "display" : selectedTab;

  return (
    <PageLayout title="Paramètres" showScrollToTop>
      {!mergeFieldsOnly && (
        <CustomButtonGroup
          className="settings__tabs"
          menuStyle={"tabs"}
          size="sm"
          selectionMode="single"
          value={activeTab}
          onValueChange={(v) => {
            const tab = SETTINGS_TABS.find((t) => t.value === v);
            if (tab) navigate(tab.path);
          }}
        >
          {SETTINGS_TABS.map(({ label, value, icon }) => (
            <CustomButton
              key={value}
              value={value}
              leftIcon={<Icon iconName={icon} />}
            >
              {label}
            </CustomButton>
          ))}
        </CustomButtonGroup>
      )}

      {activeTab === "general" && <SettingsGeneral />}
      {activeTab === "display" && <SettingsDisplay />}
    </PageLayout>
  );
};

export default ParametresPage;
