import { readFile } from 'node:fs/promises';

const REQUIRED_EXPORTS = ['create', 'init', 'destroy'];

function hasNamedExport(source, name) {
  const fnExport = new RegExp(`export\\s+function\\s+${name}\\s*\\(`, 'm');
  const constExport = new RegExp(`export\\s+(?:const|let|var)\\s+${name}\\s*=`, 'm');
  const listExport = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`, 'm');
  return fnExport.test(source) || constExport.test(source) || listExport.test(source);
}

export async function runAbiCheck(context) {
  const issues = [];
  const source = await readFile(context.modulePath, 'utf8');

  for (const exportName of REQUIRED_EXPORTS) {
    if (!hasNamedExport(source, exportName)) {
      issues.push(`Missing required lifecycle export: ${exportName}(...)`);
    }
  }

  return {
    passed: issues.length === 0,
    status: issues.length === 0 ? 'valid' : 'invalid',
    issues
  };
}
