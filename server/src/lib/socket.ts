import { createServer } from "node:http";
import type { Express } from "express";
import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/tokenUtils";
import { isAllowedOrigin, resolveAllowedOriginsFromEnv } from "../config/cors";

type WalletEventStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";

export type WalletRealtimeEvent = {
  transactionId: string;
  checkoutRequestId?: string | null;
  merchantRequestId?: string | null;
  mpesaCode?: string | null;
  status: WalletEventStatus;
  message: string;
  balance: number;
  amount: number;
};

export type NotificationRealtimeEvent = {
  notificationId?: string;
  audience: "USER" | "ADMIN";
  type:
    | "DEPOSIT_SUCCESS"
    | "DEPOSIT_FAILED"
    | "WITHDRAWAL_SUCCESS"
    | "WITHDRAWAL_FAILED"
    | "BET_WON"
    | "BET_LOST"
    | "BET_VOID"
    | "EVENT_ENDED"
    | "SYSTEM";
  title: string;
  message: string;
  transactionId?: string | null;
  amount?: number | null;
  balance?: number | null;
  paystackReference?: string | null;
  createdAt: string;
};

export type BetRealtimeEvent = {
  betId: string;
  betCode: string;
  status: "open" | "won" | "lost" | "cancelled" | "bonus";
  placedAt: string;
  updatedAt: string;
  possiblePayout: number;
};

const USER_ROOM_PREFIX = "user:";
const LIVE_NAMESPACE = "/ws/live";

let ioInstance: Server | null = null;
let liveNamespaceInstance: ReturnType<Server["of"]> | null = null;

function isOriginAllowed(originHeader: unknown) {
  if (typeof originHeader !== "string" || !originHeader.trim()) {
    return false;
  }

  return isAllowedOrigin(originHeader);
}

function isSocketCorsOriginAllowed(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  return isOriginAllowed(origin);
}

export function createHttpServerWithSockets(app: Express) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isSocketCorsOriginAllowed(origin)) {
          callback(null, true);
          return;
        }

        console.warn("[Socket.IO] Rejected CORS origin", {
          origin,
          allowedOrigins: resolveAllowedOriginsFromEnv(),
        });
        callback(new Error("Not allowed by Socket.IO CORS"));
      },
      credentials: true,
    },
    transports: ["websocket"],
  });

  io.use((socket, next) => {
    if (socket.nsp.name === LIVE_NAMESPACE) {
      next();
      return;
    }

    const authToken = socket.handshake.auth?.token;
    const token = typeof authToken === "string" ? authToken : null;

    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`${USER_ROOM_PREFIX}${userId}`);
  });

  const liveNamespace = io.of(LIVE_NAMESPACE);
  liveNamespace.use((socket, next) => {
    const origin = socket.handshake.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      console.warn("[Socket.IO] Live namespace forbidden origin", {
        origin,
        namespace: LIVE_NAMESPACE,
      });
      next(new Error("Forbidden origin"));
      return;
    }

    next();
  });

  liveNamespace.on("connection", (socket) => {
    socket.join("live:matches");

    socket.on("live:subscribe", (payload: unknown) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("channel" in payload) ||
        typeof (payload as { channel?: unknown }).channel !== "string"
      ) {
        return;
      }

      const channel = (payload as { channel: string }).channel.trim();
      if (!channel.startsWith("live:")) {
        return;
      }

      socket.join(channel);
    });

    socket.on("live:unsubscribe", (payload: unknown) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("channel" in payload) ||
        typeof (payload as { channel?: unknown }).channel !== "string"
      ) {
        return;
      }

      const channel = (payload as { channel: string }).channel.trim();
      if (!channel.startsWith("live:")) {
        return;
      }

      socket.leave(channel);
    });
  });

  ioInstance = io;
  liveNamespaceInstance = liveNamespace;
  return httpServer;
}

export function emitWalletUpdate(userId: string, event: WalletRealtimeEvent) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`${USER_ROOM_PREFIX}${userId}`).emit("wallet:update", event);
}

export function emitNotificationUpdate(
  userId: string,
  event: NotificationRealtimeEvent,
) {
  if (!ioInstance) {
    return;
  }

  ioInstance
    .to(`${USER_ROOM_PREFIX}${userId}`)
    .emit("notification:update", event);
}

export function emitBetUpdate(userId: string, event: BetRealtimeEvent) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`${USER_ROOM_PREFIX}${userId}`).emit("bets:update", event);
  ioInstance
    .to(`${USER_ROOM_PREFIX}${userId}`)
    .emit(`user:${userId}:bets`, event);
}

export function emitLiveMatches(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.to("live:matches").emit("live:matches", payload);
}

export function emitLiveOddsUpdate(matchId: string, payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance
    .to(`live:odds:${matchId}`)
    .emit("live:odds:update", payload);
}

export function emitLiveScoreUpdate(matchId: string, payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance
    .to(`live:score:${matchId}`)
    .emit("live:score:update", payload);
}

export function emitLiveMatchStatus(matchId: string, payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance
    .to(`live:score:${matchId}`)
    .emit("live:match:status", payload);
}

export function emitLiveMatchAdded(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("live:match:added", payload);
}

export function emitLiveMatchRemoved(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("live:match:removed", payload);
}

// ── Custom Events Real-Time ──

export function emitCustomEventPublished(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("custom_event:published", payload);
}

export function emitCustomEventLive(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("custom_event:live", payload);
}

export function emitCustomEventFinished(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("custom_event:finished", payload);
}

export function emitCustomEventSuspended(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("custom_event:suspended", payload);
}

export function emitCustomEventOddsUpdated(payload: unknown) {
  if (!liveNamespaceInstance) {
    return;
  }

  liveNamespaceInstance.emit("custom_event:odds_updated", payload);
}
