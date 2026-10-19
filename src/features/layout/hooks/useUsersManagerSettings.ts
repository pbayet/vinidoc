import { useCallback, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../app/api/api";
import { DOMAIN } from "../../../app/config";
import { saveTokenForApp } from "../Nav/hooks/useAppSwitcher";

/** Code de l'application users-manager (table APPLICATIONS). */
const USERS_MANAGER_APP_CODE = "USRMAN";

/** Page Paramètres de users-manager (thème par défaut de l'utilisateur). */
export const USERS_MANAGER_SETTINGS_URL = `${DOMAIN}/users-manager/settings`;

/**
 * Ouvre les Paramètres de users-manager, où l'utilisateur règle son thème
 * par défaut (commun à toutes les applications). Même principe que le
 * changement d'application (cf. `useAppSwitcher`) : un token users-manager
 * est d'abord généré (`auth/app?appcode=USRMAN`) et enregistré dans le
 * cookie de users-manager, pour que l'utilisateur arrive connecté au lieu
 * d'être renvoyé vers la page de connexion.
 *
 * L'API ne délivre ce token que si l'utilisateur a une permission active sur
 * users-manager (sinon ACCESS_DENIED, affiché par le message d'erreur API).
 * Le cookie est posé sur le domaine courant : la connexion automatique ne
 * fonctionne donc qu'en test / production (même domaine que users-manager),
 * pas depuis localhost.
 */
export function useUsersManagerSettings() {
  const { jwtPayload } = useAuth();
  const [isOpening, setOpening] = useState(false);

  const openUsersManagerSettings = useCallback(() => {
    apiRequest<string>({
      endpoint: "auth/app",
      method: "GET",
      params: { appcode: USERS_MANAGER_APP_CODE },
      token: jwtPayload.$token,
      setLoading: setOpening,
      onSuccess: (result) => {
        if (!result.data) return;
        saveTokenForApp(result.data, USERS_MANAGER_APP_CODE);
        window.location.href = USERS_MANAGER_SETTINGS_URL;
      },
    });
  }, [jwtPayload]);

  return { isOpening, openUsersManagerSettings };
}
