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

function collectClassesFromSelectorHeader(header, classes) {
  const classRe = /\.(-?[_a-zA-Z][a-zA-Z0-9_-]*)/g;
  for (const match of header.matchAll(classRe)) {
    const value = match[1];
    if (!/^[-_a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) continue;
    if (/^\d+$/.test(value)) continue;
    classes.add(value);
  }
}
