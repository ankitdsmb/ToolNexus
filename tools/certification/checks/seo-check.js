import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function queryScalar(dbPath, sql) {
  const { stdout } = await execFileAsync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
  return stdout.trim();
}

export async function runSeoCheck(context) {
  const issues = [];

  const toolContentId = await queryScalar(
    context.dbPath,
    `SELECT Id FROM ToolContents WHERE lower(Slug)=lower('${String(context.slug).replace(/'/g, "''")}') LIMIT 1;`
  );

  if (!toolContentId) {
    return {
      passed: false,
      status: 'incomplete',
      issues: ['Missing overview content in ToolContents.']
    };
  }

  const checks = [
    { name: 'features', table: 'ToolFeatures' },
    { name: 'examples', table: 'ToolExamples' },
    { name: 'faq', table: 'ToolFaqs' },
    { name: 'usecases', table: 'ToolUseCases' }
  ];

  for (const check of checks) {
    const count = Number(await queryScalar(context.dbPath, `SELECT COUNT(1) FROM ${check.table} WHERE ToolContentId=${toolContentId};`));
    if (!Number.isFinite(count) || count < 1) {
      issues.push(`Missing ${check.name} content in ${check.table}.`);
    }
  }

  return {
    passed: issues.length === 0,
    status: issues.length === 0 ? 'complete' : 'incomplete',
    issues
  };
}
