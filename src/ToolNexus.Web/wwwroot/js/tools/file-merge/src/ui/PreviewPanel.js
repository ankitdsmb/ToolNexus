const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export class PreviewPanel {
  #output;

  constructor(outputElement) {
    this.#output = outputElement;
  }

  render(content, fileType) {
    const escaped = escapeHtml(content);
    let highlighted = escaped;

    if (fileType === 'json') {
      highlighted = escaped.replace(/("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g,
        '<span class="tok-key">$1</span><span class="tok-str">$2</span><span class="tok-num">$3</span><span class="tok-lit">$4</span>');
    }

    this.#output.innerHTML = highlighted;
  }
}
