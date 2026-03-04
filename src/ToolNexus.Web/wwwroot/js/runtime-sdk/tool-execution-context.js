import {
  copyToClipboard,
  detectContentType,
  downloadFile,
  formatResult
} from './tool-utils.js';

const INPUT_ANCHOR = '[data-tool-input]';
const OUTPUT_ANCHOR = '[data-tool-output]';
const STATUS_ANCHOR = '[data-tool-status]';

function readElementValue(element) {
  if (!element) {
    return '';
  }

  if ('value' in element) {
    return element.value ?? '';
  }

  return element.textContent ?? '';
}

function writeElementValue(element, value) {
  const safeValue = value ?? '';

  if (!element) {
    return;
  }

  if ('value' in element) {
    element.value = safeValue;
    return;
  }

  element.textContent = safeValue;
}

export class ToolExecutionContext {
  constructor({ tool, root, anchors } = {}) {
    this.tool = tool ?? null;
    this.root = root ?? document;
    this.anchors = {
      input: anchors?.input ?? this.root.querySelector?.(INPUT_ANCHOR),
      output: anchors?.output ?? this.root.querySelector?.(OUTPUT_ANCHOR),
      status: anchors?.status ?? this.root.querySelector?.(STATUS_ANCHOR)
    };
  }

  getAnchor(name) {
    return this.anchors[name] ?? null;
  }

  getInput() {
    return readElementValue(this.anchors.input);
  }

  setOutput(value) {
    writeElementValue(this.anchors.output, formatResult(value).text);
  }

  setStatus(state) {
    const safeState = String(state ?? 'idle');
    const statusAnchor = this.anchors.status;

    if (!statusAnchor) {
      return;
    }

    statusAnchor.dataset.toolStatus = safeState;
    writeElementValue(statusAnchor, safeState);
  }

  copyToClipboard(text) {
    return copyToClipboard(text);
  }

  downloadFile(content, filename) {
    return downloadFile(content, filename);
  }

  detectContentType(input) {
    return detectContentType(input);
  }

  formatResult(output) {
    return formatResult(output);
  }
}

export function createExecutionContext({ tool, root, anchors } = {}) {
  return new ToolExecutionContext({ tool, root, anchors });
}
