export function resolveRegexDom(root) {
  return {
    patternInput: root.querySelector('[data-regex-pattern]'),
    flagsInput: root.querySelector('[data-regex-flags]'),
    candidateInput: root.querySelector('[data-regex-input]'),
    output: root.querySelector('[data-regex-output]'),
    status: root.querySelector('[data-regex-status]'),
    runButton: root.querySelector('[data-regex-run]')
  };
}

export function renderRegexResult(dom, result) {
  dom.output.value = JSON.stringify(result, null, 2);

  if (!dom.status) {
    return;
  }

  dom.status.textContent = result.isMatch
    ? `Matched ${result.matchCount} occurrence${result.matchCount === 1 ? '' : 's'}.`
    : 'No matches found.';
}

export function renderRegexError(dom, message) {
  dom.output.value = '';

  if (dom.status) {
    dom.status.textContent = message;
  }
}
