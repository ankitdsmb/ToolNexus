export class UrlDecodeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'UrlDecodeError';
    this.details = details;
  }
}

export function toUiError(error) {
  if (error instanceof UrlDecodeError) {
    const position = typeof error.details.position === 'number' ? error.details.position + 1 : null;
    const positionText = position ? ` near position ${position}` : '';

    return {
      title: 'Invalid URL encoding',
      message: `Unable to decode input${positionText}.`,
      guidance: error.details.strictMode
        ? 'Disable strict mode to keep malformed sequences as-is, or fix the encoded text.'
        : 'Malformed sections were preserved as plain text in tolerant mode.'
    };
  }

  return {
    title: 'Decoding failed',
    message: 'Unexpected error while decoding the input.',
    guidance: 'Review the input and try again.'
  };
}
