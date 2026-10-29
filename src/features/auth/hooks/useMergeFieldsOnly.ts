import { useAuth } from "@uvcdr/api-auth-system";
import { IS_PRODUCTION } from "../../../app/config";

/** Route de la seule page accessible en accès restreint. */
export const MERGE_FIELDS_ONLY_PATH = "/modeles";

/**
 * ⚠️ TEMPORAIRE — accès restreint : en production, un utilisateur de statut
 * USER (`jwtPayload.$permission`) n'a accès qu'à la page « Modèles
 * PowerPoint », réduite à la section « Balises de fusion », et à la page
 * « Paramètres », réduite à la section « Apparence ».
 *
 * Appliqué par PrivateRoute (redirection des autres pages), Nav.tsx (liens
 * masqués), ModelesPage (liste/import/édition des modèles masqués) et
 * ParametresPage (paramètres de l'application masqués).
 * Pour lever la restriction : faire renvoyer `false` ici.
 */
export const useMergeFieldsOnly = (): boolean => {
  const { jwtPayload } = useAuth();
  return IS_PRODUCTION && jwtPayload?.$permission === "USER";
};
