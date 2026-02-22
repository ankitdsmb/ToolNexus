import { spawn } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5081';
const healthUrl = new URL('/health', baseUrl).toString();
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
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT ?? 'Development'
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

async function waitForHealth() {
  const startedAt = Date.now();
  let lastStatus = 'no response';

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Web server exited before readiness check completed (exit code ${child.exitCode}).`);
    }

    try {
      const response = await fetch(healthUrl, { redirect: 'manual' });
      lastStatus = String(response.status);
      if (response.ok) {
        console.log(`[playwright-webserver] Health endpoint ready at ${healthUrl}`);
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for ${healthUrl}. Last observed result: ${lastStatus}. ` +
      'Ensure ToolNexus.Web exposes a /health endpoint for Playwright orchestration.'
  );
}

waitForHealth().catch((error) => {
  console.error(`[playwright-webserver] ${error.message}`);
  stopChild('SIGTERM');
  process.exit(1);
});

await new Promise((resolve) => child.on('close', resolve));
