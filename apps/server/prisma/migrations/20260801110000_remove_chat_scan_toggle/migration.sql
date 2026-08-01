DROP INDEX "TelegramChat_isEnabled_isAvailable_idx";

ALTER TABLE "TelegramChat" DROP COLUMN "isEnabled";

CREATE INDEX "TelegramChat_isAvailable_title_idx" ON "TelegramChat"("isAvailable", "title");
