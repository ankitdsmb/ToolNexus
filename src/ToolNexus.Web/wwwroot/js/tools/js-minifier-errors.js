export class MinifierError extends Error {
  constructor(title, message, location = null) {
    super(message);
    this.name = 'MinifierError';
    this.title = title;
    this.location = location;
  }
}

export function toUserError(error) {
  if (error?.name === 'JS_Parse_Error') {
    const line = Number.isFinite(error.line) ? error.line : null;
    const col = Number.isFinite(error.col) ? error.col + 1 : null;
    const message = error.message || 'Unexpected token while parsing JavaScript.';

    return new MinifierError(
      'Syntax Error',
      line
        ? `Syntax error near line ${line}${col ? `, column ${col}` : ''}: ${message}`
        : `Syntax error: ${message}`,
      line ? { line, column: col ?? 1 } : null
    );
  }

  if (error instanceof MinifierError) return error;

  return new MinifierError('Minification Failed', 'Unable to minify this JavaScript input safely.');
}
