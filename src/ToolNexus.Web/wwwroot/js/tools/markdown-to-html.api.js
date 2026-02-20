export function normalizeAction(action) {
  return String(action ?? '').trim().toLowerCase();
}

export function normalizeInput(input) {
  return typeof input === 'string' ? input : '';
}

export async function runMarkdownToHtml(action, input) {
  const normalizedAction = normalizeAction(action);
  if (normalizedAction !== 'convert') {
    throw new Error(`Unsupported action "${action}" for markdown-to-html.`);
  }

  return normalizeInput(input);
}
