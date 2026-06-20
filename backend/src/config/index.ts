import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const nativeRuntime = process.env.NEXXCLOUD_NATIVE_RUNTIME === "true";
const weakValues = new Set([
  "",
  "default-secret-change-me",
  "default-refresh-secret-change-me",
  "your-super-secret-jwt-key-change-in-production",
  "your-super-secret-refresh-key-change-in-production",
  "changeme",
]);

const requireProductionSecret = (name: string, value: string): string => {
  if (isProduction && (weakValues.has(value) || value.length < 32)) {
    throw new Error(`${name} must be set to a strong value in production`);
  }
  return value;
};

const databaseUrl = process.env.DATABASE_URL || "";
if (isProduction && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production");
}
if (isProduction && !nativeRuntime) {
  requireProductionSecret("DB_PASSWORD", process.env.DB_PASSWORD || "");
}

if (isProduction && !process.env.MEDIA_TOKEN_SECRET) {
  throw new Error("MEDIA_TOKEN_SECRET is required in production");
}

const parsePositiveInteger = (name: string, value: string | undefined, fallback: string): number => {
  const parsed = Number.parseInt(value || fallback, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const maxFileSize = parsePositiveInteger("MAX_FILE_SIZE", process.env.MAX_FILE_SIZE, "10995116277760");
const uploadChunkSize = parsePositiveInteger("UPLOAD_CHUNK_SIZE", process.env.UPLOAD_CHUNK_SIZE, "67108864");
const maxUploadChunkSize = parsePositiveInteger(
  "MAX_UPLOAD_CHUNK_SIZE",
  process.env.MAX_UPLOAD_CHUNK_SIZE,
  "268435456"
);
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const trustProxy = process.env.TRUST_PROXY?.trim() || "";

if (maxUploadChunkSize < uploadChunkSize) {
  throw new Error("MAX_UPLOAD_CHUNK_SIZE must be greater than or equal to UPLOAD_CHUNK_SIZE");
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  nativeRuntime,
  jwtSecret: requireProductionSecret("JWT_SECRET", process.env.JWT_SECRET || "default-secret-change-me"),
  jwtRefreshSecret: requireProductionSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-me"),
  mediaTokenSecret: requireProductionSecret(
    "MEDIA_TOKEN_SECRET",
    process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET || "default-secret-change-me"
  ),
  jwtExpiration: process.env.JWT_EXPIRATION || "15m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  storageRoot: process.env.STORAGE_ROOT || "/app/data/storage",
  maxFileSize,
  uploadChunkSize,
  maxUploadChunkSize,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins,
  trustProxy,

  // Phase 3: Production config
  trashRetentionDays: parseInt(process.env.TRASH_RETENTION_DAYS || "30", 10),
  maxVersionsPerFile: parseInt(process.env.MAX_VERSIONS_PER_FILE || "10", 10),
  defaultStorageQuota: BigInt(process.env.DEFAULT_STORAGE_QUOTA || "10995116277760"),
  chunkUploadConcurrency: parseInt(process.env.CHUNK_UPLOAD_CONCURRENCY || "3", 10),
  maxFilesPerUser: parseInt(process.env.MAX_FILES_PER_USER || "100000", 10),
  maxUploadsPerMinute: parseInt(process.env.MAX_UPLOADS_PER_MINUTE || "300", 10),
  bullBoardUsername: process.env.BULL_BOARD_USERNAME || "admin",
  bullBoardPassword: requireProductionSecret("BULL_BOARD_PASSWORD", process.env.BULL_BOARD_PASSWORD || "changeme"),
};
