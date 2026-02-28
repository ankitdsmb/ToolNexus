export function normalizeJsonToCsvAction(action, fallback = 'execute') {
  const normalized = typeof action === 'string' ? action.trim().toLowerCase() : '';
  return normalized || fallback;
}
