import "./lib/bigintPatch";
import express, { Request, Response, NextFunction } from "express";
import { Server } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { config } from "./config";
import { prisma } from "./db";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { storageService } from "./services/storageService";
import { dockerEngineService } from "./services/dockerEngineService";
import {
  metadataRepairQueue,
  referenceVerificationQueue,
  storageIntegrityQueue,
} from "./lib/queues";
import { allQueues } from "./lib/queues";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/authRoutes";
import fileRoutes from "./routes/fileRoutes";
import folderRoutes from "./routes/folderRoutes";
import shareRoutes from "./routes/shareRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import versionRoutes from "./routes/versionRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import appRoutes from "./routes/appRoutes";
import { FileService } from "./services/fileService";
import { wsServer } from "./websocket";
import { mdnsService } from "./services/mdnsService";
import networkRoutes from "./routes/networkRoutes";
import { getCacheClient } from "./lib/redis";
import { startAllWorkers, stopAllWorkers } from "./workers";
import { RuntimeWorker, closeNativeQueueRuntime } from "./lib/runtimeQueue";

const app = express();

if (config.trustProxy) {
  app.set("trust proxy", config.trustProxy);
}

// Custom Express JSON replacer to serialize BigInts safely
app.set("json replacer", (key: string, value: any) => {
  if (typeof value === "bigint") {
    const num = Number(value);
    return Number.isSafeInteger(num) ? num : value.toString();
  }
  return value;
});

// Async error wrapper - catches errors from async route handlers
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Dynamic CORS origin checker
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const normalizedOrigin = url.origin.replace(/\/$/, "");

    if (config.corsOrigins.includes(normalizedOrigin)) {
      return true;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    ) {
      return true;
    }

    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".lan")
    ) {
      return true;
    }

    if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return true;
    }
    if (hostname.startsWith("172.")) {
      const parts = hostname.split(".");
      if (parts.length === 4) {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) {
          return true;
        }
      }
    }

    if (config.frontendUrl) {
      const configuredUrl = new URL(config.frontendUrl);
      if (normalizedOrigin === configuredUrl.origin.replace(/\/$/, "")) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Compression
app.use(compression());

// Rate limiting - generous for self-hosted (chunked uploads need high throughput)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many authentication attempts" },
});
app.use("/api/auth/", authLimiter);

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests" },
});
app.use("/api/shares/public", shareLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(requestLogger);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    name: "NexxCloud",
    version: "1.0.0",
    timestamp: new Date().toISOString() 
  });
});

// API health check for server discovery
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    name: "NexxCloud",
    version: "1.0.0" 
  });
});

app.get("/health/ready", asyncHandler(async (_req: Request, res: Response) => {
  await prisma.$queryRaw`SELECT 1`;
  await getCacheClient().ping();
  const diskStats = await storageService.getDiskStats();

  res.json({
    status: "ready",
    name: "NexxCloud",
    dependencies: {
      database: "ok",
      queueTransport: config.nativeRuntime ? "in-process" : "redis",
      storage: diskStats.totalDisk > 0 ? "ok" : "unknown",
    },
  });
}));

// Bull Board - Queue monitoring dashboard
const bullBoardAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
    return res.status(401).json({ error: "Authentication required" });
  }

  const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString();
  const [username, password] = credentials.split(":");

  if (username !== config.bullBoardUsername || password !== config.bullBoardPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  next();
};

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

if (!config.nativeRuntime) {
  createBullBoard({
    queues: allQueues.map((queue) => new BullMQAdapter(queue as any)),
    serverAdapter,
  });

  app.use("/admin/queues", bullBoardAuth, serverAdapter.getRouter());
}

// Direct /files routes remain for authenticated API clients.
const fileService = new FileService(prisma);
const fileController = require("./controllers/fileController").FileController;
const fc = new fileController(fileService);

app.get("/files/:id/thumbnail", authenticate, asyncHandler(fc.getThumbnail.bind(fc)));
app.get("/files/:id/download", authenticate, asyncHandler(fc.download.bind(fc)));
app.get("/files/:id/stream", authenticate, asyncHandler(fc.stream.bind(fc)));

// Per-user rate limiters
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/apps", appRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

let server: Server | null = null;
let nativeWorkers: RuntimeWorker[] = [];

async function initializeAndListen(): Promise<void> {
  try {
    await storageService.initialize();
    await prisma.$queryRaw`SELECT 1`;
    await getCacheClient().ping();

    if (config.nativeRuntime) {
      nativeWorkers = startAllWorkers();
      console.log("Native runtime enabled: SQLite database and in-process workers active");
    }

    try {
      await Promise.all([
        storageIntegrityQueue.add("startup-scan", {}, { removeOnComplete: true, removeOnFail: 100 }),
        referenceVerificationQueue.add("startup-scan", {}, { removeOnComplete: true, removeOnFail: 100 }),
        metadataRepairQueue.add("startup-scan", {}, { removeOnComplete: true, removeOnFail: 100 }),
      ]);
      console.log("Startup integrity jobs queued");
    } catch (error) {
      console.warn("Startup integrity jobs could not be queued", error);
    }
    const diskStats = await storageService.getDiskStats();
    console.log(`Storage health check: OK`);
    console.log(`Available space: ${(diskStats.availableDisk / 1024 / 1024 / 1024).toFixed(2)} GB`);
  } catch (error) {
    console.error("Storage initialization failed:", error);
    throw error;
  }

  server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    wsServer.initialize(server!);
    mdnsService.start();
    if (config.nativeRuntime) {
      void dockerEngineService.getStatus()
        .then((status) => {
          if (status.available) {
            console.log("Docker Desktop is ready for NexxCloud apps");
          } else if (status.dockerCli) {
            console.log("Docker Desktop was requested; waiting for the daemon to become ready");
          }
        })
        .catch((error) => console.warn("Docker Desktop auto-start check failed", error));
    }
  });
}

void initializeAndListen().catch(async (error) => {
  console.error("Startup failed. NexxCloud will not accept traffic:", error);
  if (config.nativeRuntime) {
    await stopAllWorkers(nativeWorkers).catch(() => {});
    await closeNativeQueueRuntime().catch(() => {});
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  mdnsService.stop();
  wsServer.disconnect();
  if (!server) {
    if (config.nativeRuntime) {
      await stopAllWorkers(nativeWorkers).catch(() => {});
      await closeNativeQueueRuntime().catch(() => {});
    }
    await prisma.$disconnect();
    process.exit(0);
    return;
  }
  server.close(async () => {
    if (config.nativeRuntime) {
      await stopAllWorkers(nativeWorkers).catch(() => {});
      await closeNativeQueueRuntime().catch(() => {});
    }
    await prisma.$disconnect();
    console.log("Server closed and database disconnected");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Prevent unhandled rejections from crashing the process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

export default app;
