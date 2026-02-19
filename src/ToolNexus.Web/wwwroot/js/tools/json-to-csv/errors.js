export class ToolError extends Error {
  constructor(code, title, message, suggestion, details = {}) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.title = title;
    this.suggestion = suggestion;
    this.details = details;
  }
}

export function toUserError(error) {
  if (error instanceof ToolError) {
    return error;
  }

  return new ToolError(
    'UNEXPECTED_ERROR',
    'Unexpected error',
    'Something went wrong while processing your data.',
    'Please review your input and try again.',
    { originalMessage: error?.message }
  );
}
