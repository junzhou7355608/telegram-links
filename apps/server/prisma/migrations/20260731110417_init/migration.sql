-- CreateEnum
CREATE TYPE "TelegramChatType" AS ENUM ('SAVED', 'PRIVATE', 'GROUP', 'CHANNEL');

-- CreateEnum
CREATE TYPE "LinkEnvironment" AS ENUM ('PRODUCTION', 'TEST', 'DEVELOPMENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ORGANIZED');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "SyncStage" AS ENUM ('CONNECTING', 'READING', 'EXTRACTING', 'DEDUPLICATING', 'SAVING');

-- CreateEnum
CREATE TYPE "SyncRangeMode" AS ENUM ('SINCE_LAST', 'LAST_7_DAYS', 'CUSTOM', 'ALL_HISTORY');

-- CreateEnum
CREATE TYPE "SyncJobChatStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "phoneNumber" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "sessionCiphertext" TEXT,
    "sessionIv" TEXT,
    "sessionAuthTag" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramChat" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "telegramPeerId" TEXT NOT NULL,
    "type" "TelegramChatType" NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedMessageId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "telegramMessageId" INTEGER NOT NULL,
    "senderTelegramId" TEXT,
    "senderName" TEXT,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "messageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "environment" "LinkEnvironment" NOT NULL DEFAULT 'UNKNOWN',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "projectId" UUID,
    "categoryId" UUID,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkTag" (
    "linkId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkTag_pkey" PRIMARY KEY ("linkId","tagId")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" UUID NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" "SyncStage",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "rangeMode" "SyncRangeMode" NOT NULL,
    "rangeFrom" TIMESTAMP(3),
    "rangeTo" TIMESTAMP(3),
    "defaultProjectId" UUID,
    "defaultCategoryId" UUID,
    "defaultTagIds" JSONB NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJobChat" (
    "id" UUID NOT NULL,
    "syncJobId" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "chatTitle" TEXT NOT NULL,
    "status" "SyncJobChatStatus" NOT NULL DEFAULT 'PENDING',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "maxProcessedMessageId" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJobChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkSource" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "syncJobId" UUID,
    "rawUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_telegramUserId_key" ON "TelegramAccount"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramChat_isEnabled_isAvailable_idx" ON "TelegramChat"("isEnabled", "isAvailable");

-- CreateIndex
CREATE INDEX "TelegramChat_type_idx" ON "TelegramChat"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramChat_accountId_telegramPeerId_key" ON "TelegramChat"("accountId", "telegramPeerId");

-- CreateIndex
CREATE INDEX "TelegramMessage_sentAt_idx" ON "TelegramMessage"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMessage_chatId_telegramMessageId_key" ON "TelegramMessage"("chatId", "telegramMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_normalizedName_key" ON "Project"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_normalizedName_key" ON "Category"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_normalizedName_key" ON "Tag"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Link_normalizedUrl_key" ON "Link"("normalizedUrl");

-- CreateIndex
CREATE INDEX "Link_archivedAt_createdAt_idx" ON "Link"("archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Link_status_idx" ON "Link"("status");

-- CreateIndex
CREATE INDEX "Link_environment_idx" ON "Link"("environment");

-- CreateIndex
CREATE INDEX "Link_projectId_idx" ON "Link"("projectId");

-- CreateIndex
CREATE INDEX "Link_categoryId_idx" ON "Link"("categoryId");

-- CreateIndex
CREATE INDEX "Link_domain_idx" ON "Link"("domain");

-- CreateIndex
CREATE INDEX "LinkTag_tagId_idx" ON "LinkTag"("tagId");

-- CreateIndex
CREATE INDEX "SyncJob_status_createdAt_idx" ON "SyncJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJobChat_chatId_idx" ON "SyncJobChat"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncJobChat_syncJobId_chatId_key" ON "SyncJobChat"("syncJobId", "chatId");

-- CreateIndex
CREATE INDEX "LinkSource_messageId_idx" ON "LinkSource"("messageId");

-- CreateIndex
CREATE INDEX "LinkSource_syncJobId_idx" ON "LinkSource"("syncJobId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkSource_linkId_messageId_key" ON "LinkSource"("linkId", "messageId");

-- AddForeignKey
ALTER TABLE "TelegramChat" ADD CONSTRAINT "TelegramChat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TelegramChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTag" ADD CONSTRAINT "LinkTag_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTag" ADD CONSTRAINT "LinkTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJobChat" ADD CONSTRAINT "SyncJobChat_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJobChat" ADD CONSTRAINT "SyncJobChat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TelegramChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSource" ADD CONSTRAINT "LinkSource_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSource" ADD CONSTRAINT "LinkSource_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TelegramMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkSource" ADD CONSTRAINT "LinkSource_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
