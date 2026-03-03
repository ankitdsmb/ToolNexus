import { spawn } from 'node:child_process';

const checks = [
  { name: 'manifest-validator', cmd: 'node', args: ['scripts/integrity/manifest-validator.mjs'] },
  { name: 'static-graph-validator', cmd: 'node', args: ['scripts/integrity/static-graph-validator.mjs'] },
  { name: 'js-governance-drift', cmd: 'node', args: ['scripts/integrity/js-governance-drift.mjs'] },
  { name: 'css-prune-simulation', cmd: 'node', args: ['scripts/integrity/css-prune-simulation.mjs'] },
  { name: 'bundle-size-regression', cmd: 'node', args: ['scripts/integrity/bundle-size-regression.mjs'] }
];

if (process.env.INTEGRITY_WITH_RUNTIME === '1') {
  checks.push({ name: 'runtime-coverage', cmd: 'node', args: ['scripts/integrity/runtime-coverage.mjs'] });
}

for (const check of checks) {
  console.log(`\n[integrity] running ${check.name}`);
  const exitCode = await new Promise((resolve) => {
    const child = spawn(check.cmd, check.args, { stdio: 'inherit', shell: false });
    child.on('close', resolve);
  });

  if (exitCode !== 0) {
    console.error(`[integrity] ${check.name} failed with exit code ${exitCode}`);
    process.exit(exitCode ?? 1);
  }
}

console.log('\n[integrity] all integrity checks passed');
