import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAbiCheck } from './checks/abi-check.js';
import { runDomContractCheck } from './checks/dom-contract-check.js';
import { runDependencyCheck } from './checks/dependency-check.js';
import { runManifestCheck } from './checks/manifest-check.js';
import { runSeoCheck } from './checks/seo-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFESTS_DIR = path.join(REPO_ROOT, 'src', 'ToolNexus.Web', 'App_Data', 'tool-manifests');
const WEBROOT_DIR = path.join(REPO_ROOT, 'src', 'ToolNexus.Web', 'wwwroot');
const DB_PATH = path.join(REPO_ROOT, 'src', 'ToolNexus.Web', 'toolnexus.db');
const CERTIFICATES_DIR = path.join(REPO_ROOT, 'tool-certificates');

const REMOTE_DEPENDENCY_ALLOWLIST = [];

async function loadManifestBySlug(slug) {
  const manifestFiles = (await readdir(MANIFESTS_DIR)).filter((entry) => entry.endsWith('.json'));
  const manifests = [];

  for (const fileName of manifestFiles) {
    const fullPath = path.join(MANIFESTS_DIR, fileName);
    const text = await readFile(fullPath, 'utf8');
    const manifest = JSON.parse(text);
    manifests.push({ manifest, fileName, fullPath });
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const match = manifests.find((item) => String(item.manifest?.Slug ?? '').toLowerCase() === normalizedSlug);

  if (!match) {
    throw new Error(`No manifest found for slug "${slug}" in ${MANIFESTS_DIR}`);
  }

  return {
    target: match,
    all: manifests
  };
}

export async function certifyTool(slug) {
  if (!slug || !slug.trim()) {
    throw new Error('A tool slug is required. Usage: node tools/certification/certify-tool.js <slug>');
  }

  const { target, all } = await loadManifestBySlug(slug);
  const modulePath = path.join(WEBROOT_DIR, String(target.manifest.ModulePath || '').replace(/^\//, ''));
  const templatePath = path.join(WEBROOT_DIR, String(target.manifest.TemplatePath || '').replace(/^\//, ''));

  const context = {
    slug,
    manifest: target.manifest,
    manifestPath: target.fullPath,
    modulePath,
    templatePath,
    allManifests: all,
    dbPath: DB_PATH,
    allowlistedRemoteDependencies: REMOTE_DEPENDENCY_ALLOWLIST
  };

  const manifestCheck = await runManifestCheck(context);

  const checks = {
    manifest: manifestCheck,
    abi: manifestCheck.passed
      ? await runAbiCheck(context)
      : {
          passed: false,
          status: 'invalid',
          issues: ['Skipped ABI validation because manifest validation failed.']
        },
    domContract: manifestCheck.passed
      ? await runDomContractCheck(context)
      : {
          passed: false,
          status: 'invalid',
          issues: ['Skipped DOM contract validation because manifest validation failed.']
        },
    dependencies: manifestCheck.passed
      ? await runDependencyCheck(context)
      : {
          passed: false,
          status: 'rejected',
          issues: ['Skipped dependency validation because manifest validation failed.']
        },
    seo: await runSeoCheck(context)
  };

  const failedChecks = Object.values(checks).filter((result) => !result.passed);
  const certificate = {
    slug,
    abi: checks.abi.status,
    domContract: checks.domContract.status,
    dependencies: checks.dependencies.status,
    seo: checks.seo.status,
    certifiedAt: new Date().toISOString()
  };

  await mkdir(CERTIFICATES_DIR, { recursive: true });
  const certificatePath = path.join(CERTIFICATES_DIR, `${slug}.json`);
  await writeFile(certificatePath, JSON.stringify(certificate, null, 2));

  return {
    slug,
    passed: failedChecks.length === 0,
    checks,
    certificate,
    certificatePath
  };
}
