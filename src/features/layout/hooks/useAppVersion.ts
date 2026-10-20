import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../app/api/api";
import { VersionClass } from "../../../entities/application.class";
import { APP_CODE } from "../../../app/config";
import { Application } from "../../../entities/auth/user/Application.class";

/**
 * Dernière version de l'application (+ ouverture du détail des nouveautés).
 * Extrait du Header pour être réutilisé par la Nav (badge de version), sans
 * dupliquer la logique d'appel.
 */
export function useAppVersion() {
  const { jwtPayload } = useAuth();

  const [application, setApplication] = useState<Application>();
  const [version, setVersion] = useState<VersionClass>();
  const [isVersionModalOpen, setVersionModalOpen] = useState(false);

  useEffect(() => {
    apiRequest<Application>({
      endpoint: "usersmanager/applications",
      method: "GET",
      params: { APPCOD: APP_CODE },
      token: jwtPayload.$token,
      silentError: true,
      onSuccess(result) {
        console.log("application", result.data);
        setApplication(Application.parseToClass(result.data));
      },
    });
  }, [jwtPayload.$token, jwtPayload.$userId]);

  useEffect(() => {
    apiRequest<VersionClass>({
      endpoint: "usersmanager/last-version-details",
      method: "GET",
      token: jwtPayload.$token,
      silentError: true,
      onSuccess(result) {
        setVersion(VersionClass.parseToClass(result.data));
      },
    });
  }, [jwtPayload.$token, jwtPayload.$userId]);

  const openVersionModal = useCallback(() => {
    if (!version) return;

    apiRequest<VersionClass>({
      endpoint: "usersmanager/last-version-details/opened",
      method: "POST",
      params: { VID: version.VID },
      token: jwtPayload.$token,
      silentError: true,
      onSuccess: () => {
        version.isView = true;
      },
      onFinally() {
        setVersionModalOpen(true);
      },
    });
  }, [version, jwtPayload.$token]);

  const closeVersionModal = useCallback(() => setVersionModalOpen(false), []);

  const versionLabel = version?.VNUM ? `V${version.VNUM}` : "";

  return {
    application,
    version,
    versionLabel,
    isVersionModalOpen,
    openVersionModal,
    closeVersionModal,
  };
}
