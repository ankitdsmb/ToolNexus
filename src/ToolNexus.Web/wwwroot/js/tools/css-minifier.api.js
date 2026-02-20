const CSS_TOKEN = {
  quote: /["']/,
  whitespace: /\s/
};

const ERROR_TITLES = {
  empty: 'Input Required',
  processing: 'Minification Failed'
};

function createStructuredError(title, explanation, location = null) {
  return { title, explanation, location };
}

function normalizeInput(rawInput) {
  const original = typeof rawInput === 'string' ? rawInput : String(rawInput ?? '');
  const trimmed = original.trim();

  return {
    original,
    normalized: trimmed,
    isEmpty: trimmed.length === 0
  };
}

function consumeWhitespace(value, startIndex) {
  let cursor = startIndex;
  while (cursor < value.length && CSS_TOKEN.whitespace.test(value[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function isMinificationBoundary(character) {
  return character === ':' || character === ';' || character === '{' || character === '}' || character === ',' || character === '(' || character === ')';
}

export function minifyCss(css, options = { preserveImportantComments: false }) {
  const output = [];
  const length = css.length;

  let index = 0;
  let quote = '';
  let inComment = false;
  let inImportantComment = false;
  let pendingWhitespace = false;

  while (index < length) {
    const character = css[index];
    const nextCharacter = css[index + 1] ?? '';

    if (inComment) {
      if (character === '*' && nextCharacter === '/') {
        if (inImportantComment && options.preserveImportantComments) {
          output.push('*', '/');
        }
        inComment = false;
        inImportantComment = false;
        index += 2;
        continue;
      }

      if (inImportantComment && options.preserveImportantComments) {
        output.push(character);
      }

      index += 1;
      continue;
    }

    if (!quote && character === '/' && nextCharacter === '*') {
      inComment = true;
      inImportantComment = css[index + 2] === '!';

      if (inImportantComment && options.preserveImportantComments) {
        output.push('/', '*', '!');
        index += 3;
      } else {
        index += 2;
      }
      continue;
    }

    if (quote) {
      output.push(character);

      if (character === '\\' && index + 1 < length) {
        output.push(css[index + 1]);
        index += 2;
        continue;
      }

      if (character === quote) quote = '';
      index += 1;
      continue;
    }

    if (CSS_TOKEN.quote.test(character)) {
      quote = character;
      output.push(character);
      index += 1;
      continue;
    }

    if (CSS_TOKEN.whitespace.test(character)) {
      pendingWhitespace = true;
      index += 1;
      continue;
    }

    const isBoundary = character === ':' || character === ';' || character === '{' || character === '}' || character === ',' || character === '>' || character === '+' || character === '~' || character === '(' || character === ')';

    if (pendingWhitespace) {
      const previous = output[output.length - 1] ?? '';
      if (previous && !isMinificationBoundary(previous) && !isBoundary) {
        output.push(' ');
      }
      pendingWhitespace = false;
    }

    if (character === ';' && (nextCharacter === '}' || nextCharacter === '' || CSS_TOKEN.whitespace.test(nextCharacter))) {
      const lookAhead = consumeWhitespace(css, index + 1);
      if (css[lookAhead] === '}') {
        index += 1;
        continue;
      }
    }

    output.push(character);
    index += 1;
  }

  return output.join('').trim();
}

export async function runCssMinifier(action, input, options = {}) {
  const normalizedAction = (action ?? 'minify').toLowerCase();
  if (normalizedAction !== 'minify') {
    throw new Error('Unsupported action for CSS Minifier tool.');
  }

  const normalizedInput = normalizeInput(input);
  if (normalizedInput.isEmpty) {
    throw createStructuredError(ERROR_TITLES.empty, 'Paste CSS into the input panel before minifying.');
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  return minifyCss(normalizedInput.normalized, {
    preserveImportantComments: Boolean(options.preserveImportantComments)
  });
}

export function toUserErrorMessage(error) {
  if (error?.title) {
    const location = error.location ? ` (line ${error.location.line}, col ${error.location.column})` : '';
    return `${error.title}: ${error.explanation}${location}`;
  }

  return `${ERROR_TITLES.processing}: Unable to minify the provided CSS safely.`;
}
