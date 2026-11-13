import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@uvcdr/api-auth-system";
import { useVinidocApi } from "../api/useVinidocApi";
import { useRealtimeEvent } from "@uvcdr/realtime";
import { useQuery, useQueryClient } from "@uvcdr/data-query";
import type {
  Color,
  Language,
  MergeFields,
  Rights,
} from "../../../entities/vinidoc/vinidoc.types";

// -----------------------------------------
// Contexte VINIDOC
// -----------------------------------------
// Charge une fois (après authentification) ce dont toutes les pages ont
// besoin : droits de l'utilisateur (GET /vinidoc/me — œnologie, marketing,
// modèles), langues, couleurs, catalogue des balises avec longueurs max, et
// le nombre de fiches en attente de validation (badge de la Nav).
// Les droits viennent de l'API (services configurés côté serveur) : ce sont
// eux qui pilotent l'accès aux pages et l'affichage des actions.

/** Clé de cache (@uvcdr/data-query) du nombre de fiches à valider. */
const PENDING_COUNT_KEY = ["vinidoc/pending-count"] as const;

const NO_RIGHTS: Rights = { EDIT: false, VALIDATE: false, TEMPLATES: false, PARAMS: false, GENERATE: false };

interface VinidocContextValue {
  /** true tant que /me n'a pas répondu */
  loading: boolean;
  /** Erreur de chargement (token non émis pour VINIDOC, API indisponible...) */
  error: boolean;
  rights: Rights;
  languages: Language[];
  defaultLng: string;
  colors: Color[];
  mergeFields: MergeFields | null;
  /** Fiches au statut SUBMITTED (validation marketing) */
  pendingCount: number;
  reload: () => Promise<void>;
  reloadMergeFields: () => Promise<void>;
  reloadPendingCount: () => Promise<void>;
}

const VinidocContext = createContext<VinidocContextValue | null>(null);

export const VinidocProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const api = useVinidocApi();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rights, setRights] = useState<Rights>(NO_RIGHTS);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultLng, setDefaultLng] = useState("fr");
  const [colors, setColors] = useState<Color[]>([]);
  const [mergeFields, setMergeFields] = useState<MergeFields | null>(null);

  const reloadMergeFields = useCallback(async () => {
    try {
      setMergeFields(await api.getMergeFields(undefined, { silentError: true }));
    } catch {
      /* non bloquant : les compteurs de saisie s'affichent sans limite */
    }
  }, [api]);

  // Fiches à valider (pastille de la Nav) : chargées par @uvcdr/data-query
  // une fois /me chargé (comme avant), puis rechargées par
  // reloadPendingCount (évènements temps réel, actions de SheetEditor).
  // Non bloquant : en cas d'erreur, la dernière valeur connue reste affichée.
  const { data: pendingCount = 0 } = useQuery({
    queryKey: PENDING_COUNT_KEY,
    queryFn: async () => {
      const list = await api.listSheets({ STATUS: "SUBMITTED", PAGESIZE: 1 }, { silentError: true });
      return list.TOTAL;
    },
    enabled: isAuthenticated && !loading && !error,
    retry: false,
  });

  const reloadPendingCount = useCallback(
    () => queryClient.invalidateQueries(PENDING_COUNT_KEY),
    [queryClient],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.getMe({ silentError: true });
      setRights(me.RIGHTS);
      setLanguages(me.LANGUAGES);
      setDefaultLng(me.DEFAULT_LNGCOD ?? me.LANGUAGES[0]?.LNGCOD ?? "fr");
      setColors(me.COLORS);
      setError(false);
      // Le nombre de fiches à valider suit (requête activée en fin de chargement).
      await reloadMergeFields();
    } catch {
      setRights(NO_RIGHTS);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [api, reloadMergeFields]);

  useEffect(() => {
    if (isAuthenticated) void reload();
  }, [isAuthenticated, reload]);

  // Temps réel : le badge "À valider" et les limites de saisie suivent les
  // actions des autres utilisateurs.
  const onSheetEvent = useCallback(() => void reloadPendingCount(), [reloadPendingCount]);
  const onTemplateEvent = useCallback(() => void reloadMergeFields(), [reloadMergeFields]);
  useRealtimeEvent(
    [
      "vinidoc.sheet.submitted",
      "vinidoc.sheet.validated",
      "vinidoc.sheet.rejected",
      "vinidoc.sheet.updated",
      "vinidoc.sheet.deleted",
    ],
    onSheetEvent,
  );
  useRealtimeEvent(
    [
      "vinidoc.template.created",
      "vinidoc.template.updated",
      "vinidoc.template.deleted",
    ],
    onTemplateEvent,
  );

  const value = useMemo<VinidocContextValue>(
    () => ({
      loading,
      error,
      rights,
      languages,
      defaultLng,
      colors,
      mergeFields,
      pendingCount,
      reload,
      reloadMergeFields,
      reloadPendingCount,
    }),
    [loading, error, rights, languages, defaultLng, colors, mergeFields, pendingCount, reload, reloadMergeFields, reloadPendingCount],
  );

  return <VinidocContext.Provider value={value}>{children}</VinidocContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useVinidoc(): VinidocContextValue {
  const ctx = useContext(VinidocContext);
  if (!ctx) throw new Error("useVinidoc doit être utilisé dans un <VinidocProvider>");
  return ctx;
}
