import { createServer } from "node:http";
import type { Express } from "express";
import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/tokenUtils";

type WalletEventStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

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
  type: "DEPOSIT_SUCCESS" | "DEPOSIT_FAILED" | "SYSTEM";
  title: string;
  message: string;
  transactionId?: string | null;
  amount?: number | null;
  balance?: number | null;
  mpesaCode?: string | null;
  createdAt: string;
};

const USER_ROOM_PREFIX = "user:";

let ioInstance: Server | null = null;

function getFrontendOrigin() {
  return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

export function createHttpServerWithSockets(app: Express) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: getFrontendOrigin(),
      credentials: true,
    },
    transports: ["websocket"],
  });

  io.use((socket, next) => {
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

  ioInstance = io;
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
