import { UrlDecodeError } from './errors.js';
import { findDecodeFailurePosition } from './utils.js';

export function throwDecodeError(input, options) {
  throw new UrlDecodeError('Malformed encoded sequence.', {
    strictMode: options.strictMode,
    position: findDecodeFailurePosition(input)
  });
}
