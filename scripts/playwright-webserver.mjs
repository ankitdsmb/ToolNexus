import { spawn } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5081';
const readinessPath = process.env.PLAYWRIGHT_READINESS_PATH ?? '/';
const readinessUrl = new URL(readinessPath, baseUrl).toString();
const startupTimeoutMs = Number(process.env.PLAYWRIGHT_WEB_TIMEOUT_MS ?? 90000);
const pollIntervalMs = 1000;

const child = spawn(
  'dotnet',
  [
    'run',
    '--no-launch-profile',
    '--project',
    'src/ToolNexus.Web',
    '--urls',
    baseUrl
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT ?? 'Development',
      Database__Provider: process.env.Database__Provider ?? 'Sqlite',
      Database__ConnectionString:
        process.env.Database__ConnectionString ?? 'Data Source=toolnexus-playwright.db',
      TOOLNEXUS_DB_PROVIDER: process.env.TOOLNEXUS_DB_PROVIDER ?? 'Sqlite',
      TOOLNEXUS_DB_CONNECTION_STRING:
        process.env.TOOLNEXUS_DB_CONNECTION_STRING ?? 'Data Source=toolnexus-playwright.db'
    },
    stdio: 'inherit'
  }
);

let stopping = false;

const stopChild = (signal = 'SIGTERM') => {
  if (!stopping) {
    stopping = true;
    child.kill(signal);
  }
};

process.on('SIGINT', () => stopChild('SIGINT'));
process.on('SIGTERM', () => stopChild('SIGTERM'));

child.on('exit', (code, signal) => {
  if (!stopping && code !== 0) {
    process.exit(code ?? 1);
  }
  if (signal) {
    process.exit(0);
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReadiness() {
  const startedAt = Date.now();
  let lastStatus = 'no response';

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Web server exited before readiness check completed (exit code ${child.exitCode}).`);
    }

    try {
      const response = await fetch(readinessUrl, { redirect: 'manual' });
      lastStatus = `HTTP ${response.status}`;

      if (response.status === 200) {
        const body = await response.text();
        const hasHtml = /<html[\s>]|<!doctype html/i.test(body);

        if (hasHtml) {
          console.log(`[playwright-webserver] Readiness endpoint ready at ${readinessUrl}`);
          return;
        }

        lastStatus = 'HTTP 200 without HTML content';
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for readiness URL ${readinessUrl}. Last observed result: ${lastStatus}. ` +
      'Ensure ToolNexus.Web is serving a stable HTML page at the configured readiness path.'
  );
}

waitForReadiness().catch((error) => {
  console.error(`[playwright-webserver] ${error.message}`);
  stopChild('SIGTERM');
  process.exit(1);
});

await new Promise((resolve) => child.on('close', resolve));
