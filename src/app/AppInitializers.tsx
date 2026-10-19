// src/app/AppInitializers.tsx
//
// Composants "invisibles" (return null) qui branchent les hooks React de
// @uvcdr/confirm-notify-system sur les registries statiques de
// @uvcdr/api-auth-system. Isolés dans un fichier dédié (plutôt qu'inline
// dans main.tsx) pour que React Fast Refresh fonctionne correctement
// (eslint: react-refresh/only-export-components — un fichier avec des
// exports de composants ne doit pas avoir d'autres exports significatifs,
// et main.tsx contient l'appel `ReactDOM.createRoot(...).render(...)`).

import { useEffect } from "react";
import {
  confirmStore,
  notifyStore,
  setApiMessageHandler,
  clearApiMessageHandler,
} from "@uvcdr/api-auth-system";
import { useConfirm, useNotification } from "@uvcdr/confirm-notify-system";
import { useApiMessage } from "./api/hooks/useApiMessage";
import { useUserThemeSync } from "../shared/lib/theme/userTheme";

export function ConfirmStoreInitializer() {
  const { confirm } = useConfirm();
  useEffect(() => {
    confirmStore.set(confirm);
  }, [confirm]);
  return null;
}

export function NotifyStoreInitializer() {
  const { notify } = useNotification();
  useEffect(() => {
    notifyStore.set(notify);
  }, [notify]);
  return null;
}

/**
 * Enregistre le handler de messages API (toasts succès/erreur pour
 * `apiRequest`/`apiRequestAll`) une seule fois, de façon permanente, pour
 * toute l'application — plutôt que dans des composants ponctuels
 * (SettingsPage, useFolderActions...) qui se montent/démontent et écrasent
 * le registry global à chaque démontage.
 */
export function ApiMessageInitializer() {
  const { showApiMessage } = useApiMessage();
  useEffect(() => {
    setApiMessageHandler(showApiMessage);
    return () => clearApiMessageHandler();
  }, [showApiMessage]);
  return null;
}

/**
 * Charge le thème de l'utilisateur connecté (usersmanager/theme) et le
 * réapplique à chaque changement d'utilisateur. À monter sous l'AuthProvider
 * (cf. App.tsx).
 */
export function UserThemeInitializer() {
  useUserThemeSync();
  return null;
}
