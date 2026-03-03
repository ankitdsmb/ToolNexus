import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const artifactsDir = path.join(repoRoot, 'artifacts');
const outputPath = path.join(artifactsDir, 'runtime-import-usage.json');

const candidatePaths = [
  path.join(artifactsDir, 'runtime-import-logs'),
  path.join(artifactsDir, 'runtime-import-logs.ndjson'),
  path.join(artifactsDir, 'runtime-import-logs.json'),
  path.join(artifactsDir, 'runtime-import-log.ndjson'),
  path.join(artifactsDir, 'runtime-import-log.json')
];

function collectFiles(entryPath) {
  if (!existsSync(entryPath)) {
    return [];
  }

  const metadata = statSync(entryPath);
  if (metadata.isFile()) {
    return [entryPath];
  }

  if (!metadata.isDirectory()) {
    return [];
  }

  const discovered = [];
  const stack = [entryPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.endsWith('.json') || entry.name.endsWith('.ndjson') || entry.name.endsWith('.log')) {
        discovered.push(fullPath);
      }
    }
  }

  return discovered;
}

function ingestRecord(record, counts) {
  if (!record || typeof record !== 'object') {
    return;
  }

  const modulePath = typeof record.modulePath === 'string' ? record.modulePath.trim() : '';
  if (!modulePath) {
    return;
  }

  counts.set(modulePath, (counts.get(modulePath) ?? 0) + 1);
}

function ingestJsonContent(content, counts) {
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      ingestRecord(entry, counts);
    }
    return;
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.logs)) {
      for (const entry of parsed.logs) {
        ingestRecord(entry, counts);
      }
      return;
    }

    ingestRecord(parsed, counts);
  }
}

function ingestNdjsonContent(content, counts) {
  const lines = content.split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    ingestRecord(JSON.parse(trimmed), counts);
  }
}

const files = [...new Set(candidatePaths.flatMap(collectFiles))].sort((a, b) => a.localeCompare(b));
const counts = new Map();

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');

  if (filePath.endsWith('.ndjson') || filePath.endsWith('.log')) {
    ingestNdjsonContent(content, counts);
    continue;
  }

  ingestJsonContent(content, counts);
}

const usage = Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));

mkdirSync(artifactsDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(usage, null, 2)}\n`, 'utf8');

console.log(`Processed ${files.length} runtime import log file(s).`);
console.log(`Wrote runtime import usage artifact: ${path.relative(repoRoot, outputPath)}`);
