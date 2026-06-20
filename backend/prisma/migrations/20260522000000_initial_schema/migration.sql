-- Baseline schema for fresh installs and databases previously initialized with `prisma db push`.
-- Idempotent ALTER/CREATE operations allow production startup to move safely to migrations.

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar" TEXT,
    "storage_quota" BIGINT NOT NULL DEFAULT 10737418240,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "trash_size" BIGINT NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'unknown',
    "thumbnail" TEXT,
    "thumbnail_small" TEXT,
    "thumbnail_medium" TEXT,
    "thumbnail_large" TEXT,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "ref_count" INTEGER NOT NULL DEFAULT 1,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "file_versions" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "stored_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shares" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "password_hash" TEXT,
    "expires_at" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "max_views" INTEGER,
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "upload_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "total_size" BIGINT NOT NULL,
    "chunk_size" INTEGER NOT NULL DEFAULT 5242880,
    "total_chunks" INTEGER NOT NULL,
    "uploaded_chunks" INTEGER NOT NULL DEFAULT 0,
    "folder_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hash" TEXT,
    "file_id" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "upload_chunks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "uploaded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "upload_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT,
    "folder_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "inherited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT,
    "folder_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sync_preparations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "cursor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_preparations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "extension" TEXT NOT NULL DEFAULT '';
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "is_starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "file_versions" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "max_views" INTEGER;
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "allow_download" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shares" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "upload_sessions" ADD COLUMN IF NOT EXISTS "file_id" TEXT;
ALTER TABLE "upload_sessions" ADD COLUMN IF NOT EXISTS "progress" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "folders" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "files" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "shares" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "upload_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "permissions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "sync_preparations" ALTER COLUMN "updated_at" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_idx" ON "refresh_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "folders_user_id_parent_id_name_key" ON "folders"("user_id", "parent_id", "name");
CREATE INDEX IF NOT EXISTS "folders_user_id_deleted_at_idx" ON "folders"("user_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "folders_user_id_parent_id_idx" ON "folders"("user_id", "parent_id");
CREATE INDEX IF NOT EXISTS "folders_path_idx" ON "folders"("path");
CREATE UNIQUE INDEX IF NOT EXISTS "files_stored_name_key" ON "files"("stored_name");
CREATE INDEX IF NOT EXISTS "files_user_id_deleted_at_idx" ON "files"("user_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "files_user_id_folder_id_deleted_at_idx" ON "files"("user_id", "folder_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "files_hash_idx" ON "files"("hash");
CREATE INDEX IF NOT EXISTS "files_user_id_hash_idx" ON "files"("user_id", "hash");
CREATE INDEX IF NOT EXISTS "files_user_id_original_name_idx" ON "files"("user_id", "original_name");
CREATE INDEX IF NOT EXISTS "files_user_id_category_idx" ON "files"("user_id", "category");
CREATE INDEX IF NOT EXISTS "files_user_id_created_at_idx" ON "files"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "files_user_id_size_idx" ON "files"("user_id", "size");
CREATE INDEX IF NOT EXISTS "files_user_id_is_favorite_deleted_at_idx" ON "files"("user_id", "is_favorite", "deleted_at");
CREATE INDEX IF NOT EXISTS "files_user_id_is_starred_deleted_at_idx" ON "files"("user_id", "is_starred", "deleted_at");
CREATE INDEX IF NOT EXISTS "files_user_id_extension_idx" ON "files"("user_id", "extension");
CREATE INDEX IF NOT EXISTS "files_user_id_mime_type_idx" ON "files"("user_id", "mime_type");
CREATE INDEX IF NOT EXISTS "files_category_size_idx" ON "files"("category", "size");
CREATE INDEX IF NOT EXISTS "files_hash_ref_count_idx" ON "files"("hash", "ref_count");
CREATE UNIQUE INDEX IF NOT EXISTS "file_versions_stored_name_key" ON "file_versions"("stored_name");
CREATE UNIQUE INDEX IF NOT EXISTS "file_versions_file_id_version_key" ON "file_versions"("file_id", "version");
CREATE INDEX IF NOT EXISTS "file_versions_file_id_version_idx" ON "file_versions"("file_id", "version");
CREATE INDEX IF NOT EXISTS "file_versions_file_id_created_at_idx" ON "file_versions"("file_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "shares_token_key" ON "shares"("token");
CREATE INDEX IF NOT EXISTS "shares_token_idx" ON "shares"("token");
CREATE INDEX IF NOT EXISTS "shares_user_id_idx" ON "shares"("user_id");
CREATE INDEX IF NOT EXISTS "shares_file_id_idx" ON "shares"("file_id");
CREATE INDEX IF NOT EXISTS "shares_expires_at_idx" ON "shares"("expires_at");
CREATE INDEX IF NOT EXISTS "upload_sessions_user_id_status_idx" ON "upload_sessions"("user_id", "status");
CREATE INDEX IF NOT EXISTS "upload_sessions_user_id_created_at_idx" ON "upload_sessions"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "upload_sessions_status_created_at_idx" ON "upload_sessions"("status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "upload_chunks_session_id_chunk_index_key" ON "upload_chunks"("session_id", "chunk_index");
CREATE INDEX IF NOT EXISTS "upload_chunks_session_id_uploaded_idx" ON "upload_chunks"("session_id", "uploaded");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_user_id_file_id_key" ON "permissions"("user_id", "file_id");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_user_id_folder_id_key" ON "permissions"("user_id", "folder_id");
CREATE INDEX IF NOT EXISTS "permissions_user_id_idx" ON "permissions"("user_id");
CREATE INDEX IF NOT EXISTS "permissions_file_id_idx" ON "permissions"("file_id");
CREATE INDEX IF NOT EXISTS "permissions_folder_id_idx" ON "permissions"("folder_id");
CREATE INDEX IF NOT EXISTS "permissions_user_id_role_idx" ON "permissions"("user_id", "role");
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_action_idx" ON "activity_logs"("user_id", "action");
CREATE INDEX IF NOT EXISTS "activity_logs_file_id_idx" ON "activity_logs"("file_id");
CREATE INDEX IF NOT EXISTS "activity_logs_folder_id_idx" ON "activity_logs"("folder_id");
CREATE INDEX IF NOT EXISTS "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at");
CREATE INDEX IF NOT EXISTS "event_logs_event_type_processed_idx" ON "event_logs"("event_type", "processed");
CREATE INDEX IF NOT EXISTS "event_logs_user_id_created_at_idx" ON "event_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "event_logs_processed_created_at_idx" ON "event_logs"("processed", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "sync_preparations_user_id_device_id_key" ON "sync_preparations"("user_id", "device_id");
CREATE INDEX IF NOT EXISTS "sync_preparations_user_id_last_sync_at_idx" ON "sync_preparations"("user_id", "last_sync_at");
CREATE INDEX IF NOT EXISTS "sync_preparations_status_idx" ON "sync_preparations"("status");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "notifications"("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_fkey') THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folders_user_id_fkey') THEN
    ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folders_parent_id_fkey') THEN
    ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_user_id_fkey') THEN
    ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_folder_id_fkey') THEN
    ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_fkey"
      FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_versions_file_id_fkey') THEN
    ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_fkey"
      FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shares_file_id_fkey') THEN
    ALTER TABLE "shares" ADD CONSTRAINT "shares_file_id_fkey"
      FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shares_user_id_fkey') THEN
    ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'upload_sessions_user_id_fkey') THEN
    ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'upload_chunks_session_id_fkey') THEN
    ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_user_id_fkey') THEN
    ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_file_id_fkey') THEN
    ALTER TABLE "permissions" ADD CONSTRAINT "permissions_file_id_fkey"
      FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_folder_id_fkey') THEN
    ALTER TABLE "permissions" ADD CONSTRAINT "permissions_folder_id_fkey"
      FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_user_id_fkey') THEN
    ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_file_id_fkey') THEN
    ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_file_id_fkey"
      FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_logs_user_id_fkey') THEN
    ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
