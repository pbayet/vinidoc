import { useEffect, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../app/api/api";
import { VersionClass } from "../../../entities/application.class";
import { APP_CODE } from "../../../app/config";

/**
 * Historique des versions de l'application (plus récente d'abord), pour le
 * sélecteur de version de la modale « Les nouveautés »
 * (GET usersmanager/versions, API UNIS).
 */
export function useAppVersionsHistory(): VersionClass[] {
  const { jwtPayload } = useAuth();
  const [versions, setVersions] = useState<VersionClass[]>([]);

  useEffect(() => {
    if (!APP_CODE) return;

    void apiRequest<VersionClass[]>({
      endpoint: "usersmanager/versions",
      method: "GET",
      params: { APPCOD: APP_CODE },
      token: jwtPayload.$token,
      silentError: true,
      onSuccess: (result) => {
        setVersions(VersionClass.parseToClasses(result.data) ?? []);
      },
    });
  }, [jwtPayload.$token]);

  return versions;
}
