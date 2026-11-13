// src/main.tsx
import ReactDOM from "react-dom/client";
import App from "./App";
import "../shared/styles/index.scss";

import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons"; // Charge toutes les icônes Solid
import { BrowserRouter } from "react-router-dom";
import "@uvcdr/custom-form-system/dist/index.css";
import "@uvcdr/custom-form-system/dist/index-dark.css";

import "@uvcdr/modal/styles.css";
import "@uvcdr/modal/styles-dark.css";
import "@uvcdr/confirm-notify-system/dist/index.css";
import "@uvcdr/confirm-notify-system/dist/index-dark.css";
import "@uvcdr/statistics-system/dist/index.css";
import "@uvcdr/statistics-system/dist/index-dark.css";
import "@uvcdr/app-shell/styles.css";
import "@uvcdr/app-shell/styles-dark.css";
// Thème commun : variables --unis-* (clair + sombre), styles de base (body,
// barres de défilement) et composants de thème.
import "@uvcdr/unis-theme/theme.css";
import "@uvcdr/unis-theme/styles.css";

import {
  API_URL,
  APP_CODE,
  IS_PRODUCTION,
  LS_JWT,
  MODIFY_PERMS,
  THEME_STORAGE_KEY,
  UPLOADS_URL,
} from "./config";

import { configureApiAuthSystem } from "@uvcdr/api-auth-system";
import { configureAttachments } from "@uvcdr/attachments";
import { configureUnisTheme, initTheme } from "@uvcdr/unis-theme";
import { QueryClientProvider } from "@uvcdr/data-query";
import { queryClient } from "./queryClient";

// Ajoute toutes les icônes Solid dans la librairie
library.add(fas);

// Thème clair / sombre (@uvcdr/unis-theme) : applique le cache localStorage
// en attendant la préférence enregistrée en base (<UserThemeSync />, App.tsx).
// Clé "vinidoc-theme" : la même que le script anti-flash (vite.config.ts) et
// que l'ancienne version de l'application (préférences en cache conservées).
configureUnisTheme({ appCode: APP_CODE, storageKey: THEME_STORAGE_KEY });
initTheme();

configureApiAuthSystem({
  apiUrl: API_URL,
  appCode: APP_CODE,
  isProduction: IS_PRODUCTION, // défaut : false
  cookiePrefix: LS_JWT, // défaut : "jwt"
  modifyPermissions: MODIFY_PERMS, // défaut : []
  authVerify: { endpoint: "auth/verify" }, // défaut : { baseUrl: apiUrl, endpoint: "auth/verify" }
});

// Pièces jointes (@uvcdr/attachments) : fichiers servis sous UPLOADS_URL
// (`<UPLOADS_URL>/<RELATIVEPATH>`, casse conservée comme l'ancien
// Attachment.ABSOLUTEURL).
configureAttachments({ uploadsUrl: UPLOADS_URL });

const appBase = import.meta.env.VITE_APP_BASE ?? "/";

// Providers communs (modales, notifications, confirmations, auth, socle) :
// montés par <UnisAppProviders> dans App.tsx (@uvcdr/app-shell).
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter basename={appBase}>
    {/* Cache des requêtes (@uvcdr/data-query), cf. app/queryClient.ts */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>,
);
