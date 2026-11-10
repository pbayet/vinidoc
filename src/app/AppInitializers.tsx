// src/app/AppInitializers.tsx
//
// Composants "invisibles" (return null) propres à l'application. Les
// initialiseurs des registries d'@uvcdr/api-auth-system (confirmations,
// notifications, messages d'API) sont montés par <UnisAppProviders>
// (@uvcdr/app-shell). Isolés dans un fichier dédié pour que React Fast
// Refresh fonctionne correctement (eslint: react-refresh/only-export-components).

import { useUserThemeSync } from "../shared/lib/theme/userTheme";

/**
 * Charge le thème de l'utilisateur connecté (usersmanager/theme) et le
 * réapplique à chaque changement d'utilisateur. À monter sous l'AuthProvider
 * (cf. `initializers` de <UnisAppProviders> dans App.tsx).
 */
export function UserThemeInitializer() {
  useUserThemeSync();
  return null;
}
