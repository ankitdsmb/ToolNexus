export class UuidToolError extends Error {
  constructor(title, message) {
    super(message);
    this.name = 'UuidToolError';
    this.title = title;
  }
}

export function toUserError(error) {
  if (error instanceof UuidToolError) {
    return error;
  }

  return new UuidToolError(
    'UUID Generation Failed',
    'Unable to generate UUIDs right now. Verify browser crypto support and retry.'
  );
}
