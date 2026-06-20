import { WebSocket, WebSocketServer as WSServer } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import { config } from "../config";
import { createRedisConnection } from "../lib/redis";
import { WSMessage, WSMessageType, WSClient, WSConnectionMeta } from "./types";

const WS_CHANNEL = "ws:broadcast";

export class AppWebSocketServer {
  private wss: WSServer | null = null;
  private connections: Map<string, Set<WSClient>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private isInitialized = false;

  initialize(server: Server): void {
    if (this.isInitialized) return;

    this.wss = new WSServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
      if (pathname !== "/ws") return;

      this.authenticate(request, (err, client) => {
        if (err || !client) {
          socket.destroy();
          return;
        }
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit("connection", ws, request);
        });
      });
    });

    this.wss.on("connection", (ws: WSClient, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on("error", (error) => {
      console.error("[WebSocket] Server error:", error.message);
    });

    if (!config.nativeRuntime) {
      this.setupRedis();
    }
    this.startHeartbeat();
    this.isInitialized = true;
  }

  private authenticate(
    request: any,
    callback: (err: Error | null, payload?: jwt.JwtPayload | string) => void
  ): void {
    try {
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      let token = url.searchParams.get("token");

      if (!token) {
        const protocols = request.headers["sec-websocket-protocol"] || "";
        const subprotocols = protocols.split(",").map((p: string) => p.trim());
        token = subprotocols.find((p: string) => p.startsWith("Bearer."))?.split(".")[1];
      }

      if (!token) {
        callback(new Error("No token provided"));
        return;
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      callback(null, decoded);
    } catch (error) {
      callback(error instanceof Error ? error : new Error("Authentication failed"));
    }
  }

  private handleConnection(ws: WSClient, req: any): void {
    try {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      let token = url.searchParams.get("token");

      if (!token) {
        const protocols = req.headers["sec-websocket-protocol"] || "";
        const subprotocols = protocols.split(",").map((p: string) => p.trim());
        token = subprotocols.find((p: string) => p.startsWith("Bearer."))?.split(".")[1];
      }

      if (!token) {
        ws.close(1008, "Authentication required");
        return;
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        username: string;
        email: string;
      };

      ws.userId = decoded.userId;
      ws.username = decoded.username;
      ws.email = decoded.email;
      ws.isAlive = true;

      if (!this.connections.has(decoded.userId)) {
        this.connections.set(decoded.userId, new Set());
        if (this.subClient) {
          const userChannel = `nexxcloud:ws:${decoded.userId}`;
          this.subClient.subscribe(userChannel).catch((err) => {
            console.error(`[WebSocket] Failed to subscribe to channel ${userChannel}:`, err.message);
          });
        }
      }
      this.connections.get(decoded.userId)!.add(ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (data) => {
        this.handleMessage(ws, data);
      });

      ws.on("close", () => {
        this.removeConnection(ws);
      });

      ws.on("error", (error) => {
        console.error(`[WebSocket] Client error (${decoded.userId}):`, error.message);
        this.removeConnection(ws);
      });

      this.send(ws, {
        type: "presence",
        payload: { status: "connected", userId: decoded.userId },
        timestamp: new Date().toISOString(),
      });

      this.broadcastPresence(decoded.userId, "online");
    } catch (error) {
      ws.close(1008, "Invalid token");
    }
  }

  private handleMessage(ws: WSClient, data: any): void {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;

      if (message.type === "ping") {
        this.send(ws, {
          type: "pong",
          payload: {},
          timestamp: new Date().toISOString(),
        });
        ws.lastActivity = new Date();
        return;
      }
    } catch {
      this.send(ws, {
        type: "error",
        payload: { message: "Invalid message format" },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private removeConnection(ws: WSClient): void {
    if (!ws.userId) return;

    const userConnections = this.connections.get(ws.userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.connections.delete(ws.userId);
        if (this.subClient) {
          const userChannel = `nexxcloud:ws:${ws.userId}`;
          this.subClient.unsubscribe(userChannel).catch((err) => {
            console.error(`[WebSocket] Failed to unsubscribe from channel ${userChannel}:`, err.message);
          });
        }
        this.broadcastPresence(ws.userId, "offline");
      }
    }
  }

  sendToUser(userId: string, message: WSMessage): void {
    const serialized = JSON.stringify(message);
    const userConnections = this.connections.get(userId);

    if (!userConnections) return;

    const deadConnections: WSClient[] = [];
    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      } else {
        deadConnections.push(ws);
      }
    });

    deadConnections.forEach((ws) => this.removeConnection(ws));
  }

  sendToUsers(userIds: string[], message: WSMessage): void {
    userIds.forEach((userId) => this.sendToUser(userId, message));
  }

  broadcast(message: WSMessage, excludeUserId?: string): void {
    const serialized = JSON.stringify(message);

    this.connections.forEach((conns, userId) => {
      if (userId === excludeUserId) return;

      conns.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(serialized);
        }
      });
    });
  }

  getUserIds(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0;
  }

  getTotalConnectionCount(): number {
    let count = 0;
    this.connections.forEach((conns) => (count += conns.size));
    return count;
  }

  isUserOnline(userId: string): boolean {
    return this.connections.has(userId);
  }

  private send(ws: WSClient, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((conns, userId) => {
        conns.forEach((ws) => {
          if (ws.isAlive === false) {
            ws.terminate();
            return;
          }
          ws.isAlive = false;
          ws.ping();
        });
      });
    }, 30000);
  }

  private async setupRedis(): Promise<void> {
    try {
      this.pubClient = createRedisConnection();
      this.subClient = createRedisConnection();

      await this.subClient.subscribe(WS_CHANNEL);
      await this.subClient.subscribe("nexxcloud:ws:broadcast");

      this.subClient.on("message", (channel, data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "__redis_sync__") return;

          if (channel === WS_CHANNEL || channel === "nexxcloud:ws:broadcast") {
            this.broadcast(parsed as WSMessage, parsed.excludeUserId);
          } else if (channel.startsWith("nexxcloud:ws:")) {
            const userId = channel.substring("nexxcloud:ws:".length);
            let wsMessage: WSMessage;
            if (parsed.type && parsed.payload && parsed.timestamp) {
              wsMessage = parsed as WSMessage;
            } else {
              wsMessage = {
                type: "sync_event",
                payload: {
                  eventType: parsed.type,
                  ...(parsed.data || parsed.payload || {})
                },
                timestamp: parsed.timestamp || new Date().toISOString()
              };
            }
            this.sendToUser(userId, wsMessage);
          }
        } catch {}
      });
    } catch (error) {
      console.error("[WebSocket] Redis setup failed:", error);
    }
  }

  publishToCluster(message: WSMessage, excludeUserId?: string): void {
    if (!this.pubClient) return;

    const payload = { ...message, excludeUserId };
    this.pubClient.publish(WS_CHANNEL, JSON.stringify(payload)).catch(() => {});
  }

  private broadcastPresence(userId: string, status: "online" | "offline"): void {
    this.broadcast({
      type: "presence",
      payload: { userId, status },
      timestamp: new Date().toISOString(),
    });
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.connections.forEach((conns) => {
      conns.forEach((ws) => {
        ws.close(1001, "Server shutting down");
      });
    });
    this.connections.clear();

    this.pubClient?.quit().catch(() => {});
    this.subClient?.quit().catch(() => {});
    this.pubClient = null;
    this.subClient = null;

    this.wss?.close();
    this.wss = null;
    this.isInitialized = false;
  }
}
