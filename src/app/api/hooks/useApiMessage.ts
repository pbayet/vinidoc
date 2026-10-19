// useApiErrorMessage.ts

import { useCallback } from "react";
import { ApiError, isApiError, isApiResult } from "../api";
import { type ApiRequestContext } from "@uvcdr/api-auth-system";
import { useNotification } from "@uvcdr/confirm-notify-system";

// -----------------------------------------
// HELPER : construction du hiddenMessage
// -----------------------------------------

const buildHiddenMessage = (
  friendly: string,
  technical: string,
  context?: ApiRequestContext,
): string => {
  let params: unknown = null;
  try {
    params = context?.params ?? null;
    // force la sérialisation pour détecter les valeurs non-JSON
    JSON.stringify(params);
  } catch {
    params = "[non sérialisables]";
  }

  const payload = {
    timestamp: new Date().toISOString(),
    request: context
      ? {
          method: context.method,
          url: `${context.baseUrl}/${context.endpoint}`,
          params,
        }
      : null,
    error: {
      friendly,
      technical,
    },
  };

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return JSON.stringify({ error: { friendly, technical } }, null, 2);
  }
};

// -----------------------------------------
// HELPERS : messages user-friendly
// -----------------------------------------

/**
 * Message lisible selon le code HTTP et éventuellement la clé métier de l'API.
 * Ajouter ici des cas spécifiques à votre domaine (ex: "USER_NOT_FOUND").
 */
const friendlyApiError = (
  status: number,
  key?: string,
  description?: string,
): string => {
  // Erreurs métier VINIDOC (famille 1700) : l'API renvoie déjà une
  // description en français, précise et actionnable (ex. « Textes trop longs
  // ou manquants pour ce modèle : DEGUSTATION 412/350 »).
  if (key?.startsWith("VINIDOC_") && description) return description;

  // Clés métier spécifiques
  if (key) {
    const byKey: Record<string, string> = {
      // Auth / Utilisateurs (1100)
      ACCESS_DENIED: "Vous n'avez pas les droits pour effectuer cette action.",
      ACCESS_DENIED_WO_LOGOUT:
        "Vous n'avez pas les droits pour effectuer cette action.",
      INVALID_CREDENTIALS: "Adresse e-mail ou mot de passe incorrect.",
      USER_NOT_FOUND: "Aucun compte ne correspond à ces informations.",
      MISSING_PARAMETERS: "Des informations obligatoires sont manquantes.",
      ACCOUNT_TEMPORARILY_BLOCKED:
        "Compte temporairement bloqué suite à trop de tentatives. Réessayez dans quelques instants.",
      INVALID_TOKEN: "Votre session est invalide. Veuillez vous reconnecter.",
      TOKEN_EXPIRED: "Votre session a expiré. Veuillez vous reconnecter.",
      // LDAP (1200)
      LDAP_CONFIGURATION_ERROR:
        "Erreur de configuration du service d'annuaire. Contactez l'administrateur.",
      LDAP_SERVICE_BIND_FAILED:
        "Impossible de joindre le service d'annuaire. Contactez l'administrateur.",
      LDAP_SEARCH_FAILED:
        "La recherche dans l'annuaire a échoué. Réessayez ou contactez l'administrateur.",
      LDAP_SEARCH_ERROR:
        "Une erreur inattendue s'est produite lors de la recherche dans l'annuaire.",
      // Base de données (1300)
      DB_CONFIGURATION_ERROR:
        "Erreur de configuration de la base de données. Contactez l'administrateur.",
      DB_CONNECTION_FAILED:
        "Impossible de se connecter à la base de données. Réessayez dans quelques instants.",
      DB_LOGIN_FAILED:
        "Échec d'authentification à la base de données. Contactez l'administrateur.",
      DB_NOT_FOUND:
        "La base de données est introuvable. Contactez l'administrateur.",
      DB_QUERY_ERROR:
        "Une erreur s'est produite lors de l'exécution de la requête. Réessayez.",
      DB_POOL_ERROR:
        "Le service de base de données est surchargé. Réessayez dans quelques instants.",
      DB_UNAVAILABLE:
        "La base de données est temporairement indisponible. Réessayez plus tard.",
      // Data (1400)
      DATA_NOT_FOUND: "Aucune donnée ne correspond à votre demande.",
      // Interne (9999)
      INTERNAL_ERROR:
        "Une erreur est survenue côté serveur. Réessayez plus tard.",
    };
    if (byKey[key]) return byKey[key];

    // Clé dynamique : ACCOUNT_LOCKED_[TIME] → ex: "ACCOUNT_LOCKED_5min"
    if (key.startsWith("ACCOUNT_LOCKED_")) {
      const time = key.replace("ACCOUNT_LOCKED_", "");
      return `Compte bloqué pendant ${time}. Trop de tentatives échouées.`;
    }
  }

  return friendlyHttpError(status);
};

const friendlyHttpError = (status: number): string => {
  switch (status) {
    case 400:
      return "La requête est invalide. Vérifiez les données saisies.";
    case 401:
      return "Vous devez être connecté pour effectuer cette action.";
    case 403:
      return "Vous n'avez pas les droits pour effectuer cette action.";
    case 404:
      return "La ressource demandée est introuvable.";
    case 409:
      return "Un conflit empêche cette opération (doublon existant).";
    case 422:
      return "Les données envoyées sont incorrectes ou incomplètes.";
    case 429:
      return "Trop de requêtes. Veuillez patienter un instant.";
    case 500:
      return "Une erreur est survenue côté serveur. Réessayez plus tard.";
    case 502:
    case 503:
    case 504:
      return "Le serveur est temporairement indisponible. Réessayez dans quelques instants.";
    default:
      return "Une erreur est survenue. Veuillez réessayer.";
  }
};

// -----------------------------------------

export const useApiMessage = () => {
  const { notifySuccess, notifyError } = useNotification();

  const showApiMessage = useCallback(
    (result?: unknown, message?: string, context?: ApiRequestContext): void => {
      // Cas : erreurs typées de l’API
      if (isApiError(result)) {
        const apiError = result as ApiError;

        if (apiError.type === "API_ERROR") {
          const body = apiError.body as
            | {
                error?: {
                  description?: string;
                  message?: string;
                  key?: string;
                  debug?: string;
                  code?: number;
                };
              }
            | undefined;

          // debug (stack trace) en priorité, sinon description, sinon message
          const technical =
            body?.error?.debug ??
            body?.error?.description ??
            body?.error?.message ??
            apiError.message;

          const friendly = friendlyApiError(
            apiError.status,
            body?.error?.key,
            body?.error?.description,
          );
          notifyError(
            friendly,
            buildHiddenMessage(friendly, technical, context),
          );
          console.error(apiError);
          return;
        }

        if (apiError.type === "HTTP_ERROR") {
          const friendly = friendlyHttpError(apiError.status);
          const technical = `HTTP ${apiError.status} — ${apiError.statusText}`;
          notifyError(
            friendly,
            buildHiddenMessage(friendly, technical, context),
          );
          console.error(apiError);
          return;
        }

        if (apiError.type === "NETWORK_ERROR") {
          const friendly =
            "Impossible de contacter le serveur. Vérifiez votre connexion.";
          notifyError(
            friendly,
            buildHiddenMessage(friendly, apiError.message, context),
          );
          console.error(apiError);
          return;
        }
      }

      // Cas : erreur JS classique
      if (result instanceof Error) {
        const frendly = "Une erreur inattendue s’est produite.";
        notifyError(
          frendly,
          buildHiddenMessage(frendly, result.message, context),
        );
        console.error(result);
        return;
      }

      // Cas : succès API typé
      if (isApiResult(result)) {
        if (message) notifySuccess(message);
        return;
      } else if (message) {
        notifySuccess(message);
        return;
      }

      // Cas : réponse vide / inconnue
      if (result == null) {
        const frendly = "Aucune réponse reçue du serveur.";
        notifyError(
          frendly,
          buildHiddenMessage(frendly, "result == null", context),
        );
        return;
      }
      const frendly = "Une erreur inattendue s’est produite.";

      // Fallback
      notifyError(
        frendly,
        buildHiddenMessage(frendly, String(result), context),
      );
    },
    [notifySuccess, notifyError],
  );

  // ⚠️ L'injection dans le registry (setApiMessageHandler) ne se fait plus
  // ici : elle est faite une seule fois, de façon permanente, par
  // `ApiMessageInitializer` dans `app/main.tsx`. La faire ici causait deux
  // problèmes : le handler n'était actif que pendant que ce composant précis
  // (SettingsPage / useFolderActions) était monté, et le démontage de l'un
  // d'eux effaçait le registry pour toute l'application (clearApiMessageHandler
  // étant global, pas scoped au composant qui l'avait enregistré).

  return { showApiMessage };
};
