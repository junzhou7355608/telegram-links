import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OPENAPI_URL = 'http://127.0.0.1:3000/docs-json';
const ADMIN_PATH_PREFIX = '/api/admin/v1';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outputPath = resolve(projectRoot, 'openapi.json');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  const sourceUrl = process.argv[2] ?? DEFAULT_OPENAPI_URL;
  const response = await fetch(sourceUrl, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `OpenAPI request failed with ${String(response.status)} ${response.statusText}.`,
    );
  }

  const document: unknown = await response.json();

  if (!isRecord(document) || !isRecord(document.paths)) {
    throw new Error('Swagger response does not contain a valid paths object.');
  }

  const adminPaths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) =>
      path.startsWith(ADMIN_PATH_PREFIX),
    ),
  );

  if (Object.keys(adminPaths).length === 0) {
    throw new Error(
      `Swagger response does not contain any ${ADMIN_PATH_PREFIX} paths.`,
    );
  }

  const info = isRecord(document.info) ? document.info : {};
  const adminDocument = {
    ...document,
    info: {
      ...info,
      title: 'Telegram Links Admin API',
    },
    paths: adminPaths,
  };

  await writeFile(outputPath, `${JSON.stringify(adminDocument, null, 2)}\n`);
  console.log(
    `Saved ${String(Object.keys(adminPaths).length)} Admin paths to ${outputPath}.`,
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
}
