export function getMarkdownToHtmlDom(root) {
  if (!root) {
    return null;
  }

  return {
    root,
    input: root.querySelector('#inputEditor'),
    output: root.querySelector('#outputEditor'),
    convertButton: root.querySelector('#convertBtn'),
    clearButton: root.querySelector('#clearBtn'),
    statusText: root.querySelector('#statusText')
  };
}
