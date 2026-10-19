import { useSyncExternalStore } from "react";

/**
 * Gestion du thème clair / sombre de l'application.
 *
 * Le thème effectif est posé via l'attribut data-theme="dark" sur <html> :
 * c'est l'attribut attendu à la fois par les variables CSS de l'app
 * (shared/styles/_theme.scss) et par les feuilles "style-dark" des
 * librairies @uvcdr/* (importées dans main.tsx). Un seul toggle bascule donc
 * l'ensemble.
 *
 * La préférence de référence est enregistrée en base par users-manager,
 * par utilisateur et par application (cf. `userTheme.ts`) : ce module ne
 * fait qu'appliquer la préférence et la garder en cache localStorage, afin
 * que le script inline de index.html puisse l'appliquer avant le premier
 * rendu (évite un flash du thème clair) en attendant la réponse de l'API.
 * ⚠️ La clé et la logique de résolution sont dupliquées dans ce script
 * inline : les garder synchronisées.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "vinidoc-theme";
export const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Clair",
  dark: "Sombre",
  system: "Système",
};

export const DEFAULT_PREFERENCE: ThemePreference = "light";

const darkQuery = (): MediaQueryList | null =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return darkQuery()?.matches ? "dark" : "light";
  }
  return preference;
}

/** Applique le thème résolu sur <html>. */
export function applyTheme(
  preference: ThemePreference = getThemePreference(),
): void {
  const root = document.documentElement;
  if (resolveTheme(preference) === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

// ─── Store minimal pour synchroniser les composants abonnés ────────────────

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/**
 * Applique une préférence et la met en cache. Ne l'enregistre pas en base :
 * passer par `useUserTheme` pour une modification par l'utilisateur.
 */
export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Stockage indisponible (navigation privée…) : on applique quand même.
  }
  applyTheme(preference);
  emit();
}

/**
 * À appeler une fois au démarrage : applique le thème et suit les
 * changements du thème système (préférence "system") ainsi que les
 * modifications faites depuis un autre onglet.
 */
export function initTheme(): void {
  applyTheme();

  darkQuery()?.addEventListener("change", () => {
    if (getThemePreference() === "system") {
      applyTheme("system");
      emit();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme();
      emit();
    }
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Thème actuellement appliqué à l'application (lecture seule). */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getThemePreference);
  const resolvedTheme = useSyncExternalStore(subscribe, () =>
    resolveTheme(getThemePreference()),
  );

  return { preference, resolvedTheme };
}
