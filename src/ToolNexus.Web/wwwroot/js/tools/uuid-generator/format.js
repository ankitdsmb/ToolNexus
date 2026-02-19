export function formatUuid(uuid, options) {
  let formatted = uuid;

  if (options.removeHyphens) {
    formatted = formatted.replaceAll('-', '');
  }

  if (options.caseMode === 'upper') {
    formatted = formatted.toUpperCase();
  } else {
    formatted = formatted.toLowerCase();
  }

  if (options.wrapper === 'braces') {
    formatted = `{${formatted}}`;
  } else if (options.wrapper === 'urn') {
    formatted = `urn:uuid:${formatted}`;
  }

  if (options.customTemplate?.trim()) {
    formatted = options.customTemplate.replaceAll('{uuid}', formatted);
  }

  return formatted;
}
