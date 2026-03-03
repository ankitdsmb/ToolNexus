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

function collectClassRuleSignatures(header, declarationBlock, mediaContext, signatures) {
  const classRe = /\.(-?[_a-zA-Z][a-zA-Z0-9_-]*)/g;
  for (const match of header.matchAll(classRe)) {
    const selector = match[1];
    if (!/^[-_a-zA-Z][a-zA-Z0-9_-]*$/.test(selector)) continue;
    if (/^\d+$/.test(selector)) continue;
    signatures.push({
      selector,
      mediaContext,
      declarationBlock
    });
  }
}

function normalizeDeclarationBlock(block) {
  const entries = splitDeclarationEntries(block)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) return null;

      const property = entry.slice(0, separatorIndex).trim().toLowerCase();
      if (!property) return null;

      const value = collapseWhitespace(entry.slice(separatorIndex + 1));
      if (!value) return null;
      return `${property}:${value}`;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return entries.join(';');
}

function normalizeMediaContext(mediaPrelude) {
  const collapsed = collapseWhitespace(mediaPrelude).toLowerCase();
  return collapsed ? `@media ${collapsed}` : 'GLOBAL';
}

function splitDeclarationEntries(block) {
  const entries = [];
  let current = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  let parenthesesDepth = 0;

  for (let i = 0; i < block.length; i += 1) {
    const char = block[i];

    if (inString) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') parenthesesDepth += 1;
    if (char === ')' && parenthesesDepth > 0) parenthesesDepth -= 1;

    if (char === ';' && parenthesesDepth === 0) {
      if (current.trim()) entries.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) entries.push(current.trim());
  return entries;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function skipWhitespace(text, index) {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

function findNext(text, start, char) {
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const current = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (current === '\\') {
        escaped = true;
      } else if (current === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (current === '"' || current === "'") {
      inString = true;
      quote = current;
      continue;
    }

    if (current === char) return i;
  }
  return -1;
}

function findMatchingBrace(text, openingBraceIndex) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = openingBraceIndex; i < text.length; i += 1) {
    const current = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (current === '\\') {
        escaped = true;
      } else if (current === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (current === '"' || current === "'") {
      inString = true;
      quote = current;
      continue;
    }

    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findAtRuleEnd(text, startIndex) {
  const blockStart = findNext(text, startIndex, '{');
  const statementEnd = findNext(text, startIndex, ';');

  if (blockStart === -1 && statementEnd === -1) return -1;
  if (blockStart === -1) return statementEnd + 1;
  if (statementEnd !== -1 && statementEnd < blockStart) return statementEnd + 1;

  const blockEnd = findMatchingBrace(text, blockStart);
  return blockEnd === -1 ? -1 : blockEnd + 1;
}
