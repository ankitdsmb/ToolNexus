export class ConversionError extends Error {
  constructor(title, message, suggestion) {
    super(message);
    this.name = 'ConversionError';
    this.title = title;
    this.suggestion = suggestion;
  }
}

export function toUiError(error, fallbackMessage) {
  if (error instanceof ConversionError) {
    return {
      title: error.title,
      message: error.message,
      suggestion: error.suggestion
    };
  }

  return {
    title: 'Conversion failed',
    message: fallbackMessage,
    suggestion: 'Validate input and selected mode, then retry.'
  };
}
