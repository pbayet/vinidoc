/**
 * WebSocketService
 *
 * Client WebSocket bas niveau, instancié une seule fois par WebSocketProvider
 * (app/context/WebSocketContext.tsx) et exposé aux composants via le hook
 * useWebSocket (shared/lib/hooks/useWebSocket.ts).
 *
 * - Authentification par JWT en query param (`?token=...`), cf. wsManager.js
 *   côté serveur (`WebSocketServer({ server, path: "/ws" })` + `jwt.verify`).
 * - Reconnexion automatique avec backoff exponentiel en cas de coupure.
 * - Heartbeat ping/pong pour maintenir la connexion active : le serveur
 *   répond à un message `{ type: "ping" }` par `{ type: "pong" }`.
 * - Registre d'écouteurs par type de message, avec support du wildcard `"*"`
 *   pour tout capter (cf. debug log dans KanbanBoard.tsx).
 */

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type WsStatus = "connecting" | "open" | "closed" | "error";

export interface WsMessage<T = unknown> {
  type: string;
  payload?: T;
}

export type WsListener<T = unknown> = (msg: WsMessage<T>) => void;
type WsStatusListener = (status: WsStatus) => void;

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTES                                 */
/* -------------------------------------------------------------------------- */

const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;

/* -------------------------------------------------------------------------- */
/*                               WEBSOCKETSERVICE                             */
/* -------------------------------------------------------------------------- */

export class WebSocketService {
  private readonly url: string;
  private socket: WebSocket | null = null;
  private token?: string;

  private _status: WsStatus = "closed";
  private readonly statusListeners = new Set<WsStatusListener>();
  private readonly messageListeners = new Map<string, Set<WsListener>>();

  private shouldReconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /* ── API publique ────────────────────────────────────────────────────── */

  get status(): WsStatus {
    return this._status;
  }

  /** Ouvre la connexion (authentifiée si `token` est fourni). */
  connect(token?: string): void {
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.open();
  }

  /** Ferme la connexion et annule toute reconnexion programmée. */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.clearHeartbeat();

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }

    this.setStatus("closed");
  }

  /** S'abonne aux changements de statut. Retourne une fonction de désabonnement. */
  onStatusChange(listener: WsStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * S'abonne aux messages d'un `type` donné (ou `"*"` pour tout capter).
   * Retourne une fonction de désabonnement.
   */
  on<T = unknown>(type: string, listener: WsListener<T>): () => void {
    const set = this.messageListeners.get(type) ?? new Set<WsListener>();
    set.add(listener as WsListener);
    this.messageListeners.set(type, set);

    return () => {
      set.delete(listener as WsListener);
      if (set.size === 0) this.messageListeners.delete(type);
    };
  }

  /**
   * Envoie un message `{ type, payload }` au serveur.
   * Retourne `false` si la socket n'est pas ouverte (message non envoyé).
   */
  send<P = unknown>(type: string, payload?: P): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.socket.send(JSON.stringify({ type, payload }));
      return true;
    } catch {
      return false;
    }
  }

  /* ── Interne ──────────────────────────────────────────────────────────── */

  private open(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.setStatus("connecting");

    const wsUrl = this.token
      ? `${this.url}?token=${encodeURIComponent(this.token)}`
      : this.url;

    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("open");
      this.startHeartbeat();
    };

    socket.onclose = () => {
      this.clearHeartbeat();
      this.setStatus("closed");
      if (this.shouldReconnect) this.scheduleReconnect();
    };

    socket.onerror = () => {
      this.setStatus("error");
    };

    socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) this.open();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send("ping");
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(status: WsStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private handleMessage(raw: string): void {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "pong") return; // réponse au heartbeat, rien à propager

    this.messageListeners.get(msg.type)?.forEach((listener) => listener(msg));
    this.messageListeners.get("*")?.forEach((listener) => listener(msg));
  }
}
