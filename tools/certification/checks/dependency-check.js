import { readFile } from 'node:fs/promises';

const REMOTE_PATTERN = /^(?:https?:)?\/\//i;

function extractRemoteReferencesFromTemplate(template) {
  const refs = [];
  const scriptRegex = /<script\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = scriptRegex.exec(template)) !== null) {
    const src = match[1];
    if (REMOTE_PATTERN.test(src)) {
      refs.push(src);
    }
  }
  return refs;
}

function extractRemoteReferencesFromModule(moduleSource) {
  const refs = [];
  const importRegex = /import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(moduleSource)) !== null) {
    const importPath = match[1];
    if (REMOTE_PATTERN.test(importPath)) {
      refs.push(importPath);
    }
  }
  return refs;
}

function isAllowlisted(url, allowlist) {
  return allowlist.some((allowed) => {
    if (typeof allowed === 'string') {
      return url.startsWith(allowed);
    }

    if (allowed instanceof RegExp) {
      return allowed.test(url);
    }

    return false;
  });
}

export async function runDependencyCheck(context) {
  const manifestDependencies = Array.isArray(context.manifest?.Dependencies) ? context.manifest.Dependencies : [];
  const template = await readFile(context.templatePath, 'utf8');
  const moduleSource = await readFile(context.modulePath, 'utf8');

  const remotes = [
    ...manifestDependencies.filter((dep) => typeof dep === 'string' && REMOTE_PATTERN.test(dep)),
    ...extractRemoteReferencesFromTemplate(template),
    ...extractRemoteReferencesFromModule(moduleSource)
  ];

  const uniqueRemotes = [...new Set(remotes)];
  const blocked = uniqueRemotes.filter((url) => !isAllowlisted(url, context.allowlistedRemoteDependencies));

  return {
    passed: blocked.length === 0,
    status: blocked.length === 0 ? 'approved' : 'rejected',
    issues: blocked.map((url) => `Remote dependency is not allowlisted: ${url}`)
  };
}
