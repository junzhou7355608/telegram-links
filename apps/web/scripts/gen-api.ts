import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');

function run(command: string, args: string[], label: string): void {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${String(result.status ?? 1)}.`,
    );
  }
}

try {
  run('pnpm', ['exec', 'openapi-ts', '--no-log-file'], 'Generate API client');
  run(
    'pnpm',
    ['exec', 'prettier', '--write', 'src/api/**/*.ts'],
    'Format generated API client',
  );
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
}
