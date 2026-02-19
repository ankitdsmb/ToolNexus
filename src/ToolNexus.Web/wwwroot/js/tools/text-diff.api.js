export const MAX_RENDER_LINES = 5000;
export const LARGE_INPUT_THRESHOLD = 4000;

export function normalizeInput(text, options) {
  const originalLines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const normalizedLines = originalLines.map((line) => {
    let value = line.replace(/\t/g, '    ');
    if (options.trimTrailing) value = value.replace(/[ \t]+$/g, '');
    if (options.ignoreWhitespace) value = value.replace(/\s+/g, ' ').trim();
    if (options.ignoreCase) value = value.toLowerCase();
    return value;
  });

  return { originalLines, normalizedLines };
}

export function myersDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Array(2 * max + 1).fill(0);
  const trace = [];

  for (let d = 0; d <= max; d += 1) {
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

  for (let depth = d; depth >= 0; depth -= 1) {
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

    if (depth === 0) break;

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

export function buildDiffModel(leftText, rightText, options) {
  const left = normalizeInput(leftText, options);
  const right = normalizeInput(rightText, options);
  const edits = myersDiff(left.normalizedLines, right.normalizedLines);

  const rows = [];
  let leftLine = 0;
  let rightLine = 0;

  for (let i = 0; i < edits.length; i += 1) {
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
    for (let idx = 0; idx < paired; idx += 1) {
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

export function summarize(rows) {
  const summary = { added: 0, removed: 0, changed: 0 };
  for (const row of rows) {
    if (row.type === 'add') summary.added += 1;
    else if (row.type === 'remove') summary.removed += 1;
    else if (row.type === 'modified') summary.changed += 1;
  }
  return summary;
}

export function serializeResult(rows) {
  return rows.map((row) => {
    if (row.type === 'equal') return `  ${row.leftText}`;
    if (row.type === 'remove') return `- ${row.leftText}`;
    if (row.type === 'add') return `+ ${row.rightText}`;
    return `~ ${row.leftText}\n~ ${row.rightText}`;
  }).join('\n');
}
