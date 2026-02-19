export function queryTextDiffDom(root) {
  return {
    root,
    leftInput: root.querySelector('#leftInput'),
    rightInput: root.querySelector('#rightInput'),
    compareBtn: root.querySelector('#compareBtn'),
    swapBtn: root.querySelector('#swapBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyDiffBtn: root.querySelector('#copyDiffBtn'),
    downloadDiffBtn: root.querySelector('#downloadDiffBtn'),
    viewModeSelect: root.querySelector('#viewModeSelect'),
    detailModeSelect: root.querySelector('#detailModeSelect'),
    autoCompareToggle: root.querySelector('#autoCompareToggle'),
    scrollSyncToggle: root.querySelector('#scrollSyncToggle'),
    trimTrailingToggle: root.querySelector('#trimTrailingToggle'),
    ignoreWhitespaceToggle: root.querySelector('#ignoreWhitespaceToggle'),
    ignoreCaseToggle: root.querySelector('#ignoreCaseToggle'),
    diffOutput: root.querySelector('#diffOutput'),
    diffSummary: root.querySelector('#diffSummary'),
    diffError: root.querySelector('#diffError'),
    processingState: root.querySelector('#processingState')
  };
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

function setupScrollSync(leftPane, rightPane, scrollSyncToggle) {
  let syncing = false;
  const leftSync = () => {
    if (!scrollSyncToggle.checked || syncing) return;
    syncing = true;
    rightPane.scrollTop = leftPane.scrollTop;
    syncing = false;
  };

  const rightSync = () => {
    if (!scrollSyncToggle.checked || syncing) return;
    syncing = true;
    leftPane.scrollTop = rightPane.scrollTop;
    syncing = false;
  };

  leftPane.addEventListener('scroll', leftSync);
  rightPane.addEventListener('scroll', rightSync);

  return () => {
    leftPane.removeEventListener('scroll', leftSync);
    rightPane.removeEventListener('scroll', rightSync);
  };
}

function renderSideBySide(rows, scrollSyncToggle) {
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
  return { node: root, cleanup: setupScrollSync(leftPane, rightPane, scrollSyncToggle) };
}

export function createDiffView(rows, viewMode, scrollSyncToggle) {
  if (viewMode === 'inline') {
    return { node: renderInline(rows), cleanup: () => {} };
  }

  return renderSideBySide(rows, scrollSyncToggle);
}
