ALTER TYPE "SyncStage" ADD VALUE 'CLASSIFYING';

CREATE TYPE "AiProvider" AS ENUM ('KIMI');

ALTER TABLE "SyncJob"
ADD COLUMN "aiProvider" "AiProvider",
ADD COLUMN "aiModel" TEXT,
ADD COLUMN "promptTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "completionTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalTokens" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SyncJobChat"
ADD COLUMN "promptTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "completionTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalTokens" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "AiProvider" NOT NULL DEFAULT 'KIMI',
    "apiKeyCiphertext" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "selectedModel" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiAnalysis" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "linkSourceId" UUID NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "resultTitle" TEXT NOT NULL,
    "resultPurpose" TEXT,
    "resultEnvironment" "LinkEnvironment" NOT NULL,
    "suggestedProjectName" TEXT,
    "suggestedCategoryName" TEXT,
    "suggestedTagNames" JSONB NOT NULL,
    "appliedResult" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiAnalysis_linkSourceId_key" ON "AiAnalysis"("linkSourceId");
CREATE INDEX "AiAnalysis_linkId_createdAt_idx" ON "AiAnalysis"("linkId", "createdAt");

ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAnalysis" ADD CONSTRAINT "AiAnalysis_linkSourceId_fkey"
FOREIGN KEY ("linkSourceId") REFERENCES "LinkSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
