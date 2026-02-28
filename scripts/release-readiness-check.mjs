import { spawnSync } from 'node:child_process';

const checks = [
  ['npm', ['run', 'test:js', '--', '--runInBand']],
  ['npm', ['run', 'check:platform']],
  ['npm', ['run', 'check:design-system']],
  ['node', ['scripts/tool-ecosystem-validate.mjs']],
  ['node', ['scripts/ui-immunity-guard.mjs']],
  ['node', ['scripts/seo-a11y-guard.mjs']]
];

for (const [command, args] of checks) {
  const display = [command, ...args].join(' ');
  console.log(`\n[release-check] ${display}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`\nRelease readiness failed on: ${display}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nRelease readiness checks passed.');
