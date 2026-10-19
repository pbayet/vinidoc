/**
 * useWebSocket
 *
 * Hook principal pour consommer le WebSocket dans n'importe quel composant.
 *
 * @example — Abonnement à un type de message
 * ```tsx
 * useWebSocket("wine.updated", (msg) => {
 *   console.log(msg.payload); // payload typé
 * });
 * ```
 *
 * @example — Accéder au statut et envoyer un message
 * ```tsx
 * const { status, send } = useWebSocket();
 * send("ping", { timestamp: Date.now() });
 * ```
 */
import { useEffect } from "react";
import { useWebSocketContext } from "../../../app/context/WebSocketContext";
import { WsListener, WsMessage, WsStatus } from "../../../app/api/websocket";

// ─── Surcharge 1 : abonnement à un type de message ──────────────────────────
function useWebSocket<T = unknown>(
  type: string,
  listener: WsListener<T>,
): {
  status: WsStatus;
  send: <P = unknown>(type: string, payload?: P) => boolean;
};

// ─── Surcharge 2 : accès au service sans abonnement ─────────────────────────
function useWebSocket(): {
  status: WsStatus;
  send: <P = unknown>(type: string, payload?: P) => boolean;
};

// ─── Implémentation ──────────────────────────────────────────────────────────
function useWebSocket<T = unknown>(
  type?: string,
  listener?: WsListener<T>,
): {
  status: WsStatus;
  send: <P = unknown>(type: string, payload?: P) => boolean;
} {
  const { ws, status } = useWebSocketContext();

  useEffect(() => {
    if (!type || !listener) return;
    return ws.on<T>(type, listener);
  }, [ws, type, listener]);

  return {
    status,
    send: <P = unknown>(msgType: string, payload?: P) =>
      ws.send<P>(msgType, payload),
  };
}

export { useWebSocket };
export type { WsMessage, WsStatus };
