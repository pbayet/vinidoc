import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { apiRequest } from "../../../app/api/api";
import { APP_CODE } from "../../../app/config";
import {
  DEFAULT_PREFERENCE,
  isThemePreference,
  setThemePreference,
  type ThemePreference,
} from "./theme";

/**
 * Préférence de thème de l'utilisateur connecté, enregistrée en base par
 * users-manager (API `usersmanager/theme`, table USRTHEME) :
 *  - thème spécifique à cette application (APP_CODE), sinon
 *  - thème par défaut de l'utilisateur, sinon 'light'.
 *
 * Chaque utilisateur ne gère que ses propres préférences (USRID déduit du JWT
 * côté API). Le thème résolu est appliqué via `setThemePreference`, qui le
 * garde aussi en cache localStorage pour le script anti-flash de index.html.
 *
 * Logique reprise de users-manager (shared/lib/theme/userThemes.ts) : la
 * garder alignée.
 */

interface UserTheme {
  /** Thème spécifique à l'application, null = suit le thème par défaut */
  application: ThemePreference | null;
  /** Thème par défaut de l'utilisateur (Paramètres de users-manager) */
  default: ThemePreference;
}

/** Réponse de GET usersmanager/theme */
interface ThemeResponse {
  APPCOD: string | null;
  THEME: ThemePreference;
  DEFAULT: ThemePreference;
  SOURCE: "APPLICATION" | "DEFAULT";
}

/** Réponse de POST usersmanager/theme (état complet de l'utilisateur) */
interface ThemesResponse {
  DEFAULT: ThemePreference;
  APPLICATIONS: { APPID: number; APPCOD: string; THEME: ThemePreference }[];
}

const parseThemeResponse = (data: unknown): UserTheme | null => {
  if (!data || typeof data !== "object") return null;
  const raw = data as Partial<ThemeResponse>;
  const DEFAULT = isThemePreference(raw.DEFAULT)
    ? raw.DEFAULT
    : DEFAULT_PREFERENCE;

  return {
    application:
      raw.SOURCE === "APPLICATION" && isThemePreference(raw.THEME)
        ? raw.THEME
        : null,
    default: DEFAULT,
  };
};

const parseThemesResponse = (data: unknown): UserTheme | null => {
  if (!data || typeof data !== "object") return null;
  const raw = data as Partial<ThemesResponse>;
  const appTheme = (
    Array.isArray(raw.APPLICATIONS) ? raw.APPLICATIONS : []
  ).find((a) => a?.APPCOD === APP_CODE)?.THEME;

  return {
    application: isThemePreference(appTheme) ? appTheme : null,
    default: isThemePreference(raw.DEFAULT) ? raw.DEFAULT : DEFAULT_PREFERENCE,
  };
};

// ─── Store partagé (initialisation, Paramètres) ────────────────────────────

interface UserThemeSnapshot {
  /** null tant que la préférence n'est pas chargée */
  theme: UserTheme | null;
  /** true si le dernier chargement a échoué */
  loadError: boolean;
}

let snapshot: UserThemeSnapshot = { theme: null, loadError: false };
let loadedForUser: number | null = null;
const listeners = new Set<() => void>();

const setSnapshot = (next: UserThemeSnapshot) => {
  snapshot = next;
  if (next.theme) {
    setThemePreference(next.theme.application ?? next.theme.default);
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

/**
 * Charge la préférence de l'utilisateur et applique le thème. En cas
 * d'échec (API indisponible…), le thème en cache localStorage reste
 * appliqué.
 */
export async function loadUserTheme(
  userId: number,
  token: string,
): Promise<void> {
  if (loadedForUser !== userId) {
    // Changement d'utilisateur (connexion, « changer d'utilisateur ») :
    // on n'expose pas la préférence du précédent.
    loadedForUser = userId;
    setSnapshot({ theme: null, loadError: false });
  }

  await apiRequest<ThemeResponse>({
    endpoint: "usersmanager/theme",
    method: "GET",
    params: { APPCOD: APP_CODE },
    token,
    silentError: true,
    onSuccess: (result) => {
      if (loadedForUser !== userId) return;
      const theme = parseThemeResponse(result.data);
      setSnapshot({ theme, loadError: !theme });
    },
    onError: () => {
      if (loadedForUser === userId)
        setSnapshot({ ...snapshot, loadError: true });
    },
  });
}

/**
 * Hook d'initialisation (à monter une fois sous l'AuthProvider) : (re)charge
 * la préférence dès que l'utilisateur est authentifié ou qu'il change.
 */
export function useUserThemeSync(): void {
  const { jwtPayload, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? jwtPayload.$userId : 0;
  const token = jwtPayload.$token;

  useEffect(() => {
    if (!userId || !token) return;
    void loadUserTheme(userId, token);
    // Le token se rafraîchit régulièrement : seul le changement
    // d'utilisateur doit déclencher un rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}

/**
 * Lecture / modification du thème de cette application pour l'utilisateur
 * connecté. `setApplicationTheme(null)` fait repasser l'application sur le
 * thème par défaut de l'utilisateur.
 */
export function useUserTheme() {
  const { jwtPayload } = useAuth();
  const { theme, loadError } = useSyncExternalStore(subscribe, getSnapshot);
  const [isSaving, setSaving] = useState(false);

  const setApplicationTheme = useCallback(
    async (THEME: ThemePreference | null) => {
      // THEME absent = null côté API : retour au thème par défaut.
      const params: Record<string, string> = { APPCOD: APP_CODE };
      if (THEME) params.THEME = THEME;

      await apiRequest<ThemesResponse>({
        endpoint: "usersmanager/theme",
        method: "POST",
        params,
        token: jwtPayload.$token,
        setLoading: setSaving,
        onSuccess: (result) => {
          const next = parseThemesResponse(result.data);
          if (next) setSnapshot({ theme: next, loadError: false });
        },
      });
    },
    [jwtPayload],
  );

  /**
   * Thème par défaut de l'utilisateur (commun à toutes les applications qui
   * n'ont pas de thème propre) : POST sans APPCOD. Si cette application suit
   * le thème par défaut, le nouveau thème s'applique immédiatement.
   */
  const setDefaultTheme = useCallback(
    async (THEME: ThemePreference) => {
      await apiRequest<ThemesResponse>({
        endpoint: "usersmanager/theme",
        method: "POST",
        params: { THEME },
        token: jwtPayload.$token,
        setLoading: setSaving,
        onSuccess: (result) => {
          const next = parseThemesResponse(result.data);
          if (next) setSnapshot({ theme: next, loadError: false });
        },
      });
    },
    [jwtPayload],
  );

  return {
    /** null tant que la préférence n'est pas chargée */
    theme,
    isLoading: theme === null && !loadError,
    loadError,
    isSaving,
    setApplicationTheme,
    setDefaultTheme,
  };
}
