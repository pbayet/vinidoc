import { useEffect, useRef, useState } from "react";

interface StableLoadingOptions {
  showDelayMs?: number; // délai avant d'afficher le loader
  minVisibleMs?: number; // durée minimale d'affichage une fois visible
}

export function useStableLoading(
  isLoading: boolean,
  options: StableLoadingOptions = {},
): boolean {
  const showDelayMs = options.showDelayMs ?? 150;
  const minVisibleMs = options.minVisibleMs ?? 250;

  const [stable, setStable] = useState<boolean>(false);

  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = (): void => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    clearTimers();

    if (isLoading) {
      // Si déjà visible, rien à faire
      if (stable) return;

      // Affiche seulement si ça dure > showDelayMs
      showTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setStable(true);
      }, showDelayMs);

      return clearTimers;
    }

    // isLoading = false
    if (!stable) return clearTimers;

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    hideTimerRef.current = window.setTimeout(() => {
      shownAtRef.current = null;
      setStable(false);
    }, remaining);

    return clearTimers;
  }, [isLoading, minVisibleMs, showDelayMs, stable]);

  return stable;
}
