const FALLBACK_ERROR = {
  title: 'Encoding failed',
  message: 'The input could not be encoded with the selected mode.',
  action: 'Verify the input text and encoding mode, then try again.'
};

export function createToolError(title, message, action) {
  return { title, message, action };
}

export function normalizeToolError(error) {
  if (error?.title && error?.message && error?.action) {
    return error;
  }

  if (error instanceof URIError) {
    return createToolError(
      'Invalid Unicode sequence',
      'The input contains an invalid surrogate pair that cannot be URL encoded.',
      'Fix the malformed Unicode characters and run encoding again.'
    );
  }

  return FALLBACK_ERROR;
}
