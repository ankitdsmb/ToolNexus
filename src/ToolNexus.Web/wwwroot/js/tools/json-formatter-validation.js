export function computeByteSize(value) {
  return new TextEncoder().encode(value).length;
}

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function parseJsonErrorLocation(text, message) {
  const positionMatch = String(message).match(/position\s(\d+)/i);

  if (!positionMatch) {
    return null;
  }

  const offset = Number.parseInt(positionMatch[1], 10);

  if (Number.isNaN(offset) || offset < 0) {
    return null;
  }

  let line = 1;
  let column = 1;

  for (let index = 0; index < offset && index < text.length; index += 1) {
    if (text[index] === '\n') {
      line += 1;
      column = 1;
      continue;
    }

    column += 1;
  }

  return { line, column, offset };
}

export function toUserFacingValidationError(text, error) {
  const fallbackTitle = 'Invalid JSON';
  const fallbackMessage = 'The input could not be parsed. Check commas, quotes, and trailing characters.';
  const location = parseJsonErrorLocation(text, error?.message ?? '');

  return {
    title: fallbackTitle,
    message: error?.message ? `Parser message: ${error.message}` : fallbackMessage,
    location
  };
}

export async function parseJsonWithTimeout(rawValue, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Parsing timed out for this payload.')), timeoutMs);

    try {
      const parsed = JSON.parse(rawValue);
      clearTimeout(timeout);
      resolve(parsed);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}
