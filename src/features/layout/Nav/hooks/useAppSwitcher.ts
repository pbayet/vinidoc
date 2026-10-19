import { useCallback, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../../app/api/api";
import { APP_CODE, IS_PRODUCTION, LS_JWT } from "../../../../app/config";
import { Application } from "../../../../entities/auth/user/Application.class";
import { setCookie } from "../../../../shared/lib/utils/storage.functions";

/**
 * Liste + bascule vers une autre application du portail (accessible à tout
 * utilisateur authentifié, pas seulement aux admins — contrairement au
 * changement d'utilisateur).
 *
 * Reprend le principe déjà utilisé par le portail (`HomePage`/`Card`) :
 *  1. `usersmanager/home/applications` renvoie les applis autorisées pour
 *     l'utilisateur courant (avec `[DOMAIN]` en placeholder dans les liens).
 *  2. `auth/app?appcode=...` renvoie un token décoré pour l'appli cible.
 *  3. Ce token est enregistré dans le cookie de l'appli cible (même domaine,
 *     chemins différents : `/fsa/`, `/home/`...), puis on y redirige.
 *
 * Le package `@uvcdr/api-auth-system` ne permet pas d'écrire le cookie d'une
 * autre appli que la sienne via son API publique (`$token` ne fait que
 * rafraîchir le cookie de l'appli courante) : on réécrit donc ici la même
 * logique de cookie que celle déjà utilisée côté portail
 * (`JWTPayload.setTokenWithNewApp`), avec les utilitaires cookie déjà
 * présents dans FSA (`storage.functions`).
 */
export function useAppSwitcher() {
  const { jwtPayload } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setLoadingApps] = useState(false);
  const [isSwitching, setSwitching] = useState(false);

  const loadApplications = useCallback(() => {
    if (!jwtPayload.$userId || !jwtPayload.$token) return;

    apiRequest<Application[]>({
      endpoint: "usersmanager/home/applications",
      method: "GET",
      params: { USRID: jwtPayload.$userId },
      token: jwtPayload.$token,
      setLoading: setLoadingApps,
      silentError: true,
      onSuccess: (result) => {
        const apps = (Application.parseToClasses(result.data) ?? [])
          .filter((app) => app.ACTIVE && app.APPCOD !== APP_CODE)
          .sort((a, b) => a.APPNAM.localeCompare(b.APPNAM));
        setApplications(apps);
      },
    });
  }, [jwtPayload]);

  // Sauvegarde le token décoré reçu de `auth/app` dans le cookie de l'appli
  // cible — équivalent du `setTokenWithNewApp` du portail, appliqué ici au
  // format de cookie déjà utilisé par `@uvcdr/api-auth-system`.
  const saveTokenForApp = (token: string, appCode: string) => {
    const cookieName = `${LS_JWT}-${appCode.replace(/\s+/g, "-").toLocaleLowerCase()}`;
    setCookie(cookieName, token, 7);
  };

  const switchApp = useCallback(
    (app: Application) => {
      apiRequest<string>({
        endpoint: "auth/app",
        method: "GET",
        params: { appcode: app.APPCOD },
        token: jwtPayload.$token,
        setLoading: setSwitching,
        onSuccess: (result) => {
          if (!result.data) return;

          saveTokenForApp(result.data, app.APPCOD);

          if (IS_PRODUCTION) {
            window.location.href = app.APPLNK;
          }
        },
      });
    },
    [jwtPayload],
  );

  return {
    applications,
    isLoadingApps,
    isSwitching,
    loadApplications,
    switchApp,
  };
}
