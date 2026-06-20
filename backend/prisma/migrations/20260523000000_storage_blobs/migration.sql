CREATE TABLE IF NOT EXISTS "storage_blobs" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "physical_path" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "reference_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_blobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storage_blobs_hash_key" ON "storage_blobs"("hash");
CREATE UNIQUE INDEX IF NOT EXISTS "storage_blobs_physical_path_key" ON "storage_blobs"("physical_path");
CREATE INDEX IF NOT EXISTS "storage_blobs_hash_idx" ON "storage_blobs"("hash");
CREATE INDEX IF NOT EXISTS "storage_blobs_reference_count_idx" ON "storage_blobs"("reference_count");
ALTER TABLE "storage_blobs" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "blob_id" TEXT;
ALTER TABLE "file_versions" ADD COLUMN IF NOT EXISTS "blob_id" TEXT;

CREATE INDEX IF NOT EXISTS "files_blob_id_idx" ON "files"("blob_id");
CREATE INDEX IF NOT EXISTS "file_versions_blob_id_idx" ON "file_versions"("blob_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'files_blob_id_fkey'
  ) THEN
    ALTER TABLE "files" ADD CONSTRAINT "files_blob_id_fkey"
      FOREIGN KEY ("blob_id") REFERENCES "storage_blobs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'file_versions_blob_id_fkey'
  ) THEN
    ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_blob_id_fkey"
      FOREIGN KEY ("blob_id") REFERENCES "storage_blobs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
