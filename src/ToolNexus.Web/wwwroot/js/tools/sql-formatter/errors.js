export class SqlFormatterError extends Error {
  constructor(title, message, location = null) {
    super(message);
    this.name = 'SqlFormatterError';
    this.title = title;
    this.location = location;
  }
}

export function buildFriendlyError(error) {
  if (error instanceof SqlFormatterError) {
    return error;
  }

  return new SqlFormatterError(
    'Formatting failed',
    'Unable to format this SQL statement. Review the syntax near the highlighted area and try again.'
  );
}
