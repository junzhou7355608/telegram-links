BEGIN;

ALTER TABLE "LinkSource" ADD COLUMN "normalizedUrl" TEXT;

UPDATE "LinkSource" AS source
SET "normalizedUrl" = link."normalizedUrl"
FROM "Link" AS link
WHERE link.id = source."linkId";

ALTER TABLE "LinkSource" ALTER COLUMN "normalizedUrl" SET NOT NULL;

DROP INDEX "Link_normalizedUrl_key";
DROP INDEX "Link_domain_idx";
DROP INDEX "LinkSource_linkId_messageId_key";

UPDATE "Link" SET domain = LOWER(domain);

CREATE TEMP TABLE "_LinkDomainMigrationCounts" ON COMMIT DROP AS
SELECT
  (SELECT COUNT(*) FROM "LinkSource") AS "sourceCount",
  (SELECT COUNT(*) FROM "AiAnalysis") AS "analysisCount",
  (SELECT COUNT(DISTINCT domain) FROM "Link") AS "domainCount";

CREATE TEMP TABLE "_LinkDomainTags" ON COMMIT DROP AS
SELECT DISTINCT link.domain, tag."tagId"
FROM "Link" AS link
JOIN "LinkTag" AS tag ON tag."linkId" = link.id;

CREATE TEMP TABLE "_LinkDomainPlan" ON COMMIT DROP AS
SELECT
  domain,
  (ARRAY_AGG(id ORDER BY "firstDiscoveredAt", "createdAt", id))[1] AS "survivorId",
  MIN("firstDiscoveredAt") AS "firstDiscoveredAt",
  MIN("createdAt") AS "createdAt",
  MAX("updatedAt") AS "updatedAt",
  CASE
    WHEN BOOL_OR("archivedAt" IS NULL) THEN NULL
    ELSE MAX("archivedAt")
  END AS "archivedAt",
  CASE
    WHEN BOOL_OR(status = 'ORGANIZED') THEN 'ORGANIZED'::"OrganizationStatus"
    ELSE 'PENDING'::"OrganizationStatus"
  END AS status,
  COALESCE(
    (ARRAY_AGG(title ORDER BY (status = 'ORGANIZED') DESC, "updatedAt" DESC, id)
      FILTER (WHERE BTRIM(title) <> '' AND title <> domain))[1],
    domain
  ) AS title,
  (ARRAY_AGG(purpose ORDER BY (status = 'ORGANIZED') DESC, "updatedAt" DESC, id)
    FILTER (WHERE purpose IS NOT NULL AND BTRIM(purpose) <> ''))[1] AS purpose,
  (ARRAY_AGG("projectId" ORDER BY (status = 'ORGANIZED') DESC, "updatedAt" DESC, id)
    FILTER (WHERE "projectId" IS NOT NULL))[1] AS "projectId",
  (ARRAY_AGG("categoryId" ORDER BY (status = 'ORGANIZED') DESC, "updatedAt" DESC, id)
    FILTER (WHERE "categoryId" IS NOT NULL))[1] AS "categoryId",
  COALESCE(
    (ARRAY_AGG(environment ORDER BY (status = 'ORGANIZED') DESC, "updatedAt" DESC, id)
      FILTER (WHERE environment <> 'UNKNOWN'))[1],
    'UNKNOWN'::"LinkEnvironment"
  ) AS environment
FROM "Link"
GROUP BY domain;

CREATE TEMP TABLE "_LinkDomainMap" ON COMMIT DROP AS
SELECT link.id AS "linkId", plan."survivorId"
FROM "Link" AS link
JOIN "_LinkDomainPlan" AS plan USING (domain);

CREATE TEMP TABLE "_LinkDomainLatestUrl" ON COMMIT DROP AS
SELECT DISTINCT ON (link.domain)
  link.domain,
  source."normalizedUrl"
FROM "Link" AS link
JOIN "LinkSource" AS source ON source."linkId" = link.id
JOIN "TelegramMessage" AS message ON message.id = source."messageId"
ORDER BY
  link.domain,
  message."sentAt" DESC,
  source."createdAt" DESC,
  source.id DESC;

INSERT INTO "LinkTag" ("linkId", "tagId", "createdAt")
SELECT plan."survivorId", tag."tagId", CURRENT_TIMESTAMP
FROM "_LinkDomainTags" AS tag
JOIN "_LinkDomainPlan" AS plan USING (domain)
ON CONFLICT ("linkId", "tagId") DO NOTHING;

UPDATE "LinkSource" AS source
SET "linkId" = mapping."survivorId"
FROM "_LinkDomainMap" AS mapping
WHERE source."linkId" = mapping."linkId";

UPDATE "AiAnalysis" AS analysis
SET "linkId" = mapping."survivorId"
FROM "_LinkDomainMap" AS mapping
WHERE analysis."linkId" = mapping."linkId";

UPDATE "Link" AS link
SET
  "firstDiscoveredAt" = plan."firstDiscoveredAt",
  "createdAt" = plan."createdAt",
  "updatedAt" = plan."updatedAt",
  "archivedAt" = plan."archivedAt",
  status = plan.status,
  title = plan.title,
  purpose = plan.purpose,
  "projectId" = plan."projectId",
  "categoryId" = plan."categoryId",
  environment = plan.environment,
  url = COALESCE(latest."normalizedUrl", link.url),
  "normalizedUrl" = COALESCE(latest."normalizedUrl", link."normalizedUrl")
FROM "_LinkDomainPlan" AS plan
LEFT JOIN "_LinkDomainLatestUrl" AS latest USING (domain)
WHERE link.id = plan."survivorId";

DELETE FROM "Link" AS link
USING "_LinkDomainMap" AS mapping
WHERE
  link.id = mapping."linkId"
  AND mapping."linkId" <> mapping."survivorId";

CREATE UNIQUE INDEX "Link_domain_key" ON "Link"(domain);
CREATE UNIQUE INDEX "LinkSource_linkId_messageId_normalizedUrl_key"
ON "LinkSource"("linkId", "messageId", "normalizedUrl");

DO $$
DECLARE
  expected RECORD;
BEGIN
  SELECT * INTO expected FROM "_LinkDomainMigrationCounts";

  IF (SELECT COUNT(*) FROM "Link") <> expected."domainCount" THEN
    RAISE EXCEPTION 'Link domain merge lost or retained unexpected rows';
  END IF;

  IF (SELECT COUNT(*) FROM "LinkSource") <> expected."sourceCount" THEN
    RAISE EXCEPTION 'Link domain merge lost URL sources';
  END IF;

  IF (SELECT COUNT(*) FROM "AiAnalysis") <> expected."analysisCount" THEN
    RAISE EXCEPTION 'Link domain merge lost AI analyses';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_LinkDomainTags" AS expected_tag
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Link" AS link
      JOIN "LinkTag" AS tag ON tag."linkId" = link.id
      WHERE
        link.domain = expected_tag.domain
        AND tag."tagId" = expected_tag."tagId"
    )
  ) THEN
    RAISE EXCEPTION 'Link domain merge lost tags';
  END IF;
END $$;

COMMIT;
