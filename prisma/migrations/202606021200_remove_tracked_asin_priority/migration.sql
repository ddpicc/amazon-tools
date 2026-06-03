-- DropIndex
DROP INDEX IF EXISTS "TrackedAsin_priority_idx";

-- AlterTable
ALTER TABLE "TrackedAsin"
DROP COLUMN IF EXISTS "priority";
