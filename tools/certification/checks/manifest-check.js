import { access } from 'node:fs/promises';

export async function runManifestCheck(context) {
  const issues = [];
  const manifest = context.manifest;
  const normalizedTarget = String(context.slug).toLowerCase();

  const duplicateCount = context.allManifests.filter(
    (entry) => String(entry.manifest?.Slug ?? '').toLowerCase() === normalizedTarget
  ).length;

  if (duplicateCount !== 1) {
    issues.push(`Slug must be unique across manifests. Found ${duplicateCount} entries for "${context.slug}".`);
  }

  if (!manifest?.ModulePath) {
    issues.push('ModulePath is missing in manifest.');
  } else {
    try {
      await access(context.modulePath);
    } catch {
      issues.push(`ModulePath does not exist: ${context.modulePath}`);
    }
  }

  if (!manifest?.TemplatePath) {
    issues.push('TemplatePath is missing in manifest.');
  } else {
    try {
      await access(context.templatePath);
    } catch {
      issues.push(`TemplatePath does not exist: ${context.templatePath}`);
    }
  }

  return {
    passed: issues.length === 0,
    status: issues.length === 0 ? 'valid' : 'invalid',
    issues
  };
}
