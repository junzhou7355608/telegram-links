ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER;

WITH ranked_categories AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY "name" ASC, "id" ASC) - 1)::INTEGER AS "position"
  FROM "Category"
)
UPDATE "Category" AS category
SET "sortOrder" = ranked_categories."position"
FROM ranked_categories
WHERE category."id" = ranked_categories."id";

ALTER TABLE "Category" ALTER COLUMN "sortOrder" SET NOT NULL;
CREATE INDEX "Category_sortOrder_name_idx" ON "Category"("sortOrder", "name");

ALTER TABLE "Tag" ADD COLUMN "sortOrder" INTEGER;

WITH ranked_tags AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY "name" ASC, "id" ASC) - 1)::INTEGER AS "position"
  FROM "Tag"
)
UPDATE "Tag" AS tag
SET "sortOrder" = ranked_tags."position"
FROM ranked_tags
WHERE tag."id" = ranked_tags."id";

ALTER TABLE "Tag" ALTER COLUMN "sortOrder" SET NOT NULL;
CREATE INDEX "Tag_sortOrder_name_idx" ON "Tag"("sortOrder", "name");
