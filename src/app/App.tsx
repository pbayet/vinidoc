import React from "react";
import "../shared/styles/global.scss";
import "../shared/styles/layout.scss";
import { UnisAppProviders, type AppShellConfig } from "@uvcdr/app-shell";
import Router from "./router/router";
import {
  clearCache,
  forceCleanExpiredCache,
} from "../shared/lib/utils/cache.functions";
import { getLocalStorageSize } from "../shared/lib/utils/storage.functions";
import { APP_CODE, APP_NAME, DOMAIN, IS_PRODUCTION } from "./config";
import { UserThemeInitializer } from "./AppInitializers";
import { useAppNavigation } from "./navigation";
import { WebSocketProvider } from "./context/WebSocketContext";
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
  // Vide aussi le cache mémoire (Map) de cache.functions, pas seulement le
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
      initializers={<UserThemeInitializer />}
    >
      <WebSocketProvider>
        {/* Droits VINIDOC (œnologie / marketing / modèles), langues,
            couleurs et balises : chargés une fois pour toute l'application. */}
        <VinidocProvider>
          <div className="global-app-container">
            <Router />
          </div>
        </VinidocProvider>
      </WebSocketProvider>
    </UnisAppProviders>
  );
};

export default App;
