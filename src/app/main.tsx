// src/main.tsx
import ReactDOM from "react-dom/client";
import App from "./App";
import "../shared/styles/index.scss";

import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons"; // Charge toutes les icônes Solid
import { BrowserRouter } from "react-router-dom";
import "@uvcdr/custom-form-system/dist/index.css";

import { ModalProvider } from "@uvcdr/modal";
import "@uvcdr/modal/styles.css";
import "@uvcdr/confirm-notify-system/dist/index.css";
import "@uvcdr/custom-list/styles.css";
import "@uvcdr/statistics-system/dist/index.css";

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

// Ajoute toutes les icônes Solid dans la librairie
library.add(fas);

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
