const dom = {
  leftInput: document.getElementById('leftInput'),
  rightInput: document.getElementById('rightInput'),
  compareBtn: document.getElementById('compareBtn'),
  swapBtn: document.getElementById('swapBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyDiffBtn: document.getElementById('copyDiffBtn'),
  downloadDiffBtn: document.getElementById('downloadDiffBtn'),
  viewModeSelect: document.getElementById('viewModeSelect'),
  detailModeSelect: document.getElementById('detailModeSelect'),
  autoCompareToggle: document.getElementById('autoCompareToggle'),
  scrollSyncToggle: document.getElementById('scrollSyncToggle'),
  trimTrailingToggle: document.getElementById('trimTrailingToggle'),
  ignoreWhitespaceToggle: document.getElementById('ignoreWhitespaceToggle'),
  ignoreCaseToggle: document.getElementById('ignoreCaseToggle'),
  diffOutput: document.getElementById('diffOutput'),
  diffSummary: document.getElementById('diffSummary'),
  diffError: document.getElementById('diffError'),
  processingState: document.getElementById('processingState')
};

const MAX_RENDER_LINES = 5000;
const LARGE_INPUT_THRESHOLD = 4000;
let latestResult = '';

const Utils = {
  debounce(fn, waitMs) {
    let handle = 0;
    return (...args) => {
      window.clearTimeout(handle);
      handle = window.setTimeout(() => fn(...args), waitMs);
    };
  },
  download(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const ErrorUX = {
  show(message) {
    dom.diffError.textContent = message;
    dom.diffError.hidden = false;
  },
  clear() {
    dom.diffError.hidden = true;
    dom.diffError.textContent = '';
  }
};

function normalizeInput(text, options) {
  const originalLines = text.replace(/\r\n?/g, '\n').split('\n');
  const normalizedLines = originalLines.map((line) => {
    let value = line.replace(/\t/g, '    ');
    if (options.trimTrailing) value = value.replace(/[ \t]+$/g, '');
    if (options.ignoreWhitespace) value = value.replace(/\s+/g, ' ').trim();
    if (options.ignoreCase) value = value.toLowerCase();
    return value;
  });

  return { originalLines, normalizedLines };
}

function myersDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Array(2 * max + 1).fill(0);
  const trace = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      const index = k + offset;
      let x;
      if (k === -d || (k !== d && v[index - 1] < v[index + 1])) {
        x = v[index + 1];
      } else {
        x = v[index - 1] + 1;
      }

      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }

      v[index] = x;
      if (x >= n && y >= m) {
        return backtrack(trace, a, b, d, offset);
      }
    }
  }

  return [];
}

function backtrack(trace, a, b, d, offset) {
  let x = a.length;
  let y = b.length;
  const edits = [];

  for (let depth = d; depth >= 0; depth--) {
    const v = trace[depth];
    const k = x - y;
    const index = k + offset;
    let prevK;

    if (k === -depth || (k !== depth && v[index - 1] < v[index + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[prevK + offset];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ type: 'equal', leftIndex: x - 1, rightIndex: y - 1 });
      x -= 1;
      y -= 1;
    }

    if (depth === 0) {
      break;
    }

    if (x === prevX) {
      edits.push({ type: 'add', rightIndex: y - 1 });
      y -= 1;
    } else {
      edits.push({ type: 'remove', leftIndex: x - 1 });
      x -= 1;
    }
  }

  return edits.reverse();
}

function tokenize(line, mode) {
  if (mode === 'char') return Array.from(line);
  return line.match(/\s+|[^\s]+/g) ?? [];
}

function compareLineTokens(leftLine, rightLine, mode) {
  const leftTokens = tokenize(leftLine, mode);
  const rightTokens = tokenize(rightLine, mode);
  const edits = myersDiff(leftTokens, rightTokens);

  return {
    left: edits.filter((e) => e.type !== 'add').map((edit) => ({
      value: leftTokens[edit.leftIndex] ?? '',
      type: edit.type === 'remove' ? 'removed' : 'equal'
    })),
    right: edits.filter((e) => e.type !== 'remove').map((edit) => ({
      value: rightTokens[edit.rightIndex] ?? '',
      type: edit.type === 'add' ? 'added' : 'equal'
    }))
  };
}

function buildDiffModel(leftText, rightText, options) {
  const left = normalizeInput(leftText, options);
  const right = normalizeInput(rightText, options);
  const edits = myersDiff(left.normalizedLines, right.normalizedLines);

  const rows = [];
  let leftLine = 0;
  let rightLine = 0;

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];

    if (edit.type === 'equal') {
      rows.push({
        type: 'equal',
        leftNumber: leftLine + 1,
        rightNumber: rightLine + 1,
        leftText: left.originalLines[leftLine],
        rightText: right.originalLines[rightLine]
      });
      leftLine += 1;
      rightLine += 1;
      continue;
    }

    const removed = [];
    const added = [];

    while (i < edits.length && edits[i].type !== 'equal') {
      const current = edits[i];
      if (current.type === 'remove') {
        removed.push({ number: leftLine + 1, text: left.originalLines[leftLine] });
        leftLine += 1;
      }
      if (current.type === 'add') {
        added.push({ number: rightLine + 1, text: right.originalLines[rightLine] });
        rightLine += 1;
      }
      i += 1;
    }

    i -= 1;

    const paired = Math.max(removed.length, added.length);
    for (let idx = 0; idx < paired; idx++) {
      const leftRow = removed[idx] ?? null;
      const rightRow = added[idx] ?? null;

      if (leftRow && rightRow) {
        const tokens = options.detailMode === 'line'
          ? null
          : compareLineTokens(leftRow.text, rightRow.text, options.detailMode);

        rows.push({
          type: 'modified',
          leftNumber: leftRow.number,
          rightNumber: rightRow.number,
          leftText: leftRow.text,
          rightText: rightRow.text,
          tokenDiff: tokens
        });
      } else if (leftRow) {
        rows.push({
          type: 'remove',
          leftNumber: leftRow.number,
          rightNumber: null,
          leftText: leftRow.text,
          rightText: ''
        });
      } else {
        rows.push({
          type: 'add',
          leftNumber: null,
          rightNumber: rightRow.number,
          leftText: '',
          rightText: rightRow.text
        });
      }
    }
  }

  return rows;
}

function summarize(rows) {
  const summary = { added: 0, removed: 0, changed: 0 };
  for (const row of rows) {
    if (row.type === 'add') summary.added += 1;
    else if (row.type === 'remove') summary.removed += 1;
    else if (row.type === 'modified') summary.changed += 1;
  }
  return summary;
}

function renderTokens(target, tokenDiff, side) {
  const tokens = side === 'left' ? tokenDiff.left : tokenDiff.right;
  for (const token of tokens) {
    const span = document.createElement('span');
    span.textContent = token.value;
    if (token.type === 'removed') span.className = 'diff-token--removed';
    if (token.type === 'added') span.className = 'diff-token--added';
    target.appendChild(span);
  }
}

function createLineRow(number, text, kind, tokenDiff, side) {
  const row = document.createElement('div');
  row.className = `diff-row ${kind ? `diff-row--${kind}` : ''}`.trim();

  const lineNumber = document.createElement('div');
  lineNumber.className = 'diff-line-number';
  lineNumber.textContent = number ?? '';

  const content = document.createElement('div');
  content.className = 'diff-content';

  if (tokenDiff && kind === 'modified') {
    renderTokens(content, tokenDiff, side);
  } else {
    content.textContent = text;
  }

  row.append(lineNumber, content);
  return row;
}

function renderSideBySide(rows) {
  const root = document.createElement('div');
  root.className = 'diff-sbs';

  const leftPane = document.createElement('div');
  leftPane.className = 'diff-pane';
  const rightPane = document.createElement('div');
  rightPane.className = 'diff-pane';

  for (const row of rows) {
    const leftKind = row.type === 'add' ? '' : row.type;
    const rightKind = row.type === 'remove' ? '' : row.type;

    leftPane.appendChild(createLineRow(row.leftNumber, row.leftText, leftKind, row.tokenDiff, 'left'));
    rightPane.appendChild(createLineRow(row.rightNumber, row.rightText, rightKind, row.tokenDiff, 'right'));
  }

  root.append(leftPane, rightPane);
  setupScrollSync(leftPane, rightPane);
  return root;
}

function renderInline(rows) {
  const root = document.createElement('div');
  for (const row of rows) {
    if (row.type === 'modified') {
      root.appendChild(createLineRow(row.leftNumber, `- ${row.leftText}`, 'removed', row.tokenDiff, 'left'));
      root.appendChild(createLineRow(row.rightNumber, `+ ${row.rightText}`, 'added', row.tokenDiff, 'right'));
    } else {
      const prefix = row.type === 'add' ? '+ ' : row.type === 'remove' ? '- ' : '  ';
      const type = row.type === 'equal' ? '' : row.type;
      root.appendChild(createLineRow(row.rightNumber ?? row.leftNumber, `${prefix}${row.rightText || row.leftText}`, type));
    }
  }
  return root;
}

function setupScrollSync(leftPane, rightPane) {
  let syncing = false;
  const sync = (source, target) => {
    if (!dom.scrollSyncToggle.checked || syncing) return;
    syncing = true;
    target.scrollTop = source.scrollTop;
    syncing = false;
  };

  leftPane.addEventListener('scroll', () => sync(leftPane, rightPane));
  rightPane.addEventListener('scroll', () => sync(rightPane, leftPane));
}

async function runCompare() {
  try {
    ErrorUX.clear();
    dom.processingState.hidden = false;

    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const options = {
      trimTrailing: dom.trimTrailingToggle.checked,
      ignoreWhitespace: dom.ignoreWhitespaceToggle.checked,
      ignoreCase: dom.ignoreCaseToggle.checked,
      detailMode: dom.detailModeSelect.value
    };

    const leftText = dom.leftInput.value;
    const rightText = dom.rightInput.value;
    const estimatedLines = leftText.split('\n').length + rightText.split('\n').length;

    const rows = buildDiffModel(leftText, rightText, options);
    const summary = summarize(rows);
    dom.diffSummary.textContent = `Added: ${summary.added} · Removed: ${summary.removed} · Changed: ${summary.changed}`;

    const viewRows = rows.length > MAX_RENDER_LINES ? rows.slice(0, MAX_RENDER_LINES) : rows;
    dom.diffOutput.replaceChildren(dom.viewModeSelect.value === 'inline' ? renderInline(viewRows) : renderSideBySide(viewRows));

    if (rows.length > MAX_RENDER_LINES) {
      const notice = document.createElement('p');
      notice.textContent = `Showing first ${MAX_RENDER_LINES.toLocaleString()} rows for rendering performance.`;
      dom.diffOutput.prepend(notice);
    }

    if (estimatedLines > LARGE_INPUT_THRESHOLD) {
      const perfNote = document.createElement('p');
      perfNote.textContent = 'Large input detected: rendering optimized output.';
      dom.diffOutput.prepend(perfNote);
    }

    latestResult = rows.map((row) => {
      if (row.type === 'equal') return `  ${row.leftText}`;
      if (row.type === 'remove') return `- ${row.leftText}`;
      if (row.type === 'add') return `+ ${row.rightText}`;
      return `~ ${row.leftText}\n~ ${row.rightText}`;
    }).join('\n');
  } catch {
    ErrorUX.show('Diff comparison failed. Please verify your input and options, then try again.');
  } finally {
    dom.processingState.hidden = true;
  }
}

const autoCompare = Utils.debounce(() => {
  if (dom.autoCompareToggle.checked) {
    runCompare();
  }
}, 250);

function bindEvents() {
  dom.compareBtn.addEventListener('click', runCompare);
  dom.swapBtn.addEventListener('click', () => {
    const currentLeft = dom.leftInput.value;
    dom.leftInput.value = dom.rightInput.value;
    dom.rightInput.value = currentLeft;
    autoCompare();
  });

  dom.clearBtn.addEventListener('click', () => {
    dom.leftInput.value = '';
    dom.rightInput.value = '';
    dom.diffOutput.replaceChildren();
    dom.diffSummary.textContent = 'Added: 0 · Removed: 0 · Changed: 0';
  });

  dom.copyDiffBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(latestResult || '');
  });

  dom.downloadDiffBtn.addEventListener('click', () => {
    Utils.download('text-diff.patch.txt', latestResult || '');
  });

  dom.viewModeSelect.addEventListener('change', runCompare);
  dom.detailModeSelect.addEventListener('change', runCompare);

  [
    dom.leftInput,
    dom.rightInput,
    dom.trimTrailingToggle,
    dom.ignoreWhitespaceToggle,
    dom.ignoreCaseToggle,
    dom.autoCompareToggle
  ].forEach((el) => {
    el.addEventListener('input', autoCompare);
    el.addEventListener('change', autoCompare);
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      runCompare();
    }
    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      dom.clearBtn.click();
    }
  });
}

if (dom.compareBtn) {
  bindEvents();
  runCompare();
}
