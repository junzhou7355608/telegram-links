import 'dotenv/config';
import console from 'node:console';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { URL } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const firstHanCharacter = /\p{Script=Han}/u;
const trailingUrlPunctuation = /[),.;!?，。；！？）】》]+$/u;

function normalizeHttpUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return {
      domain: url.hostname,
      normalizedUrl: url.toString(),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

function sanitizeTelegramHttpUrlCandidate(value) {
  const trimmed = value.trim();
  const firstHanMatch = firstHanCharacter.exec(trimmed);
  const beforeHan =
    firstHanMatch?.index === undefined
      ? trimmed
      : trimmed.slice(0, firstHanMatch.index);
  const sanitized = beforeHan.replace(trailingUrlPunctuation, '');
  const normalized = normalizeHttpUrl(sanitized);

  if (
    firstHanMatch &&
    normalized &&
    !normalized.domain.includes('.') &&
    !normalized.domain.includes(':')
  ) {
    return null;
  }

  return normalized ? sanitized : null;
}

function earlierDate(left, right) {
  return left <= right ? left : right;
}

function laterDate(left, right) {
  return left >= right ? left : right;
}

function customTitle(link) {
  const title = link.title.trim();
  return title && title !== link.domain ? link.title : null;
}

function mergedMetadata(target, source) {
  const sourceIsPreferred =
    source.status === 'ORGANIZED' && target.status !== 'ORGANIZED';
  const title = sourceIsPreferred
    ? (customTitle(source) ?? customTitle(target) ?? target.domain)
    : (customTitle(target) ?? customTitle(source) ?? target.domain);
  const purpose = sourceIsPreferred
    ? (source.purpose ?? target.purpose)
    : (target.purpose ?? source.purpose);
  const categoryId = sourceIsPreferred
    ? (source.categoryId ?? target.categoryId)
    : (target.categoryId ?? source.categoryId);

  return {
    archivedAt:
      target.archivedAt === null || source.archivedAt === null
        ? null
        : laterDate(target.archivedAt, source.archivedAt),
    categoryId,
    createdAt: earlierDate(target.createdAt, source.createdAt),
    firstDiscoveredAt: earlierDate(
      target.firstDiscoveredAt,
      source.firstDiscoveredAt,
    ),
    purpose,
    status:
      target.status === 'ORGANIZED' || source.status === 'ORGANIZED'
        ? 'ORGANIZED'
        : 'PENDING',
    title,
    updatedAt: laterDate(target.updatedAt, source.updatedAt),
  };
}

async function findLink(client, domain) {
  const result = await client.query(
    'SELECT * FROM "Link" WHERE domain = $1 FOR UPDATE',
    [domain],
  );
  return result.rows[0] ?? null;
}

async function copyTags(client, sourceLinkId, targetLinkId) {
  await client.query(
    `
      INSERT INTO "LinkTag" ("linkId", "tagId", "createdAt")
      SELECT $2, "tagId", "createdAt"
      FROM "LinkTag"
      WHERE "linkId" = $1
      ON CONFLICT ("linkId", "tagId") DO NOTHING
    `,
    [sourceLinkId, targetLinkId],
  );
}

async function cloneLink(client, source, normalized) {
  const id = randomUUID();
  const title = customTitle(source) ?? normalized.domain;
  await client.query(
    `
      INSERT INTO "Link" (
        id, url, "normalizedUrl", domain, title, purpose, status,
        "categoryId", "archivedAt", "firstDiscoveredAt", "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      id,
      normalized.url,
      normalized.normalizedUrl,
      normalized.domain,
      title,
      source.purpose,
      source.status,
      source.categoryId,
      source.archivedAt,
      source.firstDiscoveredAt,
      source.createdAt,
      source.updatedAt,
    ],
  );
  await copyTags(client, source.id, id);
  return id;
}

async function mergeLink(client, source, target) {
  const metadata = mergedMetadata(target, source);
  await client.query(
    `
      UPDATE "Link"
      SET
        title = $2,
        purpose = $3,
        status = $4,
        "categoryId" = $5,
        "archivedAt" = $6,
        "firstDiscoveredAt" = $7,
        "createdAt" = $8,
        "updatedAt" = $9
      WHERE id = $1
    `,
    [
      target.id,
      metadata.title,
      metadata.purpose,
      metadata.status,
      metadata.categoryId,
      metadata.archivedAt,
      metadata.firstDiscoveredAt,
      metadata.createdAt,
      metadata.updatedAt,
    ],
  );
  await copyTags(client, source.id, target.id);
}

async function ensureTargetLink(client, source, normalized, mergedPairs) {
  const target = await findLink(client, normalized.domain);
  if (!target) {
    return {
      created: true,
      id: await cloneLink(client, source, normalized),
    };
  }

  if (target.id !== source.id) {
    const pair = `${source.id}:${target.id}`;
    if (!mergedPairs.has(pair)) {
      await mergeLink(client, source, target);
      mergedPairs.add(pair);
    }
  }

  return { created: false, id: target.id };
}

async function recomputeMainUrl(client, linkId) {
  const latest = await client.query(
    `
      SELECT source."normalizedUrl"
      FROM "LinkSource" AS source
      JOIN "TelegramMessage" AS message ON message.id = source."messageId"
      WHERE source."linkId" = $1
      ORDER BY
        message."sentAt" DESC,
        source."createdAt" DESC,
        source.id DESC
      LIMIT 1
    `,
    [linkId],
  );
  const normalizedUrl = latest.rows[0]?.normalizedUrl;
  if (normalizedUrl) {
    await client.query(
      'UPDATE "Link" SET url = $2, "normalizedUrl" = $2 WHERE id = $1',
      [linkId, normalizedUrl],
    );
  }
}

async function recomputeSyncStatistics(client) {
  await client.query(`
    WITH found_counts AS (
      SELECT
        source."syncJobId",
        message."chatId",
        COUNT(DISTINCT (source."linkId", source."messageId"))::integer AS count
      FROM "LinkSource" AS source
      JOIN "TelegramMessage" AS message ON message.id = source."messageId"
      WHERE source."syncJobId" IS NOT NULL
      GROUP BY source."syncJobId", message."chatId"
    ),
    first_sources AS (
      SELECT DISTINCT ON (source."linkId")
        source."linkId",
        source."syncJobId",
        message."chatId"
      FROM "LinkSource" AS source
      JOIN "TelegramMessage" AS message ON message.id = source."messageId"
      ORDER BY source."linkId", source."createdAt", source.id
    ),
    new_counts AS (
      SELECT "syncJobId", "chatId", COUNT(*)::integer AS count
      FROM first_sources
      WHERE "syncJobId" IS NOT NULL
      GROUP BY "syncJobId", "chatId"
    ),
    recalculated AS (
      SELECT
        chat.id,
        COALESCE(found.count, 0)::integer AS found_count,
        COALESCE(created.count, 0)::integer AS new_count
      FROM "SyncJobChat" AS chat
      LEFT JOIN found_counts AS found
        ON found."syncJobId" = chat."syncJobId"
        AND found."chatId" = chat."chatId"
      LEFT JOIN new_counts AS created
        ON created."syncJobId" = chat."syncJobId"
        AND created."chatId" = chat."chatId"
    )
    UPDATE "SyncJobChat" AS chat
    SET
      "foundCount" = recalculated.found_count,
      "newCount" = recalculated.new_count,
      "duplicateCount" = GREATEST(
        recalculated.found_count - recalculated.new_count,
        0
      )
    FROM recalculated
    WHERE chat.id = recalculated.id
  `);

  await client.query(`
    WITH totals AS (
      SELECT
        "syncJobId",
        SUM("foundCount")::integer AS found_count,
        SUM("newCount")::integer AS new_count,
        SUM("duplicateCount")::integer AS duplicate_count
      FROM "SyncJobChat"
      GROUP BY "syncJobId"
    )
    UPDATE "SyncJob" AS job
    SET
      "foundCount" = COALESCE(totals.found_count, 0),
      "newCount" = COALESCE(totals.new_count, 0),
      "duplicateCount" = COALESCE(totals.duplicate_count, 0)
    FROM totals
    WHERE job.id = totals."syncJobId"
  `);

  await client.query(`
    UPDATE "SyncJob" AS job
    SET "foundCount" = 0, "newCount" = 0, "duplicateCount" = 0
    WHERE NOT EXISTS (
      SELECT 1 FROM "SyncJobChat" AS chat WHERE chat."syncJobId" = job.id
    )
  `);
}

async function databaseCounts(client) {
  const result = await client.query(`
    SELECT
      (SELECT COUNT(*)::integer FROM "Link") AS links,
      (SELECT COUNT(*)::integer FROM "LinkSource") AS sources
  `);
  return result.rows[0];
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const connectionUrl = new URL(databaseUrl);
  const schemaName =
    connectionUrl.searchParams.get('schema')?.trim() || 'public';
  connectionUrl.searchParams.delete('schema');
  const client = new Client({ connectionString: connectionUrl.toString() });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('search_path', quote_ident($1), true)",
      [schemaName],
    );
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('repair-chinese-telegram-urls'))",
    );

    const activeJob = await client.query(`
      SELECT id
      FROM "SyncJob"
      WHERE status IN ('QUEUED', 'RUNNING')
      LIMIT 1
    `);
    if (activeJob.rowCount) {
      throw new Error('A Telegram scan is currently queued or running.');
    }

    const before = await databaseCounts(client);
    const sourceResult = await client.query(`
      SELECT
        source.id AS "sourceId",
        source."messageId",
        source."rawUrl",
        link.id,
        link.domain,
        link.title,
        link.purpose,
        link.status,
        link."categoryId",
        link."archivedAt",
        link."firstDiscoveredAt",
        link."createdAt",
        link."updatedAt"
      FROM "LinkSource" AS source
      JOIN "Link" AS link ON link.id = source."linkId"
      ORDER BY source."createdAt", source.id
    `);
    const affectedSources = sourceResult.rows.filter(({ rawUrl }) =>
      firstHanCharacter.test(rawUrl),
    );
    const affectedLinkIds = new Set(affectedSources.map((source) => source.id));
    const touchedLinkIds = new Set(affectedLinkIds);
    const mergedPairs = new Set();
    const counters = {
      createdLinks: 0,
      deletedLinks: 0,
      deletedSources: 0,
      mergedLinks: 0,
      updatedSources: 0,
    };

    for (const source of affectedSources) {
      const currentSource = await client.query(
        'SELECT id FROM "LinkSource" WHERE id = $1 FOR UPDATE',
        [source.sourceId],
      );
      if (!currentSource.rowCount) {
        continue;
      }

      const sanitizedRawUrl = sanitizeTelegramHttpUrlCandidate(source.rawUrl);
      const normalized = sanitizedRawUrl
        ? normalizeHttpUrl(sanitizedRawUrl)
        : null;
      if (!normalized) {
        await client.query('DELETE FROM "LinkSource" WHERE id = $1', [
          source.sourceId,
        ]);
        counters.deletedSources += 1;
        continue;
      }

      const mergedPairCount = mergedPairs.size;
      const target = await ensureTargetLink(
        client,
        source,
        normalized,
        mergedPairs,
      );
      counters.createdLinks += target.created ? 1 : 0;
      counters.mergedLinks += mergedPairs.size - mergedPairCount;
      touchedLinkIds.add(target.id);

      const collision = await client.query(
        `
          SELECT id, "rawUrl"
          FROM "LinkSource"
          WHERE
            "linkId" = $1
            AND "messageId" = $2
            AND "normalizedUrl" = $3
            AND id <> $4
          FOR UPDATE
        `,
        [
          target.id,
          source.messageId,
          normalized.normalizedUrl,
          source.sourceId,
        ],
      );
      if (collision.rowCount) {
        const existing = collision.rows[0];
        if (firstHanCharacter.test(existing.rawUrl)) {
          await client.query(
            'UPDATE "LinkSource" SET "rawUrl" = $2 WHERE id = $1',
            [existing.id, sanitizedRawUrl],
          );
        }
        await client.query('DELETE FROM "LinkSource" WHERE id = $1', [
          source.sourceId,
        ]);
        counters.deletedSources += 1;
      } else {
        await client.query(
          `
            UPDATE "LinkSource"
            SET "linkId" = $2, "rawUrl" = $3, "normalizedUrl" = $4
            WHERE id = $1
          `,
          [
            source.sourceId,
            target.id,
            sanitizedRawUrl,
            normalized.normalizedUrl,
          ],
        );
        counters.updatedSources += 1;
      }
    }

    for (const linkId of affectedLinkIds) {
      const deleted = await client.query(
        `
          DELETE FROM "Link" AS link
          WHERE
            link.id = $1
            AND NOT EXISTS (
              SELECT 1 FROM "LinkSource" AS source
              WHERE source."linkId" = link.id
            )
          RETURNING id
        `,
        [linkId],
      );
      counters.deletedLinks += deleted.rowCount ?? 0;
    }

    for (const linkId of touchedLinkIds) {
      await recomputeMainUrl(client, linkId);
    }
    await recomputeSyncStatistics(client);

    const after = await databaseCounts(client);
    const jobs = await client.query(`
      SELECT id, status, "foundCount", "newCount", "duplicateCount"
      FROM "SyncJob"
      ORDER BY "createdAt"
    `);
    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          affectedSources: affectedSources.length,
          after,
          before,
          changes: counters,
          jobs: jobs.rows,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await run();
