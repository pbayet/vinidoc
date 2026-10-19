import { useCallback, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../../app/api/api";
import { APP_CODE } from "../../../../app/config";

/**
 * Bascule d'identité (admin uniquement) : appelle `auth/dev` pour obtenir un
 * token décoré du compte/permission ciblés, puis recharge la page.
 *
 * Partagé entre `SwitchUserModal` (sélection libre d'un compte) et le bouton
 * "Revenir à mon compte" de la Nav (retour direct au compte/permission
 * réellement connecté, sans passer par le modal).
 */
export function useSwitchUser() {
  const { jwtPayload } = useAuth();
  const [isLoading, setLoading] = useState(false);

  const isAdmin = jwtPayload.$basepayload.permissionLevel === 1;

  // Vrai si le compte affiché diffère du compte réellement connecté — soit
  // parce que l'email a changé, soit parce que seule la permission a été
  // usurpée (même compte, autre niveau).
  const isImpersonating =
    jwtPayload.$userEmail !== jwtPayload.$userEmailBasepayload ||
    jwtPayload.$permissionLevel !== jwtPayload.$basepayload.permissionLevel;

  const switchUser = useCallback(
    (email: string, permissionLevel: string | number) => {
      if (!isAdmin) return;

      apiRequest<string>({
        endpoint: "auth/dev",
        method: "GET",
        params: {
          email: email || jwtPayload.$userEmail,
          permlvl: permissionLevel || jwtPayload.$permissionLevel,
          appcode: APP_CODE,
        },
        token: jwtPayload.$baseToken,
        silentError: true,
        setLoading,
        onSuccess: (result) => {
          if (result.data) {
            jwtPayload.$token = result.data;
            setTimeout(() => window.location.reload(), 300);
          }
        },
      });
    },
    [isAdmin, jwtPayload],
  );

  // Retour direct au compte/permission réellement connecté (équivalent du
  // bouton "Utilisateur de base" du modal, sans passer par le formulaire).
  const resetToBaseUser = useCallback(() => {
    switchUser(
      jwtPayload.$userEmailBasepayload,
      String(jwtPayload.$basepayload.permissionLevel),
    );
  }, [switchUser, jwtPayload]);

  return { isAdmin, isImpersonating, isLoading, switchUser, resetToBaseUser };
}
