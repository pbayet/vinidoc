import React, { JSX, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { DOMAIN, IS_PRODUCTION } from "../../../app/config";
import "../../auth/styles/PrivateRoute.scss";
import Nav from "../../layout/Nav/ui/Nav";
import { useAuth } from "@uvcdr/api-auth-system";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { useVinidoc } from "../../vinidoc/context/VinidocContext";
import type { Rights } from "../../../entities/vinidoc/vinidoc.types";
import {
  MERGE_FIELDS_ONLY_PATH,
  useMergeFieldsOnly,
} from "../hooks/useMergeFieldsOnly";

interface PrivateRouteProps<T extends object> {
  component: React.ComponentType<T>;
  componentProps?: T;
  /**
   * Restreint cette route aux utilisateurs autorisés à modifier
   * (`jwtPayload.CAN_MODIFY`, piloté par `VITE_MODIFY_PERMS`) — utilisé par
   * les pages d'administration (données œnologiques, modèles PowerPoint).
   * Un utilisateur authentifié sans ce droit est redirigé vers l'accueil
   * (même signal que les liens masqués dans Nav.tsx).
   */
  requireModify?: boolean;
  /**
   * Restreint cette route à un droit VINIDOC renvoyé par l'API
   * (GET /vinidoc/me) : EDIT (œnologie), VALIDATE (marketing), TEMPLATES
   * (modèles PowerPoint). Même signal que l'affichage des liens dans Nav.tsx.
   */
  requireRight?: keyof Rights;
  /**
   * ⚠️ TEMPORAIRE — route ouverte en accès restreint (cf. useMergeFieldsOnly) :
   * les autres routes redirigent vers MERGE_FIELDS_ONLY_PATH, et `requireRight`
   * n'est pas exigé ici (la page n'affiche que ses sections autorisées).
   */
  allowMergeFieldsOnly?: boolean;
}

const PrivateRoute = <T extends object>({
  component: Component,
  componentProps,
  requireModify = false,
  requireRight,
  allowMergeFieldsOnly = false,
}: PrivateRouteProps<T>): JSX.Element | null => {
  const { isAuthenticated, loading, jwtPayload } = useAuth();
  const vinidoc = useVinidoc();
  const mergeFieldsOnly = useMergeFieldsOnly();

  // 🔁 Redirection hard en production (changement d'URL)
  useEffect(() => {
    if (!loading && !isAuthenticated && IS_PRODUCTION) {
      window.location.href = `${DOMAIN}/home`;
    }
  }, [loading, isAuthenticated]);

  // ⏳ État de chargement
  if (loading || (isAuthenticated && vinidoc.loading)) {
    return <div className="private-route-loading" />;
  }

  // 🔐 Non authentifié
  if (!isAuthenticated) {
    if (!IS_PRODUCTION) {
      return <Navigate to="/login" replace />;
    }

    // En production, la redirection est gérée par l'effect ci-dessus
    return null;
  }

  // ⚠️ TEMPORAIRE — accès restreint : balises de fusion et paramètres seuls
  if (mergeFieldsOnly && !allowMergeFieldsOnly) {
    return <Navigate to={MERGE_FIELDS_ONLY_PATH} replace />;
  }

  // 🚫 Authentifié mais sans droit de modification : route réservée
  if (requireModify && !jwtPayload.CAN_MODIFY) {
    return <Navigate to="/" replace />;
  }

  // 🚫 API VINIDOC inaccessible (token non émis pour VINIDOC, API arrêtée...)
  if (vinidoc.error) {
    return (
      <div className="body">
        <Nav />
        <div className="private-route-error">
          <Icon iconName="triangle-exclamation" />
          <h3>Impossible de charger VINIDOC</h3>
          <p>
            Vos droits sur l'application n'ont pas pu être vérifiés. Vérifiez
            que vous disposez d'un accès à VINIDOC, puis réessayez.
          </p>
          <CustomButton
            variant="primary"
            leftIcon={<Icon iconName="rotate-right" />}
            onClick={() => void vinidoc.reload()}
          >
            Réessayer
          </CustomButton>
        </div>
      </div>
    );
  }

  // 🚫 Droit VINIDOC requis absent : retour à l'accueil
  if (requireRight && !mergeFieldsOnly && !vinidoc.rights[requireRight]) {
    return <Navigate to="/" replace />;
  }

  // ✅ Authentifié (et autorisé, si requis)
  return (
    <div className="body">
      <Nav />
      <Component {...(componentProps ?? ({} as T))} />
    </div>
  );
};

export default PrivateRoute;
