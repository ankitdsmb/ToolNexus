import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

const repoRoot = process.cwd();
const reportPath = join(repoRoot, 'artifacts', 'config-report.json');

const REQUIRED_PRODUCTION_KEYS = [
  'Database.ConnectionString',
  'Security.Headers.EnableContentSecurityPolicy',
  'Security.Headers.XFrameOptions',
  'Security.Headers.XContentTypeOptions',
  'Security.Jwt.SigningKey'
];

const SECURITY_HEADER_FLAGS = [
  { path: 'Security.Headers.EnableContentSecurityPolicy', validate: (value) => value === true, error: 'must be true in production' },
  { path: 'Security.Headers.XFrameOptions', validate: (value) => typeof value === 'string' && value.trim().toUpperCase() === 'DENY', error: 'must be set to DENY in production' },
  { path: 'Security.Headers.XContentTypeOptions', validate: (value) => typeof value === 'string' && value.trim().toLowerCase() === 'nosniff', error: 'must be set to nosniff in production' },
  { path: 'Security.Headers.ReferrerPolicy', validate: (value) => typeof value === 'string' && value.trim().length > 0, error: 'must be configured in production' }
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['bin', 'obj', 'node_modules', '.git'].includes(entry.name)) continue;
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  if (!isObject(obj)) return keys;

  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    keys.add(key);
    if (isObject(v)) {
      for (const nested of flattenKeys(v, key)) keys.add(nested);
    }
  }

  return keys;
}

function getPathValue(obj, path) {
  return path.split('.').reduce((current, segment) => (current && segment in current ? current[segment] : undefined), obj);
}

function isProductionFile(filePath) {
  return /appsettings\.json$/i.test(filePath);
}

function isDevelopmentFile(filePath) {
  return /(Development|Docker|QA|Logging)\.json$/i.test(filePath);
}

function detectDefaultCredential(connectionString = '') {
  const lowered = connectionString.toLowerCase();
  const hitTokens = ['username=toolnexus', 'password=toolnexus_dev', 'host=localhost', 'ssl mode=disable'];
  return hitTokens.filter((token) => lowered.includes(token));
}

function parseConfigSafely(raw, filePath, errors) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    errors.push({ ruleId: 'CONFIG_JSON_PARSE_ERROR', severity: 'high', file: filePath, message: `Invalid JSON: ${error.message}` });
    return null;
  }
}

const srcFiles = await walk(join(repoRoot, 'src'));
const configPaths = srcFiles.filter((file) => /appsettings.*\.json$/i.test(file)).sort();

const findings = [];
const drift = [];
const files = [];
let baseline = null;

for (const filePath of configPaths) {
  const relativePath = relative(repoRoot, filePath);
  const raw = await readFile(filePath, 'utf8');
  const parseErrors = [];
  const config = parseConfigSafely(raw, relativePath, parseErrors);

  findings.push(...parseErrors);
  if (!config) continue;

  const flatKeys = flattenKeys(config);
  files.push({ file: relativePath, profile: isProductionFile(relativePath) ? 'production' : isDevelopmentFile(relativePath) ? 'non-production' : 'environment', keyCount: flatKeys.size });

  if (relativePath.endsWith('appsettings.json')) {
    baseline = { file: relativePath, keys: flatKeys };

    const connectionString = getPathValue(config, 'Database.ConnectionString');
    const credentialHits = detectDefaultCredential(connectionString);
    if (credentialHits.length > 0) {
      findings.push({
        ruleId: 'DEFAULT_DB_CREDENTIALS',
        severity: 'critical',
        file: relativePath,
        message: 'Default or development database credentials detected in production configuration.',
        evidence: credentialHits
      });
    }

    for (const key of REQUIRED_PRODUCTION_KEYS) {
      const value = getPathValue(config, key);
      if (value === undefined || value === null || value === '') {
        findings.push({
          ruleId: 'MISSING_REQUIRED_PROD_KEY',
          severity: 'high',
          file: relativePath,
          key,
          message: `Missing required production configuration key: ${key}`
        });
      }
    }

    for (const flag of SECURITY_HEADER_FLAGS) {
      const value = getPathValue(config, flag.path);
      if (!flag.validate(value)) {
        findings.push({ ruleId: 'SECURITY_HEADER_MISCONFIGURED', severity: 'critical', file: relativePath, key: flag.path, message: `Security header flag ${flag.path} ${flag.error}.`, actual: value });
      }
    }

    const cookieSecurePolicy = getPathValue(config, 'Authentication.Cookie.SecurePolicy') ?? getPathValue(config, 'Security.Cookie.CookieSecurePolicy') ?? getPathValue(config, 'CookieSecurePolicy');
    if (!cookieSecurePolicy || String(cookieSecurePolicy).toLowerCase() !== 'always') {
      findings.push({ ruleId: 'COOKIE_SECURE_POLICY_INVALID', severity: 'high', file: relativePath, key: 'CookieSecurePolicy', message: 'CookieSecurePolicy must default to Always in production configuration.', actual: cookieSecurePolicy ?? null });
    }

    const unsafeDevFlags = [
      { path: 'Database.RunMigrationOnStartup', expected: false },
      { path: 'Database.RunSeedOnStartup', expected: false },
      { path: 'StartupDiagnostics.Enabled', expected: false },
      { path: 'Security.Headers.EnableCspReportOnlyInDevelopment', expected: false }
    ];

    for (const flag of unsafeDevFlags) {
      const value = getPathValue(config, flag.path);
      if (value !== undefined && value !== flag.expected) {
        findings.push({ ruleId: 'UNSAFE_DEVELOPMENT_FLAG', severity: 'high', file: relativePath, key: flag.path, message: `${flag.path} should be ${flag.expected} in production configuration.`, actual: value });
      }
    }
  }
}

if (baseline) {
  for (const filePath of configPaths) {
    const relativePath = relative(repoRoot, filePath);
    if (relativePath === baseline.file) continue;
    const config = JSON.parse(await readFile(filePath, 'utf8'));
    const envKeys = flattenKeys(config);
    const missingComparedToBaseline = [...baseline.keys].filter((k) => !envKeys.has(k));
    const extraComparedToBaseline = [...envKeys].filter((k) => !baseline.keys.has(k));
    if (missingComparedToBaseline.length > 0 || extraComparedToBaseline.length > 0) {
      drift.push({ file: relativePath, missingComparedToBaseline, extraComparedToBaseline });
    }
  }
}

const mutationValueRaw = process.env.RUNTIME_MUTATION_ALLOWED;
const mutationValue = mutationValueRaw === undefined ? false : ['1', 'true', 'yes', 'on'].includes(mutationValueRaw.toLowerCase());
if (mutationValue) {
  findings.push({ ruleId: 'RUNTIME_MUTATION_ALLOWED', severity: 'critical', file: 'environment', key: 'RUNTIME_MUTATION_ALLOWED', message: 'RUNTIME_MUTATION_ALLOWED must default to false for production safety.', actual: mutationValueRaw });
}

const failRuleIds = new Set(['DEFAULT_DB_CREDENTIALS', 'RUNTIME_MUTATION_ALLOWED', 'SECURITY_HEADER_MISCONFIGURED']);
const failedChecks = findings.filter((f) => failRuleIds.has(f.ruleId));

const report = {
  generatedAt: new Date().toISOString(),
  summary: { scannedFiles: files.length, findings: findings.length, blockingFindings: failedChecks.length, driftedEnvironments: drift.length },
  validations: {
    cookieSecurePolicyProduction: findings.some((f) => f.ruleId === 'COOKIE_SECURE_POLICY_INVALID') ? 'fail' : 'pass',
    runtimeMutationAllowedDefault: mutationValue ? 'fail' : 'pass',
    securityHeaderFlagsProduction: findings.some((f) => f.ruleId === 'SECURITY_HEADER_MISCONFIGURED') ? 'fail' : 'pass'
  },
  files,
  findings,
  drift
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failedChecks.length > 0) {
  console.error(`Config integrity failed with ${failedChecks.length} blocking finding(s). Report: ${relative(repoRoot, reportPath)}`);
  process.exit(1);
}

console.log(`Config integrity passed. Report: ${relative(repoRoot, reportPath)}`);
