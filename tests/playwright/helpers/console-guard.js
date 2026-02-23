import { expect } from '@playwright/test';

const fallbackPattern = /(fallback recovery path|mount_fallback_content|fallback container)/i;

export function assertNoRuntimeConsoleErrors(page, { allowList = [] } = {}) {
  const errors = [];

  page.on('console', (message) => {
    const text = message.text() ?? '';
    const ignored = allowList.some((pattern) => pattern.test(text));
    if (ignored) {
      return;
    }

    if (message.type() === 'error') {
      errors.push(`console.error: ${text}`);
      return;
    }

    if (message.type() === 'warning' && fallbackPattern.test(text)) {
      errors.push(`runtime.fallback.warning: ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error?.message ?? String(error)}`);
  });

  return async function verifyNoRuntimeErrors() {
    expect(errors, errors.join('\n') || 'No runtime console errors captured.').toEqual([]);
  };
}
