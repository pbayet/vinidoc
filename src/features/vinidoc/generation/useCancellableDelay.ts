import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Délai annulable avant une action (ex. génération lancée par erreur) :
 * `wait()` résout `true` à la fin du compte à rebours, `false` si `cancel()`
 * est appelé entre-temps (ou si le composant est démonté).
 * `remaining` : secondes restantes, null hors attente.
 */
export function useCancellableDelay(seconds: number) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const wait = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        let left = seconds;
        setRemaining(left);
        const timer = setInterval(() => {
          left -= 1;
          if (left <= 0) finish(true);
          else setRemaining(left);
        }, 1000);
        const finish = (go: boolean) => {
          clearInterval(timer);
          cancelRef.current = null;
          setRemaining(null);
          resolve(go);
        };
        cancelRef.current = () => finish(false);
      }),
    [seconds],
  );

  const cancel = useCallback(() => cancelRef.current?.(), []);

  useEffect(() => () => cancelRef.current?.(), []);

  return { remaining, wait, cancel };
}
