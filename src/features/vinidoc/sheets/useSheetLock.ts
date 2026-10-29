import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { useWebSocket, type WsMessage } from "../../../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../api/useVinidocApi";
import type { SheetLock } from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Réservation d'une fiche ouverte en modification (RG-04)
// -----------------------------------------
// Avant toute saisie, l'utilisateur réserve la fiche (POST /lock) : si un
// autre la modifie déjà, il est prévenu (nom + heure) et reste en lecture
// seule. Tant qu'il est actif (clavier, souris), la réservation est
// prolongée chaque minute ; inactif, elle expire côté serveur au bout de
// PARAMS.LOCK_TIMEOUT_MIN. Elle est libérée à l'enregistrement, à
// l'abandon de la modification ou à la fermeture de la fiche.

/** Prolongation de la réservation, si l'utilisateur a été actif depuis. */
const HEARTBEAT_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["keydown", "pointerdown", "input"] as const;

type LockEvent = WsMessage<{ SHTID?: number; USR?: string; USRNAME?: string; LOCKDAT?: string }>;

export interface SheetLockState {
  /** Réservation connue (de l'utilisateur ou d'un autre), null si libre */
  lock: SheetLock | null;
  /** La fiche est réservée par l'utilisateur courant */
  mine: boolean;
  /** Réservée par un autre utilisateur : lecture seule */
  heldByOther: boolean;
  /** Réservation perdue pendant la modification (expirée puis reprise par un autre) */
  lost: boolean;
  acquiring: boolean;
  /** Réserve la fiche ; false si un autre utilisateur la modifie déjà */
  acquire: () => Promise<boolean>;
  release: () => Promise<void>;
}

/**
 * @param SHTID   fiche concernée
 * @param initial réservation renvoyée par GET /sheets/:SHTID (LOCK)
 */
export function useSheetLock(SHTID: number | undefined, initial: SheetLock | null | undefined): SheetLockState {
  const api = useVinidocApi();
  const { jwtPayload } = useAuth();
  const me = String(jwtPayload?.$payload?.data?.email ?? "").toLowerCase();

  const [lock, setLock] = useState<SheetLock | null>(initial ?? null);
  const [lost, setLost] = useState(false);
  const [acquiring, setAcquiring] = useState(false);
  const mine = !!lock?.MINE;
  const mineRef = useRef(mine);
  mineRef.current = mine;

  // Relecture de la fiche : la réservation renvoyée par l'API fait foi, sauf
  // la nôtre (gérée ici : prolongations, libération).
  useEffect(() => {
    if (initial === undefined) return;
    setLock((cur) => (cur?.MINE && (!initial || initial.MINE) ? cur : (initial ?? null)));
  }, [initial]);

  const acquire = useCallback(async () => {
    if (!SHTID) return false;
    try {
      const r = await api.lockSheet(SHTID, { setLoading: setAcquiring });
      setLock(r);
      setLost(false);
      return r.MINE;
    } catch {
      return false;
    }
  }, [api, SHTID]);

  const release = useCallback(async () => {
    if (!SHTID || !mineRef.current) return;
    setLock(null);
    setLost(false);
    await api.unlockSheet(SHTID, { silentError: true }).catch(() => undefined);
  }, [api, SHTID]);

  // Prolongation tant que l'utilisateur est actif.
  useEffect(() => {
    if (!SHTID || !mine) return;
    let active = false;
    const markActive = () => {
      active = true;
    };
    ACTIVITY_EVENTS.forEach((e) => document.addEventListener(e, markActive, true));
    const timer = window.setInterval(() => {
      if (!active) return;
      active = false;
      api
        .lockSheet(SHTID, { silentError: true })
        .then((r) => {
          setLock(r);
          if (!r.MINE) setLost(true);
        })
        .catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => {
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, markActive, true));
    };
  }, [api, SHTID, mine]);

  // Fermeture de la fiche (démontage) : libération.
  useEffect(
    () => () => {
      if (SHTID && mineRef.current) void api.unlockSheet(SHTID, { silentError: true }).catch(() => undefined);
    },
    [api, SHTID],
  );

  // Réservations des autres utilisateurs, en temps réel.
  const onLocked = useCallback(
    (msg: LockEvent) => {
      const p = msg.payload;
      if (!p || p.SHTID !== SHTID || !p.USR || p.USR === me) return;
      if (mineRef.current) setLost(true);
      setLock({
        USR: p.USR,
        USRNAME: p.USRNAME ?? p.USR,
        LOCKDAT: p.LOCKDAT ?? new Date().toISOString(),
        LASTSEEN: new Date().toISOString(),
        MINE: false,
      });
    },
    [SHTID, me],
  );
  const onUnlocked = useCallback(
    (msg: LockEvent) => {
      if (msg.payload?.SHTID !== SHTID) return;
      setLock((cur) => (cur?.MINE ? cur : null));
    },
    [SHTID],
  );
  useWebSocket("vinidoc.sheet.locked", onLocked);
  useWebSocket("vinidoc.sheet.unlocked", onUnlocked);

  return {
    lock,
    mine,
    heldByOther: !!lock && !lock.MINE,
    lost,
    acquiring,
    acquire,
    release,
  };
}
