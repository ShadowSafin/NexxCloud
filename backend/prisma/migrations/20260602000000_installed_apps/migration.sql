CREATE TABLE IF NOT EXISTS "installed_apps" (
    "id" TEXT NOT NULL,
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
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installed_apps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "installed_apps_compose_project_key" ON "installed_apps"("compose_project");
CREATE INDEX IF NOT EXISTS "installed_apps_user_id_status_idx" ON "installed_apps"("user_id", "status");
CREATE INDEX IF NOT EXISTS "installed_apps_slug_idx" ON "installed_apps"("slug");
CREATE INDEX IF NOT EXISTS "installed_apps_category_idx" ON "installed_apps"("category");

ALTER TABLE "installed_apps"
  ADD CONSTRAINT "installed_apps_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
