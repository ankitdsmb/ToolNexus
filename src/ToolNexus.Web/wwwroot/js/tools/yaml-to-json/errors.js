export class YamlParseError extends Error {
  constructor(message, line = null, column = null) {
    super(message);
    this.name = 'YamlParseError';
    this.line = line;
    this.column = column;
  }
}

export function toUserFacingError(error) {
  if (error instanceof YamlParseError) {
    const location = error.line && error.column
      ? `Line ${error.line}, column ${error.column}`
      : 'Unknown position';

    return {
      title: 'YAML parsing failed',
      detail: `${error.message}. ${location}.`
    };
  }

  return {
    title: 'Conversion failed',
    detail: 'Unable to convert this input safely. Review your YAML and try again.'
  };
}
