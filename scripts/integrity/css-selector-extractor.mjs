export function extractClassSelectorsFromCss(cssText) {
  const sanitized = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set();

  let prelude = '';
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];

    if (inString) {
      prelude += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      prelude += char;
      continue;
    }

    if (char === '{') {
      const header = prelude.trim();
      if (header && !header.startsWith('@')) {
        collectClassesFromSelectorHeader(header, classes);
      }
      prelude = '';
      continue;
    }

    if (char === '}') {
      prelude = '';
      continue;
    }

    prelude += char;
  }

  return classes;
}

export function extractSelectorDeclarationsFromCss(cssText) {
  const sanitized = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = [];
  const contextStack = [];

  let prelude = '';
  let currentDeclaration = '';
  let currentRuleSelectors = null;
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];

    if (inString) {
      if (currentRuleSelectors) currentDeclaration += char;
      else prelude += char;

      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      if (currentRuleSelectors) currentDeclaration += char;
      else prelude += char;
      continue;
    }

    if (char === '{') {
      const header = prelude.trim();
      prelude = '';

      if (!header) {
        contextStack.push({ type: 'unknown' });
        continue;
      }

      if (header.startsWith('@')) {
        if (header.toLowerCase().startsWith('@media')) {
          contextStack.push({ type: 'media', value: header.replace(/^@media\s*/i, '').trim() });
        } else {
          contextStack.push({ type: 'at-rule' });
        }
        continue;
      }

      currentRuleSelectors = header
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean);
      currentDeclaration = '';
      contextStack.push({ type: 'rule' });
      continue;
    }

    if (char === '}') {
      const closed = contextStack.pop();
      if (closed?.type === 'rule' && currentRuleSelectors) {
        const mediaContext = contextStack
          .filter((entry) => entry.type === 'media' && entry.value)
          .map((entry) => entry.value)
          .join(' and ');

        for (const selector of currentRuleSelectors) {
          declarations.push({
            selector,
            declarationBlock: currentDeclaration,
            mediaContext
          });
        }
        currentRuleSelectors = null;
        currentDeclaration = '';
      }
      prelude = '';
      continue;
    }

    if (currentRuleSelectors) currentDeclaration += char;
    else prelude += char;
  }

  return declarations;
}

function collectClassesFromSelectorHeader(header, classes) {
  const classRe = /\.(-?[_a-zA-Z][a-zA-Z0-9_-]*)/g;
  for (const match of header.matchAll(classRe)) {
    const value = match[1];
    if (!/^[-_a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) continue;
    if (/^\d+$/.test(value)) continue;
    classes.add(value);
  }
}
