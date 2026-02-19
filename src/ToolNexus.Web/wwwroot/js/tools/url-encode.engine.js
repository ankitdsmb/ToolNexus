import { SPACE_ENCODING, URL_ENCODE_MODES } from './url-encode.constants.js';
import { createToolError } from './url-encode.errors.js';
import { splitLines } from './url-encode.normalizer.js';

function applySpaceEncoding(value, spaceEncoding) {
  if (spaceEncoding === SPACE_ENCODING.plus) {
    return value.replace(/%20/g, '+');
  }

  return value;
}

function strictEncodeURIComponent(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeComponent(value, spaceEncoding) {
  return applySpaceEncoding(strictEncodeURIComponent(value), spaceEncoding);
}

function encodeFullUrl(value, spaceEncoding) {
  const encoded = encodeURI(value).replace(/[\[\]]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return applySpaceEncoding(encoded, spaceEncoding);
}

function encodeQueryStringValues(value, spaceEncoding) {
  const segments = value.split('&');

  return segments.map((segment) => {
    if (!segment) {
      return '';
    }

    const separatorIndex = segment.indexOf('=');
    if (separatorIndex < 0) {
      return segment;
    }

    const key = segment.slice(0, separatorIndex);
    const rawValue = segment.slice(separatorIndex + 1);
    return `${key}=${encodeComponent(rawValue, spaceEncoding)}`;
  }).join('&');
}

function encodeByMode(value, mode, spaceEncoding) {
  if (mode === URL_ENCODE_MODES.fullUrl) {
    return encodeFullUrl(value, spaceEncoding);
  }

  if (mode === URL_ENCODE_MODES.queryValues) {
    return encodeQueryStringValues(value, spaceEncoding);
  }

  return encodeComponent(value, spaceEncoding);
}

export function encodeUrlInput(value, options) {
  try {
    const lines = splitLines(value);
    return lines.map((line) => encodeByMode(line, options.mode, options.spaceEncoding)).join('\n');
  } catch (error) {
    if (error instanceof URIError) {
      throw error;
    }

    throw createToolError(
      'Encoding error',
      'Unexpected issue while URL encoding the input.',
      'Try again with a smaller input or switch encoding mode.'
    );
  }
}
