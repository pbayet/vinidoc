import React from "react";
import "../shared/styles/global.scss";
import "../shared/styles/layout.scss";
import { UnisAppProviders, type AppShellConfig } from "@uvcdr/app-shell";
import Router from "./router/router";
import {
  clearCache,
  forceCleanExpiredCache,
  getLocalStorageSize,
} from "@uvcdr/utils";
import { UserThemeSync } from "@uvcdr/unis-theme";
import { ClearQueriesOnUserChange } from "@uvcdr/data-query";
import { RealtimeProvider } from "@uvcdr/realtime";
import { APP_CODE, APP_NAME, DOMAIN, IS_PRODUCTION, WS_URL } from "./config";
import { useAppNavigation } from "./navigation";
import { VinidocProvider } from "../features/vinidoc/context/VinidocContext";
import "../features/vinidoc/styles/vinidoc.scss";

const SHELL_CONFIG: AppShellConfig = {
  appName: APP_NAME,
  appCode: APP_CODE,
  isProduction: IS_PRODUCTION,
  domain: DOMAIN,
  // Erreurs métier VINIDOC (famille 1700) : l'API renvoie déjà une
  // description en français, précise et actionnable (ex. « Textes trop longs
  // ou manquants pour ce modèle : DEGUSTATION 412/350 »), affichée telle quelle.
  apiErrorDescriptionPrefixes: ["VINIDOC_"],
  // Vide aussi le cache mémoire de @uvcdr/utils, pas seulement le
  // localStorage.
  onClearCache: () => clearCache(),
};

const App: React.FC = () => {
  forceCleanExpiredCache();
  if (!IS_PRODUCTION)
    console.log(`LocalStorage size : ${getLocalStorageSize()}`);

  return (
    <UnisAppProviders
      config={SHELL_CONFIG}
      useNavigation={useAppNavigation}
      initializers={
        <>
          {/* Thème enregistré par users-manager (@uvcdr/unis-theme) */}
          <UserThemeSync />
          {/* Cache des requêtes vidé au changement d'utilisateur (@uvcdr/data-query) */}
          <ClearQueriesOnUserChange />
        </>
      }
    >
      {/* Temps réel (@uvcdr/realtime) : connexion ouverte tant que
          l'utilisateur est authentifié (AuthProvider de UnisAppProviders),
          rouverte au changement d'utilisateur. */}
      <RealtimeProvider url={WS_URL}>
        {/* Droits VINIDOC (œnologie / marketing / modèles), langues,
            couleurs et balises : chargés une fois pour toute l'application. */}
        <VinidocProvider>
          <div className="global-app-container">
            <Router />
          </div>
        </VinidocProvider>
      </RealtimeProvider>
    </UnisAppProviders>
  );
};

export default App;
