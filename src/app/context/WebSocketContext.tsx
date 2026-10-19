/**
 * WebSocketContext
 *
 * Provider qui :
 * 1. Instancie WebSocketService une seule fois pour toute l'app
 * 2. Se connecte automatiquement dès que l'utilisateur est authentifié
 * 3. Se déconnecte automatiquement à la déconnexion
 * 4. Expose le service et le statut courant via contexte React
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { WS_URL } from "../config";
import { WebSocketService, WsStatus } from "../api/websocket";
import { useAuthContext } from "@uvcdr/api-auth-system";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface WebSocketContextValue {
  /** Instance du service — utiliser le hook useWebSocket pour s'abonner */
  ws: WebSocketService;
  /** Statut courant de la connexion */
  status: WsStatus;
}

/* -------------------------------------------------------------------------- */
/*                                  CONTEXT                                   */
/* -------------------------------------------------------------------------- */

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*                                  PROVIDER                                  */
/* -------------------------------------------------------------------------- */

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, jwtPayload } = useAuthContext();

  // Instance unique du service, jamais recréée
  const serviceRef = useRef<WebSocketService>(new WebSocketService(WS_URL));
  const ws = serviceRef.current;

  const [status, setStatus] = useState<WsStatus>(ws.status);

  // Abonnement au statut
  useEffect(() => {
    return ws.onStatusChange(setStatus);
  }, [ws]);

  // Connexion / déconnexion selon l'état d'auth
  useEffect(() => {
    if (!isAuthenticated) {
      ws.disconnect();
      return;
    }

    const token = jwtPayload.$token ?? undefined;
    ws.connect(token);

    return () => {
      ws.disconnect();
    };
  }, [isAuthenticated, jwtPayload, ws]);

  const value = useMemo<WebSocketContextValue>(
    () => ({ ws, status }),
    [ws, status],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/* -------------------------------------------------------------------------- */
/*                               HOOK INTERNE                                 */
/* -------------------------------------------------------------------------- */

/** @internal — préférer useWebSocket() depuis shared/lib/hooks */
export const useWebSocketContext = (): WebSocketContextValue => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error(
      "useWebSocketContext doit être utilisé dans un <WebSocketProvider>",
    );
  }
  return ctx;
};
