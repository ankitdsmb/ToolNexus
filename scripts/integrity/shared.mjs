import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const repoRoot = process.cwd();

export async function loadConfig() {
  const configPath = path.join(repoRoot, 'config/integrity/config.json');
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

export async function listFiles(patterns, cwd = repoRoot) {
  return fg(patterns, {
    cwd,
    onlyFiles: true,
    dot: false,
    unique: true,
    ignore: ['**/node_modules/**', '**/bin/**', '**/obj/**']
  });
}

export async function writeReport(reportPath, payload) {
  const absolute = path.join(repoRoot, reportPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

export async function fileExists(filePath) {
  try {
    await fs.access(path.join(repoRoot, filePath));
    return true;
  } catch {
    return false;
  }
}

export function toRepoPathFromWebPath(webPath) {
  return `src/ToolNexus.Web/wwwroot/${webPath.replace(/^\//, '')}`;
}
