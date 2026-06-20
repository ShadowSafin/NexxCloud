BEGIN TRANSACTION;
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar" TEXT,
    "storage_quota" BIGINT NOT NULL DEFAULT 10737418240,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "trash_size" BIGINT NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "installed_apps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'docker-hub',
    "status" TEXT NOT NULL DEFAULT 'installing',
    "compose_project" TEXT NOT NULL,
    "compose_path" TEXT NOT NULL,
    "workspace_path" TEXT NOT NULL,
    "app_url" TEXT,
    "image" TEXT,
    "version" TEXT,
    "ports" TEXT NOT NULL DEFAULT '[]',
    "mounts" TEXT NOT NULL DEFAULT '[]',
    "env" TEXT NOT NULL DEFAULT '{}',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "last_error" TEXT,
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "installed_apps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "storage_blobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "physical_path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "reference_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "blob_id" TEXT,
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
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_blob_id_fkey" FOREIGN KEY ("blob_id") REFERENCES "storage_blobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_id" TEXT NOT NULL,
    "blob_id" TEXT,
    "version" INTEGER NOT NULL,
    "stored_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "file_versions_blob_id_fkey" FOREIGN KEY ("blob_id") REFERENCES "storage_blobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "password_hash" TEXT,
    "expires_at" DATETIME,
    "views" INTEGER NOT NULL DEFAULT 0,
    "max_views" INTEGER,
    "allow_download" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shares_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "progress" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "upload_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "hash" TEXT,
    "uploaded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "upload_chunks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "upload_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT,
    "folder_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "inherited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "permissions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "permissions_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "file_id" TEXT,
    "folder_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activity_logs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_preparations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_sync_at" DATETIME NOT NULL,
    "cursor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "installed_apps_compose_project_key" ON "installed_apps"("compose_project");

-- CreateIndex
CREATE INDEX "installed_apps_user_id_status_idx" ON "installed_apps"("user_id", "status");

-- CreateIndex
CREATE INDEX "installed_apps_slug_idx" ON "installed_apps"("slug");

-- CreateIndex
CREATE INDEX "installed_apps_category_idx" ON "installed_apps"("category");

-- CreateIndex
CREATE UNIQUE INDEX "storage_blobs_hash_key" ON "storage_blobs"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "storage_blobs_physical_path_key" ON "storage_blobs"("physical_path");

-- CreateIndex
CREATE INDEX "storage_blobs_hash_idx" ON "storage_blobs"("hash");

-- CreateIndex
CREATE INDEX "storage_blobs_reference_count_idx" ON "storage_blobs"("reference_count");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "folders_user_id_deleted_at_idx" ON "folders"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "folders_user_id_parent_id_idx" ON "folders"("user_id", "parent_id");

-- CreateIndex
CREATE INDEX "folders_path_idx" ON "folders"("path");

-- CreateIndex
CREATE UNIQUE INDEX "folders_user_id_parent_id_name_key" ON "folders"("user_id", "parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "files_stored_name_key" ON "files"("stored_name");

-- CreateIndex
CREATE INDEX "files_user_id_deleted_at_idx" ON "files"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "files_user_id_folder_id_deleted_at_idx" ON "files"("user_id", "folder_id", "deleted_at");

-- CreateIndex
CREATE INDEX "files_blob_id_idx" ON "files"("blob_id");

-- CreateIndex
CREATE INDEX "files_hash_idx" ON "files"("hash");

-- CreateIndex
CREATE INDEX "files_user_id_hash_idx" ON "files"("user_id", "hash");

-- CreateIndex
CREATE INDEX "files_user_id_original_name_idx" ON "files"("user_id", "original_name");

-- CreateIndex
CREATE INDEX "files_user_id_category_idx" ON "files"("user_id", "category");

-- CreateIndex
CREATE INDEX "files_user_id_created_at_idx" ON "files"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "files_user_id_size_idx" ON "files"("user_id", "size");

-- CreateIndex
CREATE INDEX "files_user_id_is_favorite_deleted_at_idx" ON "files"("user_id", "is_favorite", "deleted_at");

-- CreateIndex
CREATE INDEX "files_user_id_is_starred_deleted_at_idx" ON "files"("user_id", "is_starred", "deleted_at");

-- CreateIndex
CREATE INDEX "files_user_id_extension_idx" ON "files"("user_id", "extension");

-- CreateIndex
CREATE INDEX "files_user_id_mime_type_idx" ON "files"("user_id", "mime_type");

-- CreateIndex
CREATE INDEX "files_category_size_idx" ON "files"("category", "size");

-- CreateIndex
CREATE INDEX "files_hash_ref_count_idx" ON "files"("hash", "ref_count");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_stored_name_key" ON "file_versions"("stored_name");

-- CreateIndex
CREATE INDEX "file_versions_file_id_version_idx" ON "file_versions"("file_id", "version");

-- CreateIndex
CREATE INDEX "file_versions_blob_id_idx" ON "file_versions"("blob_id");

-- CreateIndex
CREATE INDEX "file_versions_file_id_created_at_idx" ON "file_versions"("file_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_file_id_version_key" ON "file_versions"("file_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "shares_token_key" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_token_idx" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_user_id_idx" ON "shares"("user_id");

-- CreateIndex
CREATE INDEX "shares_file_id_idx" ON "shares"("file_id");

-- CreateIndex
CREATE INDEX "shares_expires_at_idx" ON "shares"("expires_at");

-- CreateIndex
CREATE INDEX "upload_sessions_user_id_status_idx" ON "upload_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "upload_sessions_user_id_created_at_idx" ON "upload_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "upload_sessions_status_created_at_idx" ON "upload_sessions"("status", "created_at");

-- CreateIndex
CREATE INDEX "upload_chunks_session_id_uploaded_idx" ON "upload_chunks"("session_id", "uploaded");

-- CreateIndex
CREATE UNIQUE INDEX "upload_chunks_session_id_chunk_index_key" ON "upload_chunks"("session_id", "chunk_index");

-- CreateIndex
CREATE INDEX "permissions_user_id_idx" ON "permissions"("user_id");

-- CreateIndex
CREATE INDEX "permissions_file_id_idx" ON "permissions"("file_id");

-- CreateIndex
CREATE INDEX "permissions_folder_id_idx" ON "permissions"("folder_id");

-- CreateIndex
CREATE INDEX "permissions_user_id_role_idx" ON "permissions"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_user_id_file_id_key" ON "permissions"("user_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_user_id_folder_id_key" ON "permissions"("user_id", "folder_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_action_idx" ON "activity_logs"("user_id", "action");

-- CreateIndex
CREATE INDEX "activity_logs_file_id_idx" ON "activity_logs"("file_id");

-- CreateIndex
CREATE INDEX "activity_logs_folder_id_idx" ON "activity_logs"("folder_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "event_logs_event_type_processed_idx" ON "event_logs"("event_type", "processed");

-- CreateIndex
CREATE INDEX "event_logs_user_id_created_at_idx" ON "event_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "event_logs_processed_created_at_idx" ON "event_logs"("processed", "created_at");

-- CreateIndex
CREATE INDEX "sync_preparations_user_id_last_sync_at_idx" ON "sync_preparations"("user_id", "last_sync_at");

-- CreateIndex
CREATE INDEX "sync_preparations_status_idx" ON "sync_preparations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_preparations_user_id_device_id_key" ON "sync_preparations"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
COMMIT;
