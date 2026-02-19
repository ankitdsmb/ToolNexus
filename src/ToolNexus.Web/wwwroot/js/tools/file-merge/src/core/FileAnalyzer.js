const EXTENSION_MAP = new Map([
  ['txt', 'text'], ['md', 'text'], ['log', 'text'], ['ini', 'text'], ['cfg', 'text'], ['conf', 'text'],
  ['cs', 'text'], ['js', 'text'], ['ts', 'text'], ['html', 'text'], ['css', 'text'], ['scss', 'text'], ['sql', 'text'],
  ['json', 'json'], ['csv', 'csv'], ['xml', 'xml'], ['yaml', 'yaml'], ['yml', 'yaml']
]);

const TEXT_ENCODER = new TextEncoder();

export class FileAnalyzer {
  static detectType(fileName, content) {
    const extension = this.#getExtension(fileName);
    const byExtension = EXTENSION_MAP.get(extension) ?? 'text';

    if (byExtension === 'json' && this.#isValidJson(content)) return 'json';
    if (byExtension === 'xml' && this.#isLikelyXml(content) && this.#isValidXml(content)) return 'xml';
    if (byExtension === 'csv' && this.#looksLikeCsv(content)) return 'csv';
    if (byExtension === 'yaml' && this.#looksLikeYaml(content)) return 'yaml';

    if (this.#isValidJson(content)) return 'json';
    if (this.#isLikelyXml(content) && this.#isValidXml(content)) return 'xml';
    if (this.#looksLikeCsv(content)) return 'csv';
    if (this.#looksLikeYaml(content)) return 'yaml';

    return byExtension;
  }

  static getByteSize(text) {
    return TEXT_ENCODER.encode(text).byteLength;
  }

  static #getExtension(fileName) {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts.at(-1) : '';
  }

  static #isValidJson(content) {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  static #isLikelyXml(content) {
    return /^\s*<[^>]+>/.test(content);
  }

  static #isValidXml(content) {
    try {
      const parsed = new DOMParser().parseFromString(content, 'application/xml');
      return !parsed.querySelector('parsererror');
    } catch {
      return false;
    }
  }

  static #looksLikeCsv(content) {
    const lines = content.split(/\r?\n/).filter(Boolean).slice(0, 5);
    if (lines.length < 2) return false;

    const delimiters = [',', ';', '\t', '|'];
    return delimiters.some((delimiter) => {
      const counts = lines.map((line) => line.split(delimiter).length);
      return counts.every((count) => count > 1) && new Set(counts).size <= 2;
    });
  }

  static #looksLikeYaml(content) {
    const trimmed = content.trim();
    if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
    return /(^|\n)\s*[-\w"']+\s*:\s*.+/.test(content) || /(^|\n)\s*-\s+.+/.test(content);
  }
}
