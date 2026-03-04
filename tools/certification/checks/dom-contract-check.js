import { readFile } from 'node:fs/promises';

const REQUIRED_ANCHORS = [
  'data-tool-input',
  'data-tool-output',
  'data-tool-status',
  'data-tool-followup',
  'data-tool-content-host'
];

export async function runDomContractCheck(context) {
  const template = await readFile(context.templatePath, 'utf8');
  const missing = REQUIRED_ANCHORS.filter((anchor) => !template.includes(anchor));

  return {
    passed: missing.length === 0,
    status: missing.length === 0 ? 'valid' : 'invalid',
    issues: missing.map((anchor) => `Missing required DOM contract anchor: ${anchor}`)
  };
}
