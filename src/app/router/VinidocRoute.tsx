import React from "react";
import { Navigate } from "react-router-dom";
import { PageLoading, PrivateRoute } from "@uvcdr/app-shell";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { useVinidoc } from "../../features/vinidoc/context/VinidocContext";
import type { Rights } from "../../entities/vinidoc/vinidoc.types";
import {
  MERGE_FIELDS_ONLY_PATH,
  useMergeFieldsOnly,
} from "../../features/auth/hooks/useMergeFieldsOnly";
import { NAV_PROPS } from "../navigation";
import "./VinidocRoute.scss";

interface VinidocRouteProps {
  /** Page à afficher une fois authentifié et autorisé. */
  component: React.ComponentType;
  /**
   * Restreint cette route à un droit VINIDOC renvoyé par l'API
   * (GET /vinidoc/me) : EDIT (œnologie), VALIDATE (marketing), TEMPLATES
   * (modèles PowerPoint). Même signal que l'affichage des liens dans la Nav
   * (cf. app/navigation.ts).
   */
  requireRight?: keyof Rights;
  /**
   * ⚠️ TEMPORAIRE — route ouverte en accès restreint (cf. useMergeFieldsOnly) :
   * les autres routes redirigent vers MERGE_FIELDS_ONLY_PATH, et `requireRight`
   * n'est pas exigé ici (la page n'affiche que ses sections autorisées).
   */
  allowMergeFieldsOnly?: boolean;
}

/**
 * Contrôles propres à VINIDOC, sous le PrivateRoute du socle (qui gère déjà
 * l'authentification, la version et la maintenance) : chargement des droits
 * VINIDOC, accès restreint temporaire, erreur de l'API VINIDOC et droit requis.
 */
const VinidocGuard: React.FC<VinidocRouteProps> = ({
  component: Component,
  requireRight,
  allowMergeFieldsOnly = false,
}) => {
  const vinidoc = useVinidoc();
  const mergeFieldsOnly = useMergeFieldsOnly();

  // ⏳ Droits VINIDOC en cours de chargement
  if (vinidoc.loading) return <PageLoading />;

  // ⚠️ TEMPORAIRE — accès restreint : balises de fusion et paramètres seuls
  if (mergeFieldsOnly && !allowMergeFieldsOnly) {
    return <Navigate to={MERGE_FIELDS_ONLY_PATH} replace />;
  }

  // 🚫 API VINIDOC inaccessible (token non émis pour VINIDOC, API arrêtée...)
  if (vinidoc.error) {
    return (
      <div className="private-route-error">
        <Icon iconName="triangle-exclamation" />
        <h3>Impossible de charger VINIDOC</h3>
        <p>
          Vos droits sur l'application n'ont pas pu être vérifiés. Vérifiez que
          vous disposez d'un accès à VINIDOC, puis réessayez.
        </p>
        <CustomButton
          variant="primary"
          leftIcon={<Icon iconName="rotate-right" />}
          onClick={() => void vinidoc.reload()}
        >
          Réessayer
        </CustomButton>
      </div>
    );
  }

  // 🚫 Droit VINIDOC requis absent : retour à l'accueil
  if (requireRight && !mergeFieldsOnly && !vinidoc.rights[requireRight]) {
    return <Navigate to="/" replace />;
  }

  // ✅ Authentifié et autorisé
  return <Component />;
};

/**
 * Route privée VINIDOC : PrivateRoute de @uvcdr/app-shell (Nav, auth,
 * version, maintenance) + contrôles des droits VINIDOC (VinidocGuard).
 */
export const VinidocRoute: React.FC<VinidocRouteProps> = (props) => (
  <PrivateRoute
    component={VinidocGuard}
    componentProps={props}
    navProps={NAV_PROPS}
  />
);
