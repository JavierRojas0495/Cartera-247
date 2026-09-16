-- AlterTable
ALTER TABLE "loans" ADD COLUMN "code" TEXT NOT NULL DEFAULT '';

-- Backfill unique codes for existing loans
UPDATE "loans"
SET "code" = 'CR-' || upper(substr(replace(id, '-', ''), 1, 8))
WHERE "code" = '';

-- CreateIndex
CREATE UNIQUE INDEX "loans_tenant_id_code_key" ON "loans"("tenant_id", "code");
