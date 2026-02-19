import { INDENT_CHOICES, MULTILINE_STYLE } from './constants.js';

export function buildFormattingOptions(controls) {
  const indentSize = Number.parseInt(controls.indentSelect.value, 10);

  return {
    indentUnit: ' '.repeat(INDENT_CHOICES.includes(indentSize) ? indentSize : 2),
    compact: controls.compactToggle.checked,
    quoteAllStrings: controls.quoteAllToggle.checked,
    sortKeys: controls.sortKeysToggle.checked,
    useMultilineBlock: controls.multilineToggle.checked,
    multilineStyle: controls.multilineStyle.value === MULTILINE_STYLE.folded ? MULTILINE_STYLE.folded : MULTILINE_STYLE.literal
  };
}
