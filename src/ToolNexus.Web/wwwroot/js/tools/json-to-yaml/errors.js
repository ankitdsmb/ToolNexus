export class JsonYamlToolError extends Error {
  constructor(code, title, detail, location = null) {
    super(detail);
    this.name = 'JsonYamlToolError';
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.location = location;
  }
}

export function toUserFacingError(error) {
  if (error instanceof JsonYamlToolError) {
    return error;
  }

  return new JsonYamlToolError(
    'UNEXPECTED',
    'Conversion failed',
    'An unexpected issue prevented conversion. Please validate your JSON and try again.'
  );
}
