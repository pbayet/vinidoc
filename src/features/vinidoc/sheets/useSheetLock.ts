import { useEditLock, type EditLockState } from "@uvcdr/realtime";
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
//
// Mécanique (prolongation, libération, réservations des autres en temps
// réel, vérification après une coupure) : `useEditLock` de @uvcdr/realtime,
// généralisation de l'ancien hook local. Seul le branchement sur l'API
// VINIDOC et ses évènements reste ici.

export type SheetLockState = EditLockState;

/**
 * @param SHTID   fiche concernée
 * @param initial réservation renvoyée par GET /sheets/:SHTID (LOCK)
 */
export function useSheetLock(
  SHTID: number | undefined,
  initial: SheetLock | null | undefined,
): SheetLockState {
  const api = useVinidocApi();

  return useEditLock({
    id: SHTID || null,
    initial,
    // Réservation demandée par l'utilisateur : erreur affichée ;
    // prolongation en arrière-plan : silencieuse.
    acquire: (id, { silent }) => api.lockSheet(id, { silentError: silent }),
    release: (id) => api.unlockSheet(id, { silentError: true }),
    events: {
      locked: "vinidoc.sheet.locked",
      unlocked: "vinidoc.sheet.unlocked",
    },
    match: "SHTID",
  });
}
