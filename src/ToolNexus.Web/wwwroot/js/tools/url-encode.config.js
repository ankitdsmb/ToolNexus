import { SPACE_ENCODING, URL_ENCODE_MODES } from './url-encode.constants.js';

export function readEncodingConfig(dom) {
  return {
    mode: dom.modeSelect?.value ?? URL_ENCODE_MODES.component,
    spaceEncoding: dom.plusSpaceToggle?.checked ? SPACE_ENCODING.plus : SPACE_ENCODING.percent20,
    autoEncode: Boolean(dom.autoEncodeToggle?.checked)
  };
}

export function resolveClientRunOptions(options = {}) {
  return {
    mode: options.mode ?? URL_ENCODE_MODES.component,
    spaceEncoding: options.spaceEncoding ?? SPACE_ENCODING.percent20
  };
}
