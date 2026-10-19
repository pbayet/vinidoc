// src/main.tsx
import ReactDOM from "react-dom/client";
import App from "./App";
import "../shared/styles/index.scss";

import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons"; // Charge toutes les icônes Solid
import { BrowserRouter } from "react-router-dom";
import "@uvcdr/custom-form-system/dist/index.css";
import "@uvcdr/custom-form-system/dist/index-dark.css";

import { ModalProvider } from "@uvcdr/modal";
import "@uvcdr/modal/styles.css";
import "@uvcdr/modal/styles-dark.css";
import "@uvcdr/confirm-notify-system/dist/index.css";
import "@uvcdr/confirm-notify-system/dist/index-dark.css";

import {
  API_URL,
  APP_CODE,
  IS_PRODUCTION,
  LS_JWT,
  MODIFY_PERMS,
} from "./config";

import { configureApiAuthSystem } from "@uvcdr/api-auth-system";
import {
  ConfirmProvider,
  NotificationProvider,
} from "@uvcdr/confirm-notify-system";
import {
  ConfirmStoreInitializer,
  NotifyStoreInitializer,
  ApiMessageInitializer,
} from "./AppInitializers";
import { initTheme } from "../shared/lib/theme/theme";

// Ajoute toutes les icônes Solid dans la librairie
library.add(fas);

// Thème clair / sombre (préférence en cache localStorage, cf. theme.ts)
initTheme();

configureApiAuthSystem({
  apiUrl: API_URL,
  appCode: APP_CODE,
  isProduction: IS_PRODUCTION, // défaut : false
  cookiePrefix: LS_JWT, // défaut : "jwt"
  modifyPermissions: MODIFY_PERMS, // défaut : []
  authVerify: { endpoint: "auth/verify" }, // défaut : { baseUrl: apiUrl, endpoint: "auth/verify" }
});

const appBase = import.meta.env.VITE_APP_BASE ?? "/";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter basename={appBase}>
    <ModalProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <ConfirmStoreInitializer />
          <NotifyStoreInitializer />
          <ApiMessageInitializer />
          <App />
        </ConfirmProvider>
      </NotificationProvider>
    </ModalProvider>
  </BrowserRouter>,
);
