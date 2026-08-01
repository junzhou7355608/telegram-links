BEGIN;

UPDATE "SyncJob"
SET "stage" = 'EXTRACTING'
WHERE "stage" = 'CLASSIFYING';

CREATE TYPE "SyncStage_new" AS ENUM (
  'CONNECTING',
  'READING',
  'EXTRACTING',
  'DEDUPLICATING',
  'SAVING'
);

ALTER TABLE "SyncJob"
ALTER COLUMN "stage" TYPE "SyncStage_new"
USING ("stage"::text::"SyncStage_new");

DROP TYPE "SyncStage";
ALTER TYPE "SyncStage_new" RENAME TO "SyncStage";

DROP TABLE "AiAnalysis";
DROP TABLE "AiSettings";

ALTER TABLE "Link" DROP CONSTRAINT "Link_projectId_fkey";
DROP INDEX "Link_environment_idx";
DROP INDEX "Link_projectId_idx";

ALTER TABLE "Link"
DROP COLUMN "environment",
DROP COLUMN "projectId";

ALTER TABLE "SyncJob"
DROP COLUMN "defaultProjectId",
DROP COLUMN "aiProvider",
DROP COLUMN "aiModel",
DROP COLUMN "promptTokens",
DROP COLUMN "completionTokens",
DROP COLUMN "totalTokens";

ALTER TABLE "SyncJobChat"
DROP COLUMN "aiProvider",
DROP COLUMN "aiModel",
DROP COLUMN "promptTokens",
DROP COLUMN "completionTokens",
DROP COLUMN "totalTokens";

DROP TABLE "Project";
DROP TYPE "LinkEnvironment";
DROP TYPE "AiProvider";

COMMIT;
